package com.smartsejong.api.domain.recommend.service;

import com.smartsejong.api.domain.course.entity.Section;
import com.smartsejong.api.domain.course.repository.SectionRepository;
import com.smartsejong.api.domain.recommend.dto.CustomBlockDto;
import com.smartsejong.api.domain.recommend.dto.RecommendationRequest;
import com.smartsejong.api.domain.recommend.dto.RecommendationResponseDto;
import com.smartsejong.api.domain.recommend.dto.RecommendationResponseDto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationServiceImpl implements RecommendationService {

    private final SectionRepository sectionRepository;

    // ── 상수 ─────────────────────────────────────────────────────────────

    private static final int SLOT_START_MIN = 8 * 60;   // 08:00 = 480분
    private static final int SLOT_UNIT = 15;
    private static final int SLOTS_PER_DAY = 56;        // (22-8)*60/15
    private static final int TOP_K = 3;
    private static final int MAX_EVAL = 10_000;
    private static final int POOL_SIZE = TOP_K * 8;
    private static final double DIVERSITY_PENALTY = 24.0;

    private static final double W_FREE_DAY = 30.0;
    private static final double W_TIME = 25.0;
    private static final double W_GAP = 20.0;
    private static final double W_LUNCH = 15.0;

    private static final int[] GAP_MINUTES = {0, 60, 120, Integer.MAX_VALUE};

    private static final Set<String> TARGET_COLLEGES = Set.of(
            staticNorm("인공지능융합대학"),
            staticNorm("소프트웨어융합대학"));
    private static final String CREATIVE_SOFT_GROUP_KEY = "creative-soft";
    private static final Map<String, String> DEPT_GROUP_KEYS = buildDeptGroupKeys();
    private static final Map<String, Integer> DAY_TO_IDX = Map.of(
            "월", 0, "화", 1, "수", 2, "목", 3, "금", 4);

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    // ── 내부 자료구조 ─────────────────────────────────────────────────────

    private record TimeInfo(int dayIdx, int startMin, int endMin, String dayKor, String startStr, String endStr) {}

    private record SecData(
            long sectionId, long courseId, String courseCode, String courseName,
            int credits, String sectionNum, String professor,
            String category, String college, String dept,
            long[] mask, List<TimeInfo> times) {
        String groupKey() {
            return courseId + "_" + sectionNum + "_" + safe(professor)
                    + "_" + safe(college) + "_" + safe(dept);
        }
        private static String safe(String s) { return s == null ? "" : s.trim(); }
    }

    private record CourseGroup(long courseId, List<SecData> sections) {}

    private record Score(double freeDay, double time, double gap, double lunch, int total) {}

    private record Candidate(List<SecData> sections, int totalCredits, Score score, List<String> reasons) {
        String courseKey() {
            return sections.stream().mapToLong(SecData::courseId).sorted()
                    .mapToObj(Long::toString).collect(Collectors.joining(","));
        }
    }

    // ── 공개 API ─────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public RecommendationResponseDto generate(RecommendationRequest req) {

        // 1. DB에서 전체 분반 로드 및 그룹핑
        List<Section> dbSections = sectionRepository.findAllWithCourse();
        Map<String, List<Section>> dbGroups = dbSections.stream()
                .collect(Collectors.groupingBy(this::dbGroupKey));
        Map<String, SecData> allData = buildSecDataMap(dbGroups);

        // 2. 고정 분반 해석
        List<SecData> fixed = resolveFixed(req.getFixedSectionIds(), dbSections, allData);

        // 3. 사용자 일정 마스크
        long[] customMask = buildCustomMask(req.getCustomBlocks());

        // 4. 초기 마스크 (고정 + 사용자 일정)
        long[] initMask = combineMasks(fixed.stream().map(SecData::mask).toArray(long[][]::new), customMask);
        int fixedCredits = fixed.stream().mapToInt(SecData::credits).sum();

        // 5. 후보 필터링
        Set<Long> excludedIds = new HashSet<>(req.getExcludedCourseIds());
        Set<Long> fixedCourseIds = fixed.stream().map(SecData::courseId).collect(Collectors.toSet());
        Set<String> fixedGroupKeys = fixed.stream().map(SecData::groupKey).collect(Collectors.toSet());

        Set<String> excludedCodes = new HashSet<>(req.getExcludedCourseCodes());

        List<SecData> candidates = allData.values().stream()
                .filter(s -> !excludedIds.contains(s.courseId()))
                .filter(s -> !excludedCodes.contains(s.courseCode()))
                .filter(s -> !fixedGroupKeys.contains(s.groupKey()))
                .filter(s -> !fixedCourseIds.contains(s.courseId()))
                .filter(s -> !conflicts(initMask, s.mask()))
                .toList();

        if (candidates.isEmpty() && fixedCredits < req.getCreditMin()) {
            return fail("고정한 분반 또는 일정 때문에 가능한 조합이 없습니다.");
        }

        // 6. 과목별 그룹 구성 (분반 수 오름차순)
        Map<Long, List<SecData>> byCourse = new LinkedHashMap<>();
        for (SecData s : candidates) byCourse.computeIfAbsent(s.courseId(), k -> new ArrayList<>()).add(s);

        List<CourseGroup> groups = byCourse.entrySet().stream()
                .sorted(Comparator.comparingInt(e -> e.getValue().size()))
                .map(e -> new CourseGroup(e.getKey(), e.getValue()))
                .collect(Collectors.toCollection(ArrayList::new));

        // 7. 전공 조건 처리
        boolean checkMajor = req.getMajorMinCount() > 0 && hasMajorCtx(req.getUserMajor());
        if (req.getMajorMinCount() > 0 && !hasMajorCtx(req.getUserMajor())) {
            return fail("전공 최소 과목 수 조건은 전공 정보가 있을 때만 사용할 수 있습니다.");
        }
        if (checkMajor) {
            groups.sort((a, b) -> {
                boolean am = a.sections().stream().anyMatch(s -> isMajor(s, req.getUserMajor()));
                boolean bm = b.sections().stream().anyMatch(s -> isMajor(s, req.getUserMajor()));
                return Boolean.compare(bm, am);
            });
        }

        int n = groups.size();
        int[] suffixCred = suffixMaxCredits(groups);
        int[] suffixMajor = checkMajor ? suffixMaxMajor(groups, req.getUserMajor()) : new int[n + 1];
        int fixedMajorCnt = checkMajor
                ? (int) fixed.stream().filter(s -> isMajor(s, req.getUserMajor())).count() : 0;

        // 8. DFS 탐색
        int[] evalCnt = {0};
        List<Candidate> pool = new ArrayList<>();
        Map<String, Integer> poolIdx = new LinkedHashMap<>();

        dfs(0, initMask.clone(), new ArrayList<>(), fixedCredits, fixedMajorCnt,
                groups, suffixCred, suffixMajor, fixed, req, evalCnt, pool, poolIdx);

        if (pool.isEmpty()) {
            return fail(diagMsg(req, candidates.size(), fixedCredits, suffixCred));
        }

        // 9. 다양성 상위 K 선택 및 응답 변환
        List<CombinationDto> combos = selectDiverse(pool).stream()
                .map(c -> toCombDto(c, fixedCredits))
                .toList();

        return RecommendationResponseDto.builder()
                .combinations(combos).diagnosisMessage(null).build();
    }

    // ── 비트마스크 유틸 ───────────────────────────────────────────────────

    private long rangeMask(int startMin, int endMin) {
        int s = Math.max(0, (startMin - SLOT_START_MIN) / SLOT_UNIT);
        int e = Math.min(SLOTS_PER_DAY, (endMin - SLOT_START_MIN) / SLOT_UNIT);
        long m = 0L;
        for (int i = s; i < e; i++) m |= (1L << i);
        return m;
    }

    private long[] buildMask(List<TimeInfo> times) {
        long[] m = new long[5];
        for (TimeInfo t : times) if (t.dayIdx() >= 0) m[t.dayIdx()] |= rangeMask(t.startMin(), t.endMin());
        return m;
    }

    private boolean conflicts(long[] a, long[] b) {
        for (int i = 0; i < 5; i++) if ((a[i] & b[i]) != 0L) return true;
        return false;
    }

    private long[] merge(long[] a, long[] b) {
        long[] r = new long[5];
        for (int i = 0; i < 5; i++) r[i] = a[i] | b[i];
        return r;
    }

    private long[] combineMasks(long[][] masks, long[] extra) {
        long[] r = extra.clone();
        for (long[] m : masks) for (int i = 0; i < 5; i++) r[i] |= m[i];
        return r;
    }

    // ── 데이터 구성 ───────────────────────────────────────────────────────

    private String dbGroupKey(Section s) {
        String col = s.getCollege() != null ? s.getCollege() : (s.getCourse().getCollege() != null ? s.getCourse().getCollege() : "");
        String dep = s.getDepartment() != null ? s.getDepartment() : (s.getCourse().getDepartment() != null ? s.getCourse().getDepartment() : "");
        return s.getCourse().getId() + "_" + safe(s.getSectionNumber())
                + "_" + safe(s.getProfessor()) + "_" + safe(col) + "_" + safe(dep);
    }

    private String safe(String s) { return s == null ? "" : s.trim(); }

    private Map<String, SecData> buildSecDataMap(Map<String, List<Section>> groups) {
        Map<String, SecData> result = new LinkedHashMap<>();
        for (Map.Entry<String, List<Section>> entry : groups.entrySet()) {
            List<Section> list = entry.getValue();
            Section rep = list.get(0);
            long minId = list.stream().mapToLong(Section::getId).min().orElse(rep.getId());

            List<TimeInfo> times = list.stream()
                    .filter(s -> s.getDayOfWeek() != null && s.getStartTime() != null && s.getEndTime() != null)
                    .map(s -> {
                        int dayIdx = s.getDayOfWeek().getIndex();
                        int startMin = s.getStartTime().getHour() * 60 + s.getStartTime().getMinute();
                        int endMin = s.getEndTime().getHour() * 60 + s.getEndTime().getMinute();
                        return new TimeInfo(dayIdx, startMin, endMin,
                                s.getDayOfWeek().getKor(),
                                s.getStartTime().format(TIME_FMT),
                                s.getEndTime().format(TIME_FMT));
                    })
                    .toList();

            String col = rep.getCollege() != null ? rep.getCollege() : safe(rep.getCourse().getCollege());
            String dep = rep.getDepartment() != null ? rep.getDepartment() : safe(rep.getCourse().getDepartment());
            String catDesc = rep.getCourse().getCategory() != null ? rep.getCourse().getCategory().getDescription() : "";

            result.put(entry.getKey(), new SecData(
                    minId,
                    rep.getCourse().getId(),
                    rep.getCourse().getCourseCode(),
                    rep.getCourse().getName(),
                    rep.getCourse().getCredits(),
                    safe(rep.getSectionNumber()),
                    safe(rep.getProfessor()),
                    catDesc, col, dep,
                    buildMask(times), times));
        }
        return result;
    }

    private List<SecData> resolveFixed(List<Long> ids, List<Section> all, Map<String, SecData> dataMap) {
        if (ids == null || ids.isEmpty()) return List.of();
        Set<Long> idSet = new HashSet<>(ids);
        Set<String> resolvedKeys = new HashSet<>();
        for (Section s : all) {
            if (idSet.contains(s.getId())) {
                resolvedKeys.add(dbGroupKey(s));
            }
        }
        return dataMap.values().stream()
                .filter(d -> resolvedKeys.contains(d.groupKey()))
                .toList();
    }

    private long[] buildCustomMask(List<CustomBlockDto> blocks) {
        long[] m = new long[5];
        if (blocks == null) return m;
        for (CustomBlockDto b : blocks) {
            Integer idx = DAY_TO_IDX.get(b.getDay());
            if (idx == null) continue;
            int s = parseMin(b.getStartTime());
            int e = parseMin(b.getEndTime());
            m[idx] |= rangeMask(s, e);
        }
        return m;
    }

    private int parseMin(String hhmm) {
        if (hhmm == null || !hhmm.contains(":")) return 0;
        String[] p = hhmm.split(":");
        return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]);
    }

    // ── 접두사 합 ─────────────────────────────────────────────────────────

    private int[] suffixMaxCredits(List<CourseGroup> groups) {
        int n = groups.size();
        int[] s = new int[n + 1];
        for (int i = n - 1; i >= 0; i--) {
            int max = groups.get(i).sections().stream().mapToInt(SecData::credits).max().orElse(0);
            s[i] = s[i + 1] + max;
        }
        return s;
    }

    private int[] suffixMaxMajor(List<CourseGroup> groups, String major) {
        int n = groups.size();
        int[] s = new int[n + 1];
        for (int i = n - 1; i >= 0; i--) {
            boolean has = groups.get(i).sections().stream().anyMatch(sec -> isMajor(sec, major));
            s[i] = s[i + 1] + (has ? 1 : 0);
        }
        return s;
    }

    // ── DFS ──────────────────────────────────────────────────────────────

    private void dfs(int idx, long[] mask, List<SecData> selected, int credits, int majorCnt,
                     List<CourseGroup> groups, int[] suffCred, int[] suffMajor,
                     List<SecData> fixed, RecommendationRequest req,
                     int[] evalCnt, List<Candidate> pool, Map<String, Integer> poolIdx) {

        if (evalCnt[0] >= MAX_EVAL) return;
        if (credits > req.getCreditMax()) return;
        if (credits + suffCred[idx] < req.getCreditMin()) return;

        int majMin = req.getMajorMinCount();
        boolean checkMajor = majMin > 0 && hasMajorCtx(req.getUserMajor());
        if (checkMajor && (majorCnt + suffMajor[idx]) < majMin) return;

        if (idx == groups.size()) {
            if (credits < req.getCreditMin()) return;
            if (checkMajor) {
                List<SecData> all = new ArrayList<>(fixed);
                all.addAll(selected);
                long actual = all.stream().filter(s -> isMajor(s, req.getUserMajor())).count();
                if (actual < majMin) return;
            }

            evalCnt[0]++;
            List<SecData> all = new ArrayList<>(fixed);
            all.addAll(selected);
            List<CustomBlockDto> blocks = req.getCustomBlocks();

            Score score = score(all, blocks, req);
            List<String> reasons = reasons(all, req, score);

            Candidate c = new Candidate(new ArrayList<>(selected), credits, score, reasons);
            insertPool(pool, poolIdx, c);
            return;
        }

        CourseGroup group = groups.get(idx);

        // 분반 선택 시도
        for (SecData sec : group.sections()) {
            if (conflicts(mask, sec.mask())) continue;
            if (credits + sec.credits() > req.getCreditMax()) continue;

            long[] next = merge(mask, sec.mask());
            selected.add(sec);
            int addedMajor = (checkMajor && isMajor(sec, req.getUserMajor())) ? 1 : 0;

            dfs(idx + 1, next, selected, credits + sec.credits(), majorCnt + addedMajor,
                    groups, suffCred, suffMajor, fixed, req, evalCnt, pool, poolIdx);

            selected.remove(selected.size() - 1);
            if (evalCnt[0] >= MAX_EVAL) return;
        }

        // 스킵
        dfs(idx + 1, mask, selected, credits, majorCnt,
                groups, suffCred, suffMajor, fixed, req, evalCnt, pool, poolIdx);
    }

    // ── 점수 계산 ─────────────────────────────────────────────────────────

    private Score score(List<SecData> all, List<CustomBlockDto> blocks, RecommendationRequest req) {
        double freeDay = scoreFreeDay(all, req);
        double time = scoreTime(all, req);
        double gap = scoreGap(all, blocks, req);
        double lunch = req.isNeedsLunchBreak() ? scoreLunch(all, blocks) : 0;

        double earned = freeDay + time + gap + lunch;
        double maxW = activeWeightSum(req);
        int total = maxW > 0 ? (int) Math.round(earned / maxW * 100) : 0;
        return new Score(freeDay, time, gap, lunch, total);
    }

    private double scoreFreeDay(List<SecData> all, RecommendationRequest req) {
        if (req.getPreferredFreeDays().isEmpty()) return 0;
        Set<String> busy = new HashSet<>();
        for (SecData s : all) for (TimeInfo t : s.times()) busy.add(t.dayKor());
        long matched = req.getPreferredFreeDays().stream().filter(d -> !busy.contains(d)).count();
        return W_FREE_DAY * ((double) matched / req.getPreferredFreeDays().size());
    }

    private double scoreTime(List<SecData> all, RecommendationRequest req) {
        String m = req.getMorningPreference(), a = req.getAfternoonPreference(), e = req.getEveningPreference();
        boolean anyActive = !m.equals("NEUTRAL") || !a.equals("NEUTRAL") || !e.equals("NEUTRAL");
        if (!anyActive) return 0;

        int totalMin = 0, morMin = 0, aftMin = 0, eveMin = 0;
        for (SecData s : all) {
            for (TimeInfo t : s.times()) {
                int dur = t.endMin() - t.startMin();
                totalMin += dur;
                morMin += overlap(t.startMin(), t.endMin(), 9 * 60, 12 * 60);
                aftMin += overlap(t.startMin(), t.endMin(), 12 * 60, 17 * 60);
                eveMin += overlap(t.startMin(), t.endMin(), 17 * 60, 21 * 60);
            }
        }
        if (totalMin == 0) return 0;

        int activeBands = 0;
        double score = 0;
        if (!m.equals("NEUTRAL")) { activeBands++; score += bandScore(m, (double) morMin / totalMin); }
        if (!a.equals("NEUTRAL")) { activeBands++; score += bandScore(a, (double) aftMin / totalMin); }
        if (!e.equals("NEUTRAL")) { activeBands++; score += bandScore(e, (double) eveMin / totalMin); }
        return activeBands > 0 ? W_TIME * score / activeBands : 0;
    }

    private double bandScore(String pref, double ratio) {
        return "PREFER".equals(pref) ? ratio : (1 - ratio);
    }

    private int overlap(int s, int e, int rs, int re) {
        return Math.max(0, Math.min(e, re) - Math.max(s, rs));
    }

    private double scoreGap(List<SecData> all, List<CustomBlockDto> blocks, RecommendationRequest req) {
        int level = req.getAllowedGapLevel();
        if (level >= 3) return W_GAP;

        int allowedMin = GAP_MINUTES[level];
        Map<Integer, List<int[]>> dayIntervals = buildDayIntervals(all, blocks);

        int total = 0, oversize = 0;
        for (List<int[]> intervals : dayIntervals.values()) {
            if (intervals.size() < 2) continue;
            intervals.sort(Comparator.comparingInt(x -> x[0]));
            List<int[]> merged = mergeIntervals(intervals);
            for (int i = 1; i < merged.size(); i++) {
                int gap = merged.get(i)[0] - merged.get(i - 1)[1];
                total++;
                if (gap > allowedMin) oversize++;
            }
        }
        return total == 0 ? W_GAP : W_GAP * (1.0 - (double) oversize / total);
    }

    private double scoreLunch(List<SecData> all, List<CustomBlockDto> blocks) {
        Map<Integer, List<int[]>> dayIntervals = buildDayIntervals(all, blocks);

        int active = 0, satisfied = 0;
        int ls = 12 * 60, le = 14 * 60;
        for (List<int[]> intervals : dayIntervals.values()) {
            if (intervals.isEmpty()) continue;
            active++;
            intervals.sort(Comparator.comparingInt(x -> x[0]));
            List<int[]> merged = mergeIntervals(intervals);
            int freeStart = ls, maxFree = 0;
            for (int[] seg : merged) {
                if (seg[0] >= le) break;
                int os = Math.max(seg[0], ls), oe = Math.min(seg[1], le);
                if (os > freeStart) maxFree = Math.max(maxFree, os - freeStart);
                if (oe > freeStart) freeStart = oe;
            }
            maxFree = Math.max(maxFree, le - freeStart);
            if (maxFree >= 60) satisfied++;
        }
        return active == 0 ? W_LUNCH : W_LUNCH * ((double) satisfied / active);
    }

    private Map<Integer, List<int[]>> buildDayIntervals(List<SecData> all, List<CustomBlockDto> blocks) {
        Map<Integer, List<int[]>> map = new HashMap<>();
        for (SecData s : all)
            for (TimeInfo t : s.times())
                if (t.dayIdx() >= 0) map.computeIfAbsent(t.dayIdx(), k -> new ArrayList<>()).add(new int[]{t.startMin(), t.endMin()});
        if (blocks != null)
            for (CustomBlockDto b : blocks) {
                Integer idx = DAY_TO_IDX.get(b.getDay());
                if (idx != null) map.computeIfAbsent(idx, k -> new ArrayList<>()).add(new int[]{parseMin(b.getStartTime()), parseMin(b.getEndTime())});
            }
        return map;
    }

    private double activeWeightSum(RecommendationRequest req) {
        double sum = W_GAP;
        if (!req.getPreferredFreeDays().isEmpty()) sum += W_FREE_DAY;
        if (!req.getMorningPreference().equals("NEUTRAL") || !req.getAfternoonPreference().equals("NEUTRAL")
                || !req.getEveningPreference().equals("NEUTRAL")) sum += W_TIME;
        if (req.isNeedsLunchBreak()) sum += W_LUNCH;
        return sum;
    }

    private List<int[]> mergeIntervals(List<int[]> sorted) {
        List<int[]> r = new ArrayList<>();
        if (sorted.isEmpty()) return r;
        r.add(sorted.get(0).clone());
        for (int i = 1; i < sorted.size(); i++) {
            int[] last = r.get(r.size() - 1), cur = sorted.get(i);
            if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
            else r.add(cur.clone());
        }
        return r;
    }

    // ── 추천 이유 ─────────────────────────────────────────────────────────

    private List<String> reasons(List<SecData> all, RecommendationRequest req, Score s) {
        List<String> r = new ArrayList<>();

        if (!req.getPreferredFreeDays().isEmpty()) {
            Set<String> busy = all.stream().flatMap(sec -> sec.times().stream()).map(TimeInfo::dayKor).collect(Collectors.toSet());
            long matched = req.getPreferredFreeDays().stream().filter(d -> !busy.contains(d)).count();
            double ratio = (double) matched / req.getPreferredFreeDays().size();
            if (ratio >= 1.0) r.add("공강 희망 요일 100% 반영");
            else if (ratio >= 0.5) r.add("공강 희망 요일 " + Math.round(ratio * 100) + "% 반영");
        }

        String m = req.getMorningPreference(), a = req.getAfternoonPreference(), e = req.getEveningPreference();
        double timePct = s.time() / W_TIME;
        if ("DISLIKE".equals(m) && timePct >= 0.7) r.add("아침 수업 최소화");
        if ("DISLIKE".equals(e) && timePct >= 0.7) r.add("저녁 수업 최소화");
        if ("PREFER".equals(m) && timePct >= 0.7) r.add("오전 수업 위주 구성");
        if ("PREFER".equals(a) && timePct >= 0.7) r.add("오후 수업 위주 구성");

        if (req.isNeedsLunchBreak() && s.lunch() / W_LUNCH >= 0.8) r.add("점심시간 확보");
        if (s.gap() / W_GAP >= 0.9) r.add("강의 사이 공백 최소화");

        if (req.getMajorMinCount() > 0 && hasMajorCtx(req.getUserMajor())) {
            long cnt = all.stream().filter(sec -> isMajor(sec, req.getUserMajor())).count();
            r.add("전공 과목 " + cnt + "개 포함");
        }

        if (r.isEmpty()) r.add("종합 점수 " + s.total() + "점");
        if (r.size() == 1) r.add("추천 분반 " + all.size() + "개 구성");
        return r.stream().limit(5).toList();
    }

    // ── 다양성 선택 ───────────────────────────────────────────────────────

    private void insertPool(List<Candidate> pool, Map<String, Integer> idx, Candidate c) {
        String key = c.courseKey();
        if (idx.containsKey(key)) {
            int i = idx.get(key);
            if (c.score().total() > pool.get(i).score().total()) {
                pool.set(i, c);
                pool.sort(Comparator.comparingInt(x -> -x.score().total()));
                rebuildIdx(pool, idx);
            }
            return;
        }
        pool.add(c);
        idx.put(key, pool.size() - 1);
        pool.sort(Comparator.comparingInt(x -> -x.score().total()));
        rebuildIdx(pool, idx);
        if (pool.size() > POOL_SIZE) {
            Candidate removed = pool.remove(pool.size() - 1);
            idx.remove(removed.courseKey());
            rebuildIdx(pool, idx);
        }
    }

    private void rebuildIdx(List<Candidate> pool, Map<String, Integer> idx) {
        idx.clear();
        for (int i = 0; i < pool.size(); i++) idx.put(pool.get(i).courseKey(), i);
    }

    private List<Candidate> selectDiverse(List<Candidate> pool) {
        if (pool.size() <= TOP_K) return new ArrayList<>(pool);
        List<Candidate> remaining = new ArrayList<>(pool);
        remaining.sort(Comparator.comparingInt(x -> -x.score().total()));
        List<Candidate> selected = new ArrayList<>();
        selected.add(remaining.remove(0));

        while (selected.size() < TOP_K && !remaining.isEmpty()) {
            int bestIdx = 0;
            double bestScore = Double.NEGATIVE_INFINITY;
            for (int i = 0; i < remaining.size(); i++) {
                Candidate cand = remaining.get(i);
                double maxSim = selected.stream().mapToDouble(s -> jaccard(cand, s)).max().orElse(0);
                double adj = cand.score().total() - maxSim * DIVERSITY_PENALTY;
                if (adj > bestScore) { bestScore = adj; bestIdx = i; }
            }
            selected.add(remaining.remove(bestIdx));
        }
        return selected;
    }

    private double jaccard(Candidate a, Candidate b) {
        Set<Long> sa = a.sections().stream().map(SecData::courseId).collect(Collectors.toSet());
        Set<Long> sb = b.sections().stream().map(SecData::courseId).collect(Collectors.toSet());
        if (sa.isEmpty() && sb.isEmpty()) return 1.0;
        long inter = sa.stream().filter(sb::contains).count();
        long union = sa.size() + sb.size() - inter;
        return union == 0 ? 0 : (double) inter / union;
    }

    // ── 전공 판정 ─────────────────────────────────────────────────────────

    private boolean hasMajorCtx(String major) {
        return major != null && !major.isBlank();
    }

    private boolean isMajor(SecData s, String userMajor) {
        if (!hasMajorCtx(userMajor)) return false;
        String col = safe(s.college()), cat = safe(s.category());
        if (!TARGET_COLLEGES.contains(norm(col))) return false;
        if (!cat.startsWith("전공")) return false;
        return sameDepartmentOrGroup(userMajor, s.dept());
    }

    private boolean sameDepartmentOrGroup(String userMajor, String courseDept) {
        List<String> userKeys = lookupKeys(userMajor);
        List<String> courseKeys = lookupKeys(courseDept);
        if (userKeys.isEmpty() || courseKeys.isEmpty()) return false;

        for (String userKey : userKeys) {
            if (courseKeys.contains(userKey)) return true;
        }

        String userGroupKey = deptGroupKey(userMajor);
        String courseGroupKey = deptGroupKey(courseDept);
        return userGroupKey != null && userGroupKey.equals(courseGroupKey);
    }

    private String deptGroupKey(String dept) {
        for (String key : lookupKeys(dept)) {
            String creativeSoft = norm("창의소프트학부");
            if (key.equals(creativeSoft) || key.startsWith(creativeSoft)) {
                return CREATIVE_SOFT_GROUP_KEY;
            }
        }

        for (String key : lookupKeys(dept)) {
            String groupKey = DEPT_GROUP_KEYS.get(key);
            if (groupKey != null) return groupKey;
        }

        return null;
    }

    private List<String> lookupKeys(String value) {
        String normalized = norm(value);
        if (normalized.isEmpty()) return List.of();

        LinkedHashSet<String> keys = new LinkedHashSet<>();
        keys.add(normalized);

        String current = normalized;
        while (true) {
            String stripped = current.replaceAll("(학과|전공)$", "");
            if (stripped.isEmpty() || stripped.equals(current)) break;
            keys.add(stripped);
            current = stripped;
        }

        return new ArrayList<>(keys);
    }

    private static Map<String, String> buildDeptGroupKeys() {
        Map<String, String> result = new HashMap<>();
        addDeptGroup(result, "robotics",
                "AI로봇학과",
                "국방AI로봇융합공학과",
                "글로벌AI로봇융합공학과",
                "국방AI융합시스템공학과",
                "지능기전공학과",
                "지능IoT학과",
                "스마트기기공학전공",
                "무인이동체공학과");
        addDeptGroup(result, "electronics",
                "AI융합전자공학과",
                "전자정보통신공학과",
                "반도체시스템공학과",
                "양자지능정보학과",
                "전자지능정보학과");
        addDeptGroup(result, "ai-data",
                "인공지능데이터사이언스학과",
                "인공지능학과",
                "데이터사이언스학과",
                "지능정보융합학과");
        addDeptGroup(result, "software",
                "소프트웨어학과",
                "콘텐츠소프트웨어학과",
                "컴퓨터공학과",
                "정보보호학과",
                "사이버국방학과");
        return Map.copyOf(result);
    }

    private static void addDeptGroup(Map<String, String> target, String groupKey, String... aliases) {
        for (String alias : aliases) {
            for (String lookupKey : staticLookupKeys(alias)) {
                target.put(lookupKey, groupKey);
            }
        }
    }

    private static List<String> staticLookupKeys(String value) {
        String normalized = staticNorm(value);
        if (normalized.isEmpty()) return List.of();

        LinkedHashSet<String> keys = new LinkedHashSet<>();
        keys.add(normalized);

        String current = normalized;
        while (true) {
            String stripped = current.replaceAll("(학과|전공)$", "");
            if (stripped.isEmpty() || stripped.equals(current)) break;
            keys.add(stripped);
            current = stripped;
        }

        return new ArrayList<>(keys);
    }

    private String norm(String s) {
        return staticNorm(s);
    }

    private static String staticNorm(String s) {
        return s == null ? "" : s.trim().toLowerCase().replaceAll("\\s+", "").replaceAll("[()]", "");
    }

    // ── 응답 변환 ─────────────────────────────────────────────────────────

    private CombinationDto toCombDto(Candidate c, int fixedCredits) {
        List<SectionDto> sections = c.sections().stream().map(this::toSectionDto).toList();
        Score s = c.score();
        return CombinationDto.builder()
                .sections(sections)
                .totalCredits(c.totalCredits())
                .scoreBreakdown(ScoreBreakdownDto.builder()
                        .freeDay(s.freeDay()).timePreference(s.time()).gap(s.gap())
                        .lunch(s.lunch()).major(0).total(s.total())
                        .build())
                .reasons(c.reasons())
                .build();
    }

    private SectionDto toSectionDto(SecData s) {
        List<TimeDto> times = s.times().stream()
                .map(t -> TimeDto.builder()
                        .dayOfWeekKor(t.dayKor()).startTime(t.startStr()).endTime(t.endStr())
                        .build())
                .toList();
        return SectionDto.builder()
                .sectionId(s.sectionId()).courseId(s.courseId())
                .courseCode(s.courseCode()).courseName(s.courseName())
                .sectionNumber(s.sectionNum()).professor(s.professor())
                .credits(s.credits()).categoryDescription(s.category())
                .college(s.college()).department(s.dept())
                .times(times)
                .build();
    }

    private RecommendationResponseDto fail(String msg) {
        return RecommendationResponseDto.builder().combinations(List.of()).diagnosisMessage(msg).build();
    }

    private String diagMsg(RecommendationRequest req, int candSize, int fixedCred, int[] suf) {
        if (req.getMajorMinCount() > 0)
            return "전공 과목 " + req.getMajorMinCount() + "개 이상 조건을 만족하는 조합이 없습니다. 학점 범위를 넓히거나 전공 과목 수를 줄여보세요.";
        if (fixedCred + (suf.length > 0 ? suf[0] : 0) < req.getCreditMin())
            return "희망 학점 범위를 조금 낮춰보거나 고정 분반을 더 추가해주세요.";
        if (candSize < 3)
            return "현재 후보 강의들끼리 시간 충돌이 많아 조합을 만들기 어렵습니다.";
        return "조건을 만족하는 시간표 조합을 찾지 못했습니다.";
    }
}

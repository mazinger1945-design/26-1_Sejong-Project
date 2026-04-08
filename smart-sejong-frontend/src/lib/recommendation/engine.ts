/**
 * 추천 엔진 (DFS + 백트래킹)
 *
 * 개선사항:
 * 1. 다양성 보장: courseId 집합이 동일한 결과는 topK에서 하나만 유지 (점수 높은 것 유지)
 * 2. 전공 과목 수 하드 조건: majorMinCount 미달 조합은 즉시 제외
 * 3. 전공 과목 수 조기 가지치기: 남은 그룹을 다 전공으로 담아도 부족하면 가지치기
 * 4. 탐색 순서: 전공 과목 그룹 먼저 탐색 → 전공 포함 조합이 빠르게 topK에 진입
 * 5. evalCount는 전공 조건 통과 후 증가 → 전공 미달 조합에 평가 횟수 낭비 안 함
 */

import type {
  NormalizedSection,
  RecommendationFilters,
  RecommendationItem,
  CourseGroup,
} from './types'
import { filterCandidates, buildCourseGroups, buildSuffixMaxCredits } from './filter'
import { buildInitialMask } from './validate'
import { scoreSchedule } from './score'
import { buildRecommendationReasons } from './reasons'
import { hasMaskConflict, mergeWeeklyMasks } from './timeMask'
import { TOP_K, MAX_EVAL } from './constants'
import { hasMajorClassificationContext, isMajorCourseForUser } from './majorDetermination'

let evalCount = 0
const DIVERSITY_POOL_SIZE = TOP_K * 8
const DIVERSITY_PENALTY = 24

// ── 다양성 보장 ───────────────────────────────────────────────

function getCourseIdKey(item: RecommendationItem): string {
  return item.sections
    .map((s) => s.courseId)
    .sort()
    .join(',')
}

/** top-K 삽입 (courseId 집합 기준 중복 제거) */
function pushTopK(
  candidatePool: RecommendationItem[],
  candidatePoolKeys: Set<string>,
  item: RecommendationItem,
): void {
  const key = getCourseIdKey(item)

  if (candidatePoolKeys.has(key)) {
    const existIdx = candidatePool.findIndex((x) => getCourseIdKey(x) === key)
    if (
      existIdx >= 0 &&
      item.scoreBreakdown.total > candidatePool[existIdx].scoreBreakdown.total
    ) {
      candidatePool[existIdx] = item
      candidatePool.sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total)
    }
    return
  }

  candidatePool.push(item)
  candidatePoolKeys.add(key)
  candidatePool.sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total)

  if (candidatePool.length > DIVERSITY_POOL_SIZE) {
    const removed = candidatePool.pop()!
    candidatePoolKeys.delete(getCourseIdKey(removed))
  }
}

function getCourseIdSet(item: RecommendationItem): Set<string> {
  return new Set(item.sections.map((section) => section.courseId))
}

function getScheduleSimilarity(left: RecommendationItem, right: RecommendationItem): number {
  const leftIds = getCourseIdSet(left)
  const rightIds = getCourseIdSet(right)

  if (leftIds.size === 0 && rightIds.size === 0) {
    return 1
  }

  let intersection = 0
  for (const courseId of leftIds) {
    if (rightIds.has(courseId)) {
      intersection += 1
    }
  }

  const union = new Set([...leftIds, ...rightIds]).size
  return union === 0 ? 0 : intersection / union
}

function selectDiverseRecommendations(candidatePool: RecommendationItem[]): RecommendationItem[] {
  if (candidatePool.length <= TOP_K) {
    return [...candidatePool]
  }

  const remaining = [...candidatePool].sort(
    (a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total,
  )
  const selected: RecommendationItem[] = [remaining.shift()!]

  while (selected.length < TOP_K && remaining.length > 0) {
    let bestIdx = 0
    let bestAdjustedScore = Number.NEGATIVE_INFINITY

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i]
      const maxSimilarity = Math.max(
        ...selected.map((picked) => getScheduleSimilarity(candidate, picked)),
      )
      const adjustedScore = candidate.scoreBreakdown.total - maxSimilarity * DIVERSITY_PENALTY

      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore
        bestIdx = i
      }
    }

    selected.push(remaining.splice(bestIdx, 1)[0])
  }

  return selected
}

// ── 전공 과목 수 헬퍼 ─────────────────────────────────────────

/**
 * 분반이 사용자의 전공 과목인지 판정합니다.
 * 로그인된 사용자의 학과 정보가 있을 때만 전공 판정을 수행합니다.
 */
export function isMajorSection(sec: NormalizedSection, userMajor?: string): boolean {
  if (!hasMajorClassificationContext(userMajor)) {
    return false
  }

  return isMajorCourseForUser(
    sec.college ?? '',
    sec.department ?? '',
    sec.categoryDescription ?? '',
    userMajor ?? '',
  )
}

/** 각 index 이후에서 추가 가능한 최대 전공 과목 수 suffix 배열 */
function buildSuffixMaxMajorCount(
  groups: CourseGroup[],
  isMajor: (sec: NormalizedSection) => boolean,
): number[] {
  const n = groups.length
  const suffix = new Array<number>(n + 1).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    // 해당 그룹에 전공 분반이 하나라도 있으면 1 기여
    const hasMajor = groups[i].sections.some(isMajor) ? 1 : 0
    suffix[i] = suffix[i + 1] + hasMajor
  }
  return suffix
}

// ── DFS ──────────────────────────────────────────────────────

function dfs(
  index: number,
  currentMask: bigint[],
  selectedSections: NormalizedSection[],
  currentCredits: number,
  currentMajorCount: number,   // 지금까지 선택된 전공 과목 수
  groups: CourseGroup[],
  suffix: number[],
  suffixMajorCount: number[], // 각 index 이후에서 추가 가능한 최대 전공 과목 수
  filters: RecommendationFilters,
  topK: RecommendationItem[],
  topKKeys: Set<string>,
): void {
  if (evalCount >= MAX_EVAL) return

  const { fixedSections, creditRange, majorMinCount, userMajor } = filters
  const isMajor = (sec: NormalizedSection) => isMajorSection(sec, userMajor)

  // ── 학점 가지치기 ─────────────────────────────────────────
  if (currentCredits > creditRange.max) return
  if (currentCredits + suffix[index] < creditRange.min) return

  // ── 전공 과목 수 조기 가지치기 ────────────────────────────
  if (majorMinCount > 0) {
    const maxAchievableMajorCount = currentMajorCount + suffixMajorCount[index]
    if (maxAchievableMajorCount < majorMinCount) return
  }

  // ── 탐색 완료 ─────────────────────────────────────────────
  if (index === groups.length) {
    if (currentCredits < creditRange.min) return

    // 전공 과목 수 하드 조건 최종 확인
    if (majorMinCount > 0) {
      const allSections = [...fixedSections, ...selectedSections]
      const actualMajorCount = allSections.filter(isMajor).length
      if (actualMajorCount < majorMinCount) return
    }

    // 전공 조건 통과 후 평가 카운트 증가
    evalCount++

    const allSections = [...fixedSections, ...selectedSections]
    const scoreBreakdown = scoreSchedule(allSections, filters.customBlocks, filters)
    const reasons = buildRecommendationReasons(allSections, filters, scoreBreakdown)

    const item: RecommendationItem = {
      sections: selectedSections.map((s) => ({ ...s })),
      totalCredits: currentCredits,
      scoreBreakdown,
      reasons,
    }
    pushTopK(topK, topKKeys, item)
    return
  }

  const group = groups[index]

  // ── 탐색 순서: 분반 선택 먼저 (스킵 나중) ─────────────────
  for (const sec of group.sections) {
    if (hasMaskConflict(currentMask, sec.weeklyMask)) continue
    if (currentCredits + sec.credits > creditRange.max) continue

    const nextMask = mergeWeeklyMasks(currentMask, sec.weeklyMask)
    const addedMajor = isMajor(sec) ? 1 : 0

    dfs(
      index + 1,
      nextMask,
      [...selectedSections, sec],
      currentCredits + sec.credits,
      currentMajorCount + addedMajor,
      groups,
      suffix,
      suffixMajorCount,
      filters,
      topK,
      topKKeys,
    )

    if (evalCount >= MAX_EVAL) return
  }

  // 선택 안 함 (스킵)
  dfs(
    index + 1,
    currentMask,
    selectedSections,
    currentCredits,
    currentMajorCount,
    groups,
    suffix,
    suffixMajorCount,
    filters,
    topK,
    topKKeys,
  )
}

// ── 공개 API ─────────────────────────────────────────────────

export interface GenerateResult {
  recommendations: RecommendationItem[]
  diagnosisMessage: string | null
}

export function generateRecommendations(
  rawCandidateSections: NormalizedSection[],
  filters: RecommendationFilters,
): GenerateResult {
  evalCount = 0

  const { fixedSections, customBlocks, excludedCourseIds, creditRange, majorMinCount, userMajor } =
    filters

  if (majorMinCount > 0 && !hasMajorClassificationContext(userMajor)) {
    return {
      recommendations: [],
      diagnosisMessage: '전공 최소 과목 수 조건은 로그인 후 전공 정보가 있을 때만 사용할 수 있습니다.',
    }
  }

  const isMajor = (sec: NormalizedSection) => isMajorSection(sec, userMajor)

  const fixedCredits = fixedSections.reduce((s, f) => s + f.credits, 0)
  const fixedMajorCount = fixedSections.filter(isMajor).length

  const filtered = filterCandidates({
    candidateSections: rawCandidateSections,
    fixedSections,
    customBlocks,
    excludedCourseIds,
  })

  if (filtered.length === 0 && fixedCredits < creditRange.min) {
    return {
      recommendations: [],
      diagnosisMessage:
        excludedCourseIds.length > 0
          ? '제외 과목이 많아 추천 가능한 후보가 부족합니다.'
          : '고정한 분반 또는 일정 때문에 가능한 조합이 없습니다.',
    }
  }

  const groups = buildCourseGroups(filtered)

  // ★ 전공 과목 그룹을 앞으로 정렬 → 전공 포함 조합 우선 탐색
  if (majorMinCount > 0) {
    groups.sort((a, b) => {
      const aMajor = a.sections.some((s) => isMajor(s)) ? 1 : 0
      const bMajor = b.sections.some((s) => isMajor(s)) ? 1 : 0
      return bMajor - aMajor
    })
  }

  const suffix = buildSuffixMaxCredits(groups)
  const suffixMajorCount = buildSuffixMaxMajorCount(groups, isMajor)
  const initialMask = buildInitialMask(fixedSections, customBlocks)

  const candidatePool: RecommendationItem[] = []
  const candidatePoolKeys = new Set<string>()

  dfs(
    0,
    initialMask,
    [],
    fixedCredits,
    fixedMajorCount,
    groups,
    suffix,
    suffixMajorCount,
    filters,
    candidatePool,
    candidatePoolKeys,
  )

  if (candidatePool.length === 0) {
    let msg = '조건을 만족하는 시간표 조합을 찾지 못했습니다.'
    if (majorMinCount > 0) {
      msg = `전공 과목 ${majorMinCount}개 이상 조건을 만족하는 조합이 없습니다. 학점 범위를 넓히거나 전공 과목 수를 줄여보세요.`
    } else if (fixedCredits + suffix[0] < creditRange.min) {
      msg = '희망 학점 범위를 조금 낮춰보거나 고정 분반을 더 추가해주세요.'
    } else if (filtered.length < 3) {
      msg = '현재 후보 강의들끼리 시간 충돌이 많아 조합을 만들기 어렵습니다.'
    }
    return { recommendations: [], diagnosisMessage: msg }
  }

  return {
    recommendations: selectDiverseRecommendations(candidatePool),
    diagnosisMessage: null,
  }
}

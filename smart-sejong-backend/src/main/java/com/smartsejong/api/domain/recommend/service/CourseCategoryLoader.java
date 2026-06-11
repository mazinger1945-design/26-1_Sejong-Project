package com.smartsejong.api.domain.recommend.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;

@Slf4j
@Component
public class CourseCategoryLoader {

    private static final String PATH = "timetable/강의시간표_카테고리라벨링.xlsx";
    private static final int COL_CODE = 3;
    private static final int COL_CATEGORY = 23;

    // 카테고리 유사도 그룹 (같은 관심사로 간주)
    private static final Map<String, Set<String>> SIMILAR;

    static {
        Map<String, Set<String>> m = new HashMap<>();
        m.put("AI/데이터",       Set.of("AI/데이터", "SW/IT", "수학/통계"));
        m.put("SW/IT",          Set.of("SW/IT", "AI/데이터", "수학/통계"));
        m.put("전기/전자/통신",  Set.of("전기/전자/통신", "AI/데이터", "SW/IT", "기계/항공/로봇"));
        m.put("수학/통계",       Set.of("수학/통계", "AI/데이터", "SW/IT", "자연과학"));
        m.put("기계/항공/로봇",  Set.of("기계/항공/로봇", "전기/전자/통신", "에너지/신소재"));
        m.put("에너지/신소재",   Set.of("에너지/신소재", "기계/항공/로봇", "자연과학"));
        m.put("건축/토목/환경",  Set.of("건축/토목/환경", "에너지/신소재"));
        m.put("생명/식품/바이오",Set.of("생명/식품/바이오", "자연과학"));
        m.put("자연과학",        Set.of("자연과학", "생명/식품/바이오", "수학/통계"));
        m.put("경영/경제",       Set.of("경영/경제", "사회/행정"));
        m.put("사회/행정",       Set.of("사회/행정", "경영/경제", "법학"));
        m.put("법학",            Set.of("법학", "사회/행정"));
        m.put("언어/문학/문화",  Set.of("언어/문학/문화", "역사/철학", "어학"));
        m.put("역사/철학",       Set.of("역사/철학", "언어/문학/문화"));
        m.put("어학",            Set.of("어학", "언어/문학/문화"));
        m.put("예술/문화",       Set.of("예술/문화", "체육/건강"));
        m.put("체육/건강",       Set.of("체육/건강", "예술/문화"));
        m.put("교양일반",        Set.of("교양일반", "진로/자기계발", "교직/교육"));
        m.put("진로/자기계발",   Set.of("진로/자기계발", "교양일반", "교직/교육"));
        m.put("교직/교육",       Set.of("교직/교육", "교양일반", "진로/자기계발"));
        m.put("관광/호텔",       Set.of("관광/호텔", "경영/경제"));
        SIMILAR = Collections.unmodifiableMap(m);
    }

    private final Map<String, String> codeToCategory;

    public CourseCategoryLoader() {
        this.codeToCategory = loadCategories();
        log.info("카테고리 라벨 로드 완료: {}개 과목", codeToCategory.size());
    }

    public String getCategory(String courseCode) {
        if (courseCode == null) return null;
        return codeToCategory.get(courseCode.trim());
    }

    /** category와 동일하거나 유사한 카테고리 집합 반환 */
    public Set<String> getSimilarCategories(String category) {
        if (category == null) return Set.of();
        return SIMILAR.getOrDefault(category, Set.of(category));
    }

    private Map<String, String> loadCategories() {
        Map<String, String> result = new HashMap<>();
        try (InputStream is = new ClassPathResource(PATH).getInputStream();
             Workbook wb = new XSSFWorkbook(is)) {

            Sheet sheet = wb.getSheetAt(0);
            boolean header = true;
            for (Row row : sheet) {
                if (header) { header = false; continue; }
                Cell codeCell = row.getCell(COL_CODE);
                Cell catCell  = row.getCell(COL_CATEGORY);
                if (codeCell == null || catCell == null) continue;

                String code = readCell(codeCell);
                String category = catCell.getCellType() == CellType.STRING
                        ? catCell.getStringCellValue().trim() : "";
                if (!code.isEmpty() && !category.isEmpty()) {
                    result.put(code, category);
                }
            }
        } catch (Exception e) {
            log.warn("카테고리 Excel 로드 실패: {}", e.getMessage());
            return Collections.emptyMap();
        }
        return Collections.unmodifiableMap(result);
    }

    private String readCell(Cell cell) {
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default -> "";
        };
    }
}

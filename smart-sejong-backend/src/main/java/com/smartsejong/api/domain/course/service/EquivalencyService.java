package com.smartsejong.api.domain.course.service;

import com.smartsejong.api.domain.course.entity.CourseEquivalency;
import com.smartsejong.api.domain.course.repository.CourseEquivalencyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class EquivalencyService {

    private final CourseEquivalencyRepository equivalencyRepository;

    /**
     * 동일과목 Excel을 파싱하여 DB에 저장한다.
     * 헤더: 3번째 행 (0-based index 2)
     * 데이터: 4번째 행부터 (0-based index 3~)
     * B열=그룹번호, C열=학수번호, D열=교과목명
     */
    @Transactional
    public int loadFromExcel(InputStream is) {
        int count = 0;
        try (Workbook wb = new XSSFWorkbook(is)) {
            Sheet sheet = wb.getSheetAt(0);
            List<CourseEquivalency> batch = new ArrayList<>();

            // 데이터는 행 인덱스 3부터 (row 4, 1-based)
            for (int rowIdx = 3; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;

                String groupNumber = getCellString(row.getCell(1));
                String courseCode  = getCellString(row.getCell(2));
                String courseName  = getCellString(row.getCell(3));

                if (groupNumber == null || groupNumber.isBlank()) continue;
                if (courseCode  == null || courseCode.isBlank())  continue;

                batch.add(CourseEquivalency.builder()
                        .groupNumber(groupNumber.trim())
                        .courseCode(courseCode.trim())
                        .courseName(courseName != null ? courseName.trim() : null)
                        .build());
                count++;
            }

            equivalencyRepository.saveAll(batch);
            log.info("[EquivalencyService] 동일과목 {}건 저장 완료", count);
        } catch (Exception e) {
            log.error("[EquivalencyService] Excel 파싱 실패: {}", e.getMessage(), e);
        }
        return count;
    }

    /**
     * 완료한 과목 코드 목록을 받아 동일과목(같은 그룹)까지 포함한 전체 제외 코드 목록을 반환한다.
     */
    @Transactional(readOnly = true)
    public Set<String> resolveEquivalentCodes(List<String> completedCodes) {
        if (completedCodes == null || completedCodes.isEmpty()) return Set.of();

        // 1) 이수 과목의 그룹번호 조회
        Set<String> groups = equivalencyRepository.findGroupNumbersByCodes(completedCodes);
        if (groups.isEmpty()) return new HashSet<>(completedCodes);

        // 2) 해당 그룹들의 전체 과목 코드 조회
        Set<String> allCodes = equivalencyRepository.findCodesByGroupNumbers(groups);
        allCodes.addAll(completedCodes); // 원본도 포함
        return allCodes;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                yield String.valueOf((long) d);
            }
            default -> null;
        };
    }
}

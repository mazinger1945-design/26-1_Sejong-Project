package com.smartsejong.api.domain.recommend.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class WishlistLoader {

    private static final String WISHLIST_PATH = "timetable/교양선택관심과목.xlsx";

    private final Map<String, Integer> wishlistCounts;
    private final int maxCount;

    public WishlistLoader() {
        this.wishlistCounts = loadWishlist();
        this.maxCount = wishlistCounts.values().stream().mapToInt(Integer::intValue).max().orElse(1);
        log.info("관심과목 로드 완료: {}개 과목, 최대 관심수: {}", wishlistCounts.size(), maxCount);
    }

    public int getCount(String courseCode) {
        return wishlistCounts.getOrDefault(courseCode == null ? "" : courseCode.trim(), 0);
    }

    public int getMaxCount() {
        return maxCount;
    }

    private Map<String, Integer> loadWishlist() {
        Map<String, Integer> result = new HashMap<>();
        try (InputStream is = new ClassPathResource(WISHLIST_PATH).getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            boolean header = true;
            for (Row row : sheet) {
                if (header) { header = false; continue; }
                Cell codeCell = row.getCell(0);
                Cell countCell = row.getCell(5);
                if (codeCell == null || countCell == null) continue;

                String code = readCodeCell(codeCell);
                if (code.isEmpty()) continue;

                int count = (int) countCell.getNumericCellValue();
                result.merge(code, count, Integer::max);
            }
        } catch (Exception e) {
            log.warn("관심과목 Excel 로드 실패: {}", e.getMessage());
            return Collections.emptyMap();
        }
        return Collections.unmodifiableMap(result);
    }

    private String readCodeCell(Cell cell) {
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default -> "";
        };
    }
}

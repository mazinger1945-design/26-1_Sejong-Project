package com.smartsejong.api.domain.course.service;

import com.smartsejong.api.domain.course.dto.CompletedCourseResponse;
import com.smartsejong.api.domain.course.dto.CompletedCourseSummaryResponse;
import com.smartsejong.api.domain.course.dto.CompletedCourseSummaryResponse.CategorySummary;
import com.smartsejong.api.domain.course.dto.CompletedCourseUploadResult;
import com.smartsejong.api.domain.user.entity.User;
import com.smartsejong.api.domain.user.repository.UserRepository;
import com.smartsejong.api.entity.CompletedCourse;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import com.smartsejong.api.domain.course.repository.CompletedCourseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompletedCourseServiceImpl implements CompletedCourseService {

    private static final Set<String> PASS_FAIL_GRADES = Set.of("P", "NP", "F");
    private static final Set<String> MAJOR_CATEGORIES = Set.of("전필", "전선", "전공필수", "전공선택");
    private static final Set<String> LIBERAL_CATEGORIES = Set.of("교필", "교선", "교양필수", "교양선택");

    private final CompletedCourseRepository completedCourseRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CompletedCourseResponse> parseCompletedCourses(MultipartFile file) {
        List<CompletedCourseResponse> courses = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                try {
                    String year = getCellValue(row.getCell(1));
                    String semester = getCellValue(row.getCell(2));
                    String courseCode = getCellValue(row.getCell(3));
                    String courseName = getCellValue(row.getCell(4));
                    String category = getCellValue(row.getCell(5));
                    int credits = (int) getNumericCellValue(row.getCell(8));
                    String grade = getCellValue(row.getCell(10));
                    double gradePoint = getNumericCellValue(row.getCell(11));
                    if (courseCode.isEmpty() || courseName.isEmpty()) continue;
                    courses.add(CompletedCourseResponse.builder()
                            .id(null)
                            .courseCode(courseCode)
                            .courseName(courseName)
                            .category(category)
                            .credits(credits)
                            .grade(grade)
                            .gradePoint(gradePoint)
                            .year(year)
                            .semester(semester)
                            .build());
                } catch (Exception e) {
                    log.warn("Row {} 처리 실패: {}", i, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Excel 파일 처리 실패", e);
            throw new CustomException(ErrorCode.INVALID_EXCEL_FORMAT);
        }
        return courses;
    }

    @Override
    @Transactional
    public CompletedCourseUploadResult uploadCompletedCourses(Long userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        completedCourseRepository.deleteByUserId(userId);
        int totalRows = 0, successCount = 0, failCount = 0, skipCount = 0;
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            totalRows = Math.max(0, sheet.getPhysicalNumberOfRows() - 1);
            List<CompletedCourse> toSave = new ArrayList<>();
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                try {
                    String year = getCellValue(row.getCell(1));
                    String semester = getCellValue(row.getCell(2));
                    String courseCode = getCellValue(row.getCell(3));
                    String courseName = getCellValue(row.getCell(4));
                    String category = getCellValue(row.getCell(5));
                    int credits = (int) getNumericCellValue(row.getCell(8));
                    String grade = getCellValue(row.getCell(10));
                    double gradePoint = getNumericCellValue(row.getCell(11));
                    if (courseCode.isEmpty() || courseName.isEmpty() || courseCode.equals("학수번호")) {
                        skipCount++;
                        continue;
                    }
                    toSave.add(CompletedCourse.builder()
                            .user(user)
                            .courseCode(courseCode)
                            .courseName(courseName)
                            .category(category)
                            .credits(credits)
                            .grade(grade)
                            .gradePoint(gradePoint)
                            .year(year)
                            .semester(semester)
                            .build());
                    successCount++;
                } catch (Exception e) {
                    log.warn("Row {} 처리 실패: {}", i, e.getMessage());
                    failCount++;
                }
            }
            completedCourseRepository.saveAll(toSave);
        } catch (Exception e) {
            log.error("Excel 파일 처리 실패", e);
            throw new CustomException(ErrorCode.INVALID_EXCEL_FORMAT);
        }
        return CompletedCourseUploadResult.builder()
                .totalRows(totalRows)
                .successCount(successCount)
                .failCount(failCount)
                .skipCount(skipCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompletedCourseResponse> getCompletedCourses(Long userId) {
        return completedCourseRepository.findByUserId(userId).stream()
                .map(CompletedCourseResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CompletedCourseSummaryResponse getSummary(Long userId) {
        List<CompletedCourse> courses = completedCourseRepository.findByUserId(userId);
        List<CompletedCourse> major = new ArrayList<>(), liberal = new ArrayList<>(), other = new ArrayList<>();
        for (CompletedCourse c : courses) {
            String cat = c.getCategory();
            if (cat == null) other.add(c);
            else if (MAJOR_CATEGORIES.contains(cat)) major.add(c);
            else if (LIBERAL_CATEGORIES.contains(cat)) liberal.add(c);
            else other.add(c);
        }
        return CompletedCourseSummaryResponse.builder()
                .major(calculateCategorySummary(major))
                .liberal(calculateCategorySummary(liberal))
                .other(calculateCategorySummary(other))
                .total(calculateCategorySummary(courses))
                .build();
    }

    private CategorySummary calculateCategorySummary(List<CompletedCourse> courses) {
        int totalCredits = 0, earnedCredits = 0, gradePointCredits = 0;
        double totalGradePoints = 0;
        for (CompletedCourse c : courses) {
            int credits = c.getCredits() != null ? c.getCredits() : 0;
            String grade = c.getGrade();
            Double gp = c.getGradePoint();
            totalCredits += credits;
            if (!"F".equals(grade) && !"NP".equals(grade)) earnedCredits += credits;
            if (!PASS_FAIL_GRADES.contains(grade) && gp != null) {
                totalGradePoints += credits * gp;
                gradePointCredits += credits;
            }
        }
        double avg = gradePointCredits > 0 ? Math.round(totalGradePoints / gradePointCredits * 100) / 100.0 : 0.0;
        return CategorySummary.builder()
                .totalCredits(totalCredits)
                .earnedCredits(earnedCredits)
                .totalGradePoints(Math.round(totalGradePoints * 100) / 100.0)
                .gradePointCredits(gradePointCredits)
                .averageGradePoint(avg)
                .build();
    }

    private static String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> (cell.getNumericCellValue() == Math.floor(cell.getNumericCellValue()))
                    ? String.valueOf((int) cell.getNumericCellValue()) : String.valueOf(cell.getNumericCellValue());
            case BLANK -> "";
            default -> "";
        };
    }

    private static double getNumericCellValue(Cell cell) {
        if (cell == null) return 0;
        return switch (cell.getCellType()) {
            case NUMERIC -> cell.getNumericCellValue();
            case STRING -> {
                try {
                    yield Double.parseDouble(cell.getStringCellValue().trim());
                } catch (NumberFormatException e) {
                    yield 0;
                }
            }
            default -> 0;
        };
    }
}

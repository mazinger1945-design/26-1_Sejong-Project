package com.smartsejong.api.domain.course.service;

import com.smartsejong.api.common.enums.CourseCategory;
import com.smartsejong.api.common.enums.DayOfWeek;
import com.smartsejong.api.domain.course.dto.CourseResponse;
import com.smartsejong.api.domain.course.dto.CourseUploadResult;
import com.smartsejong.api.domain.course.dto.SectionResponse;
import com.smartsejong.api.domain.course.entity.Course;
import com.smartsejong.api.domain.course.entity.Section;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import com.smartsejong.api.domain.course.repository.CourseRepository;
import com.smartsejong.api.domain.course.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;

    // 시간 파싱 패턴: "화 18:00~19:00" 또는 "월 09:00~10:30, 수 09:00~10:30"
    private static final Pattern TIME_PATTERN = Pattern.compile("([월화수목금])\\s*(\\d{1,2}:\\d{2})~(\\d{1,2}:\\d{2})");

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> getAllCourses() {
        return courseRepository.findAll().stream()
                .map(CourseResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CourseResponse getCourseById(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
        return CourseResponse.from(course);
    }

    @Override
    @Transactional(readOnly = true)
    public CourseResponse getCourseByCourseCode(String courseCode) {
        Course course = courseRepository.findByCourseCode(courseCode)
                .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
        return CourseResponse.from(course);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> searchCourses(String name, CourseCategory category) {
        return courseRepository.searchCourses(name, category).stream()
                .map(CourseResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SectionResponse> getAllSections() {
        return sectionRepository.findAllWithCourse().stream()
                .map(SectionResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SectionResponse> getSectionsByCourseId(Long courseId) {
        return sectionRepository.findByCourseIdWithCourse(courseId).stream()
                .map(SectionResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SectionResponse getSectionById(Long id) {
        Section section = sectionRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SECTION_NOT_FOUND));
        return SectionResponse.from(section);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SectionResponse> searchSections(String courseName, String professor, DayOfWeek dayOfWeek) {
        return sectionRepository.searchSections(courseName, professor, dayOfWeek).stream()
                .map(SectionResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public CourseUploadResult uploadCoursesFromExcel(MultipartFile file) {
        int totalRows = 0;
        int successCount = 0;
        int failCount = 0;
        int skipCount = 0;

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            totalRows = sheet.getPhysicalNumberOfRows() - 1; // 헤더 제외

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                try {
                    // 2025-2 강의시간표 형식 컬럼 매핑
                    // [3] 학수번호, [4] 분반, [5] 교과목명, [6] 이수구분
                    // [8] 학점, [13] 요일 및 강의시간, [14] 강의실, [15] 메인교수명
                    String courseCode = getCellValue(row.getCell(3));
                    String sectionNumber = getCellValue(row.getCell(4));
                    String courseName = getCellValue(row.getCell(5));
                    String categoryStr = getCellValue(row.getCell(6));
                    double credits = getNumericCellValue(row.getCell(8));
                    String timeStr = getCellValue(row.getCell(13));
                    String room = getCellValue(row.getCell(14));
                    String professor = getCellValue(row.getCell(15));

                    // 필수 값 체크
                    if (courseCode.isEmpty() || courseName.isEmpty()) {
                        skipCount++;
                        continue;
                    }

                    // 과목 생성 또는 조회
                    Course course = courseRepository.findByCourseCode(courseCode)
                            .orElseGet(() -> courseRepository.save(Course.builder()
                                    .courseCode(courseCode)
                                    .name(courseName)
                                    .category(CourseCategory.fromString(categoryStr))
                                    .credits((int) credits)
                                    .build()));

                    // 시간 파싱 및 분반 생성 (여러 시간대 지원)
                    List<TimeSlot> timeSlots = parseTimeSlots(timeStr);

                    if (timeSlots.isEmpty()) {
                        // 시간 정보 없는 경우 (온라인 강의 등)
                        Section section = Section.builder()
                                .course(course)
                                .sectionNumber(sectionNumber)
                                .professor(professor)
                                .dayOfWeek(null)
                                .startTime(null)
                                .endTime(null)
                                .room(room)
                                .build();
                        sectionRepository.save(section);
                    } else {
                        // 각 시간대별로 Section 생성
                        for (TimeSlot slot : timeSlots) {
                            Section section = Section.builder()
                                    .course(course)
                                    .sectionNumber(sectionNumber)
                                    .professor(professor)
                                    .dayOfWeek(slot.dayOfWeek)
                                    .startTime(slot.startTime)
                                    .endTime(slot.endTime)
                                    .room(room)
                                    .build();
                            sectionRepository.save(section);
                        }
                    }
                    successCount++;

                } catch (Exception e) {
                    log.warn("Row {} 처리 실패: {}", i, e.getMessage());
                    failCount++;
                }
            }

        } catch (Exception e) {
            log.error("Excel 파일 처리 실패", e);
            throw new CustomException(ErrorCode.INVALID_EXCEL_FORMAT);
        }

        return CourseUploadResult.builder()
                .totalRows(totalRows)
                .successCount(successCount)
                .failCount(failCount)
                .skipCount(skipCount)
                .build();
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val)) {
                    yield String.valueOf((int) val);
                }
                yield String.valueOf(val);
            }
            case BLANK -> "";
            default -> "";
        };
    }

    private double getNumericCellValue(Cell cell) {
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

    /**
     * 시간 문자열 파싱: "화 18:00~19:00" 또는 "월 09:00~10:30, 수 09:00~10:30"
     */
    private List<TimeSlot> parseTimeSlots(String timeStr) {
        List<TimeSlot> slots = new ArrayList<>();
        if (timeStr == null || timeStr.isBlank()) {
            return slots;
        }

        Matcher matcher = TIME_PATTERN.matcher(timeStr);
        while (matcher.find()) {
            String dayKor = matcher.group(1);
            String startStr = matcher.group(2);
            String endStr = matcher.group(3);

            DayOfWeek dayOfWeek = parseDayOfWeek(dayKor);
            LocalTime startTime = LocalTime.parse(startStr, DateTimeFormatter.ofPattern("H:mm"));
            LocalTime endTime = LocalTime.parse(endStr, DateTimeFormatter.ofPattern("H:mm"));

            slots.add(new TimeSlot(dayOfWeek, startTime, endTime));
        }

        return slots;
    }

    private DayOfWeek parseDayOfWeek(String str) {
        return switch (str) {
            case "월" -> DayOfWeek.MON;
            case "화" -> DayOfWeek.TUE;
            case "수" -> DayOfWeek.WED;
            case "목" -> DayOfWeek.THU;
            case "금" -> DayOfWeek.FRI;
            default -> null;
        };
    }

    private record TimeSlot(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime) {}
}

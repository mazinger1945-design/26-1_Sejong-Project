package com.smartsejong.api.domain.course.service;

import com.smartsejong.api.domain.course.dto.GroupedSectionResponse;
import com.smartsejong.api.domain.course.entity.Section;
import com.smartsejong.api.domain.course.repository.CourseRepository;
import com.smartsejong.api.domain.course.repository.SectionRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class CourseServiceImplDataJpaTest {

    @Autowired
    private CourseServiceImpl courseService;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Test
    void keepsAcademicUnitPerSectionWhenCourseCodesOverlap() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "courses.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                buildWorkbook()
        );

        sectionRepository.deleteAll();
        courseRepository.deleteAll();
        courseService.uploadCoursesFromExcel(file);

        List<GroupedSectionResponse> grouped = courseService.searchGroupedSections("반도체개론");
        assertEquals(2, grouped.size());

        Set<String> colleges = grouped.stream()
                .map(GroupedSectionResponse::getCollege)
                .collect(Collectors.toSet());
        assertEquals(Set.of("전자정보공학대학", "인공지능융합대학"), colleges);

        Set<String> sectionColleges = sectionRepository.findAll().stream()
                .map(Section::getCollege)
                .collect(Collectors.toSet());
        assertEquals(Set.of("전자정보공학대학", "인공지능융합대학"), sectionColleges);
    }

    private byte[] buildWorkbook() throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("courses");
            Row header = sheet.createRow(0);
            for (int i = 0; i <= 15; i++) {
                header.createCell(i).setCellValue("col" + i);
            }

            Row first = sheet.createRow(1);
            writeCourseRow(first, "전자정보공학대학", "반도체시스템공학과", "000001", "001",
                    "반도체개론", "전공필수", 3, "월 09:00~10:30", "A101", "김교수");

            Row second = sheet.createRow(2);
            writeCourseRow(second, "인공지능융합대학", "반도체시스템공학과", "000001", "001",
                    "반도체개론", "전공필수", 3, "수 09:00~10:30", "A101", "김교수");

            workbook.write(output);
            return output.toByteArray();
        }
    }

    private void writeCourseRow(
            Row row,
            String college,
            String department,
            String courseCode,
            String sectionNumber,
            String courseName,
            String category,
            int credits,
            String time,
            String room,
            String professor
    ) {
        row.createCell(1).setCellValue(college);
        row.createCell(2).setCellValue(department);
        row.createCell(3).setCellValue(courseCode);
        row.createCell(4).setCellValue(sectionNumber);
        row.createCell(5).setCellValue(courseName);
        row.createCell(6).setCellValue(category);
        row.createCell(8).setCellValue(credits);
        row.createCell(13).setCellValue(time);
        row.createCell(14).setCellValue(room);
        row.createCell(15).setCellValue(professor);
    }
}

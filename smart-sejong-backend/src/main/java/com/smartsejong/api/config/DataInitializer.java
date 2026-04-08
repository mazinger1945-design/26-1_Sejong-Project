package com.smartsejong.api.config;

import com.smartsejong.api.domain.course.repository.CourseEquivalencyRepository;
import com.smartsejong.api.domain.course.repository.CourseRepository;
import com.smartsejong.api.domain.course.service.CourseService;
import com.smartsejong.api.domain.course.service.EquivalencyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final CourseService courseService;
    private final EquivalencyService equivalencyService;
    private final CourseRepository courseRepository;
    private final CourseEquivalencyRepository equivalencyRepository;

    private static final String TIMETABLE_PATH    = "timetable/2026-1학기 강의시간표(한국어)_20260209.xlsx";
    private static final String EQUIVALENCY_PATH  = "equivalency/동일과목조회_2026-04-08.xlsx";

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // 강의시간표 탑재
        if (courseRepository.count() == 0) {
            log.info("[DataInitializer] 강의시간표 선탑재 시작: {}", TIMETABLE_PATH);
            ClassPathResource resource = new ClassPathResource(TIMETABLE_PATH);
            if (!resource.exists()) {
                log.warn("[DataInitializer] 강의시간표 파일 없음: {}", TIMETABLE_PATH);
            } else {
                try {
                    MultipartFile file = new ClassPathMultipartFile(resource);
                    var result = courseService.uploadCoursesFromExcel(file);
                    log.info("[DataInitializer] 강의시간표 탑재 완료 - 성공: {}, 실패: {}, 스킵: {}",
                            result.getSuccessCount(), result.getFailCount(), result.getSkipCount());
                } catch (Exception e) {
                    log.error("[DataInitializer] 강의시간표 탑재 실패: {}", e.getMessage(), e);
                }
            }
        } else {
            log.info("[DataInitializer] 강의시간표 데이터 이미 존재, 스킵");
        }

        // 동일과목 데이터 탑재
        if (equivalencyRepository.count() == 0) {
            log.info("[DataInitializer] 동일과목 선탑재 시작: {}", EQUIVALENCY_PATH);
            ClassPathResource eqResource = new ClassPathResource(EQUIVALENCY_PATH);
            if (!eqResource.exists()) {
                log.warn("[DataInitializer] 동일과목 파일 없음: {}", EQUIVALENCY_PATH);
            } else {
                try (InputStream is = eqResource.getInputStream()) {
                    int count = equivalencyService.loadFromExcel(is);
                    log.info("[DataInitializer] 동일과목 탑재 완료: {}건", count);
                } catch (Exception e) {
                    log.error("[DataInitializer] 동일과목 탑재 실패: {}", e.getMessage(), e);
                }
            }
        } else {
            log.info("[DataInitializer] 동일과목 데이터 이미 존재, 스킵");
        }
    }

    private static class ClassPathMultipartFile implements MultipartFile {
        private final ClassPathResource resource;

        ClassPathMultipartFile(ClassPathResource resource) {
            this.resource = resource;
        }

        @Override public String getName() { return "file"; }
        @Override public String getOriginalFilename() { return resource.getFilename(); }
        @Override public String getContentType() {
            return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }
        @Override public boolean isEmpty() { return false; }
        @Override public long getSize() {
            try { return resource.contentLength(); } catch (IOException e) { return 0; }
        }
        @Override public byte[] getBytes() throws IOException {
            return resource.getInputStream().readAllBytes();
        }
        @Override public InputStream getInputStream() throws IOException {
            return resource.getInputStream();
        }
        @Override public void transferTo(File dest) throws IOException {
            try (InputStream in = getInputStream(); FileOutputStream out = new FileOutputStream(dest)) {
                in.transferTo(out);
            }
        }
    }
}

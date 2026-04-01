package com.smartsejong.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * 포털 크롤링 등 외부 통신을 위한 WebClient 설정
 */
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient sejongWebClient() {
        return WebClient.builder()
                .baseUrl("https://portal.sejong.ac.kr") // 예시 주소
                .build();
    }
}

package com.smartsejong.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing 기능을 활성화하여 BaseTimeEntity의 생성/수정 시간을 자동으로 기록합니다.
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}
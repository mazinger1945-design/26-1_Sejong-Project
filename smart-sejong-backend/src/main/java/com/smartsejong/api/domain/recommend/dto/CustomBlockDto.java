package com.smartsejong.api.domain.recommend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CustomBlockDto {
    private String title;
    private String day;        // "월", "화", "수", "목", "금"
    private String startTime;  // "HH:MM"
    private String endTime;    // "HH:MM"
}

package com.smartsejong.api.domain.timetable.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CreateTimetableResponse(@JsonProperty("timetable_id") long timetableId) {}

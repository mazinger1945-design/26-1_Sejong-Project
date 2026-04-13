package com.smartsejong.api.domain.timetable.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AddSectionItemRequest(@JsonProperty("section_id") Long sectionId) {}

package com.smartsejong.api.domain.timetable.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PinToggleRequest(@JsonProperty("is_pinned") boolean isPinned) {}

package com.smartsejong.api.domain.timetable.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PinToggleResponse(@JsonProperty("item_id") long itemId,
                                @JsonProperty("is_pinned") boolean isPinned) {}

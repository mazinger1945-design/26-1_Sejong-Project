package com.smartsejong.api.domain.timetable.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AddItemResponse(@JsonProperty("item_id") long itemId) {}

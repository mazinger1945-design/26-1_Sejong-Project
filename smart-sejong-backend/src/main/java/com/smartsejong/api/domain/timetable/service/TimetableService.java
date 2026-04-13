package com.smartsejong.api.domain.timetable.service;

import com.smartsejong.api.domain.timetable.dto.*;

import java.util.List;

public interface TimetableService {
    CreateTimetableResponse create(Long userId, CreateTimetableRequest request);
    List<TimetableResponse> getAll(Long userId);
    TimetableResponse getOne(Long userId, Long timetableId);
    void rename(Long userId, Long timetableId, RenameTimetableRequest request);
    void delete(Long userId, Long timetableId);
    AddItemResponse addSection(Long userId, Long timetableId, AddSectionItemRequest request);
    AddItemResponse addCustom(Long userId, Long timetableId, AddCustomItemRequest request);
    void updateCustom(Long userId, Long itemId, UpdateCustomItemRequest request);
    void deleteItem(Long userId, Long itemId);
    PinToggleResponse togglePin(Long userId, Long itemId, PinToggleRequest request);
    AddItemResponse copySection(Long userId, Long timetableId, Long sectionId);
}

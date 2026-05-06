package com.smartsejong.api.domain.group.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartsejong.api.domain.group.entity.GroupMember;
import com.smartsejong.api.domain.timetable.dto.TimetableItemResponse;
import com.smartsejong.api.domain.timetable.entity.Timetable;

import java.util.List;

public record GroupMemberResponse(
        @JsonProperty("user_id") Long userId,
        String nickname,
        @JsonProperty("active_timetable_id") Long activeTimetableId,
        @JsonProperty("active_timetable_name") String activeTimetableName,
        List<TimetableItemResponse> timetable
) {
    public static GroupMemberResponse from(GroupMember member, List<TimetableItemResponse> timetable) {
        Timetable active = member.getActiveTimetable();
        return new GroupMemberResponse(
                member.getUser().getId(),
                member.getUser().getFullName(),
                active != null ? active.getId() : null,
                active != null ? active.getName() : null,
                timetable
        );
    }
}

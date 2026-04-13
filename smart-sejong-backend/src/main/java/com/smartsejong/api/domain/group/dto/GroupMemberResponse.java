package com.smartsejong.api.domain.group.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartsejong.api.domain.group.entity.GroupMember;
import com.smartsejong.api.domain.timetable.dto.TimetableItemResponse;

import java.util.List;

public record GroupMemberResponse(
        @JsonProperty("user_id") Long userId,
        String nickname,
        List<TimetableItemResponse> timetable
) {
    public static GroupMemberResponse from(GroupMember member, List<TimetableItemResponse> timetable) {
        return new GroupMemberResponse(
                member.getUser().getId(),
                member.getUser().getFullName(),
                timetable
        );
    }
}

package com.smartsejong.api.domain.group.dto;

import com.smartsejong.api.domain.group.entity.Group;

public record GroupResponse(
        Long id,
        String name,
        long count
) {
    public static GroupResponse from(Group group, long count) {
        return new GroupResponse(group.getId(), group.getName(), count);
    }
}

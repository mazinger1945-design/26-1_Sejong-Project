package com.smartsejong.api.domain.group.service;

import com.smartsejong.api.domain.recommend.dto.RecommendationRequest;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GroupRecommendInputStore {

    // groupId → (userId → request)
    private final Map<Long, Map<Long, RecommendationRequest>> store = new ConcurrentHashMap<>();

    public void save(Long groupId, Long userId, RecommendationRequest req) {
        store.computeIfAbsent(groupId, k -> new ConcurrentHashMap<>()).put(userId, req);
    }

    public Map<Long, RecommendationRequest> getInputs(Long groupId) {
        return Collections.unmodifiableMap(store.getOrDefault(groupId, Map.of()));
    }

    public Set<Long> getSubmittedUserIds(Long groupId) {
        return store.getOrDefault(groupId, Map.of()).keySet();
    }

    public void clear(Long groupId) {
        store.remove(groupId);
    }
}

package com.smartsejong.api.domain.timetable.service;

import com.smartsejong.api.common.enums.DayOfWeek;
import com.smartsejong.api.domain.course.entity.Section;
import com.smartsejong.api.domain.course.repository.SectionRepository;
import com.smartsejong.api.domain.group.repository.GroupMemberRepository;
import com.smartsejong.api.domain.timetable.dto.*;
import com.smartsejong.api.domain.timetable.entity.Timetable;
import com.smartsejong.api.domain.timetable.entity.TimetableItem;
import com.smartsejong.api.domain.timetable.repository.TimetableItemRepository;
import com.smartsejong.api.domain.timetable.repository.TimetableRepository;
import com.smartsejong.api.domain.user.entity.User;
import com.smartsejong.api.domain.user.repository.UserRepository;
import com.smartsejong.api.exception.CustomException;
import com.smartsejong.api.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TimetableServiceImpl implements TimetableService {

    private final TimetableRepository timetableRepository;
    private final TimetableItemRepository timetableItemRepository;
    private final SectionRepository sectionRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;

    @Override
    public CreateTimetableResponse create(Long userId, CreateTimetableRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        Timetable saved = timetableRepository.save(
                Timetable.builder().name(request.name()).user(user).build()
        );
        return new CreateTimetableResponse(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TimetableResponse> getAll(Long userId) {
        return timetableRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(t -> TimetableResponse.from(t, false))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TimetableResponse getOne(Long userId, Long timetableId) {
        Timetable timetable = timetableRepository.findByIdWithItems(timetableId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIMETABLE_NOT_FOUND));
        verifyOwner(userId, timetable);
        return TimetableResponse.from(timetable, true);
    }

    @Override
    public void rename(Long userId, Long timetableId, RenameTimetableRequest request) {
        Timetable timetable = findAndVerify(userId, timetableId);
        timetable.rename(request.name());
    }

    @Override
    public void delete(Long userId, Long timetableId) {
        Timetable timetable = findAndVerify(userId, timetableId);
        groupMemberRepository.clearActiveTimetableByTimetableId(timetableId);
        timetableRepository.delete(timetable);
    }

    @Override
    public AddItemResponse addSection(Long userId, Long timetableId, AddSectionItemRequest request) {
        return copySection(userId, timetableId, request.sectionId());
    }

    @Override
    public AddItemResponse copySection(Long userId, Long timetableId, Long sectionId) {
        Timetable timetable = findAndVerify(userId, timetableId);
        Section anchor = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new CustomException(ErrorCode.SECTION_NOT_FOUND));

        List<Section> siblings = sectionRepository.findSiblings(
                anchor.getCourse().getId(), anchor.getSectionNumber(), anchor.getProfessor());
        if (siblings.isEmpty()) siblings = List.of(anchor);

        Long returnId = null;
        for (Section s : siblings) {
            TimetableItem saved = timetableItemRepository.save(
                    TimetableItem.builder()
                            .timetable(timetable)
                            .section(s)
                            .isCustom(false)
                            .isPinned(false)
                            .build()
            );
            if (s.getId().equals(sectionId)) returnId = saved.getId();
        }
        if (returnId == null) returnId = timetableItemRepository
                .save(TimetableItem.builder().timetable(timetable).section(anchor).isCustom(false).isPinned(false).build())
                .getId();
        return new AddItemResponse(returnId);
    }

    @Override
    public AddItemResponse addCustom(Long userId, Long timetableId, AddCustomItemRequest request) {
        Timetable timetable = findAndVerify(userId, timetableId);
        DayOfWeek day = DayOfWeek.fromKor(request.day());
        TimetableItem saved = timetableItemRepository.save(
                TimetableItem.builder()
                        .timetable(timetable)
                        .isCustom(true)
                        .customName(request.name())
                        .customDay(day)
                        .customStart(LocalTime.parse(request.start()))
                        .customEnd(LocalTime.parse(request.end()))
                        .isPinned(false)
                        .build()
        );
        return new AddItemResponse(saved.getId());
    }

    @Override
    public void updateCustom(Long userId, Long itemId, UpdateCustomItemRequest request) {
        TimetableItem item = findItemAndVerify(userId, itemId);
        DayOfWeek day = DayOfWeek.fromKor(request.day());
        item.updateCustomTask(request.name(), day, LocalTime.parse(request.start()), LocalTime.parse(request.end()));
    }

    @Override
    public void deleteItem(Long userId, Long itemId) {
        TimetableItem item = findItemAndVerify(userId, itemId);
        if (!item.isCustom() && item.getSection() != null) {
            Section anchor = item.getSection();
            List<TimetableItem> siblings = timetableItemRepository.findSiblingItems(
                    item.getTimetable().getId(),
                    anchor.getCourse().getId(),
                    anchor.getSectionNumber(),
                    anchor.getProfessor()
            );
            timetableItemRepository.deleteAll(siblings);
        } else {
            timetableItemRepository.delete(item);
        }
    }

    @Override
    public PinToggleResponse togglePin(Long userId, Long itemId, PinToggleRequest request) {
        TimetableItem item = findItemAndVerify(userId, itemId);
        if (item.isPinned() != request.isPinned()) item.togglePin();
        return new PinToggleResponse(item.getId(), item.isPinned());
    }

    private Timetable findAndVerify(Long userId, Long timetableId) {
        Timetable t = timetableRepository.findById(timetableId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIMETABLE_NOT_FOUND));
        verifyOwner(userId, t);
        return t;
    }

    private void verifyOwner(Long userId, Timetable t) {
        if (!t.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.TIMETABLE_ACCESS_DENIED);
        }
    }

    private TimetableItem findItemAndVerify(Long userId, Long itemId) {
        TimetableItem item = timetableItemRepository.findById(itemId)
                .orElseThrow(() -> new CustomException(ErrorCode.TIMETABLE_ITEM_NOT_FOUND));
        verifyOwner(userId, item.getTimetable());
        return item;
    }
}

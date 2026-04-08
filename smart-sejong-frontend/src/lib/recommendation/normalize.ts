/**
 * 백엔드 GroupedSectionResponse → 추천 엔진 내부 타입 변환
 */

import type { GroupedSectionRaw } from '@/types'
import type { RSection, NormalizedSection, CustomBlock, MeetingTime, Day } from './types'
import {
  buildWeeklyMaskFromMeetings,
  buildWeeklyMaskFromCustomBlock,
  getIntervalsByDay,
  timeStringToMinute,
} from './timeMask'

// 요일 한글 → Day 타입 (엔진 기준)
const KOR_TO_DAY: Record<string, Day> = {
  월: '월', 화: '화', 수: '수', 목: '목', 금: '금',
}

/** 방식 판단: 시간 정보 없으면 ONLINE, 있으면 OFFLINE */
function inferDeliveryMode(
  times: GroupedSectionRaw['times'],
): RSection['deliveryMode'] {
  if (!times || times.length === 0) return 'ONLINE'
  return 'OFFLINE'
}

/** GroupedSectionRaw → RSection */
export function toRSection(raw: GroupedSectionRaw): RSection {
  const meetingTimes: MeetingTime[] = (raw.times ?? [])
    .filter((t) => t.dayOfWeekKor && t.startTime && t.endTime)
    .map((t) => ({
      day: KOR_TO_DAY[t.dayOfWeekKor] ?? ('월' as Day),
      startMinute: timeStringToMinute(t.startTime),
      endMinute: timeStringToMinute(t.endTime),
    }))

  return {
    courseId: String(raw.courseId),
    courseName: raw.courseName,
    courseCode: raw.courseCode ?? '',
    sectionId: String(raw.sectionId),
    sectionName: raw.sectionNumber ?? '',
    credits: raw.credits ?? 0,
    meetingTimes,
    deliveryMode: inferDeliveryMode(raw.times),
    professor: raw.professor ?? '',
    categoryDescription: raw.categoryDescription ?? '',
    college: raw.college ?? '',
    department: raw.department ?? '',
  }
}

/** RSection → NormalizedSection (weeklyMask, intervalsByDay 추가) */
export function normalizeSection(section: RSection): NormalizedSection {
  const weeklyMask = buildWeeklyMaskFromMeetings(section.meetingTimes)
  const intervalsByDay = getIntervalsByDay(section.meetingTimes)
  return { ...section, weeklyMask, intervalsByDay }
}

/** GroupedSectionRaw → NormalizedSection (한 번에 변환) */
export function normalizeGroupedSection(raw: GroupedSectionRaw): NormalizedSection {
  return normalizeSection(toRSection(raw))
}

/** GroupedSectionRaw[] → NormalizedSection[] */
export function normalizeCourseData(raws: GroupedSectionRaw[]): NormalizedSection[] {
  return raws.map(normalizeGroupedSection)
}

/** CustomBlock 입력 → weeklyMask 포함 CustomBlock */
export function normalizeCustomBlock(
  id: string,
  title: string,
  day: Day,
  startMinute: number,
  endMinute: number,
): CustomBlock {
  return {
    id,
    title,
    day,
    startMinute,
    endMinute,
    weeklyMask: buildWeeklyMaskFromCustomBlock(day, startMinute, endMinute),
  }
}

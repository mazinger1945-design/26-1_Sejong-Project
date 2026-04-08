/**
 * 15분 단위 슬롯 + 요일별 bigint bitmask 유틸
 *
 * 범위: 08:00 ~ 22:00 → 56 slots (14시간 × 4슬롯)
 * 요일 인덱스: 월=0, 화=1, 수=2, 목=3, 금=4
 * weeklyMask = bigint[5]
 */

import { DAY_KEYS, SLOT_START_HOUR, SLOT_MIN, SLOTS_PER_DAY } from './constants'
import type { Day, MeetingTime } from './types'

// 요일 문자 → 인덱스
const DAY_INDEX: Record<string, number> = {
  월: 0, 화: 1, 수: 2, 목: 3, 금: 4,
}

/** 요일 한글 → index (없으면 -1) */
export function dayToIndex(day: string): number {
  return DAY_INDEX[day] ?? -1
}

/** 분(minute) → slot index (범위 밖이면 clamping) */
export function minuteToSlot(minute: number): number {
  return Math.floor((minute - SLOT_START_HOUR * 60) / SLOT_MIN)
}

/** slot index → 분 */
export function slotToMinute(slot: number): number {
  return SLOT_START_HOUR * 60 + slot * SLOT_MIN
}

/** "HH:MM" 문자열 → 분 */
export function timeStringToMinute(t: string): number {
  const [hStr, mStr] = t.split(':')
  return parseInt(hStr, 10) * 60 + parseInt(mStr, 10)
}

/** 분 → "HH:MM" */
export function minuteToTimeString(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

// ── mask 생성 ────────────────────────────────────────────────

/** [startMinute, endMinute) 범위를 slot mask로 변환 */
function rangeToMask(startMinute: number, endMinute: number): bigint {
  const startSlot = Math.max(0, minuteToSlot(startMinute))
  const endSlot = Math.min(SLOTS_PER_DAY, minuteToSlot(endMinute))
  let mask = 0n
  for (let s = startSlot; s < endSlot; s++) {
    mask |= (1n << BigInt(s))
  }
  return mask
}

/** MeetingTime[] 로부터 weeklyMask bigint[5] 생성 */
export function buildWeeklyMaskFromMeetings(meetings: MeetingTime[]): bigint[] {
  const masks = [0n, 0n, 0n, 0n, 0n]
  for (const mt of meetings) {
    const idx = dayToIndex(mt.day)
    if (idx < 0) continue
    masks[idx] |= rangeToMask(mt.startMinute, mt.endMinute)
  }
  return masks
}

/** 요일 문자열(한글) + 시작/종료 시각(HH:MM) → weeklyMask bigint[5] */
export function buildWeeklyMaskFromRaw(
  day: string,
  startTime: string,
  endTime: string,
): bigint[] {
  const idx = dayToIndex(day)
  const masks = [0n, 0n, 0n, 0n, 0n]
  if (idx < 0) return masks
  const startMin = timeStringToMinute(startTime)
  const endMin = timeStringToMinute(endTime)
  masks[idx] = rangeToMask(startMin, endMin)
  return masks
}

/** CustomBlock(day + startMinute + endMinute) → weeklyMask bigint[5] */
export function buildWeeklyMaskFromCustomBlock(
  day: Day,
  startMinute: number,
  endMinute: number,
): bigint[] {
  const idx = dayToIndex(day)
  const masks = [0n, 0n, 0n, 0n, 0n]
  if (idx < 0) return masks
  masks[idx] = rangeToMask(startMinute, endMinute)
  return masks
}

// ── mask 연산 ────────────────────────────────────────────────

/** 두 weeklyMask 사이에 충돌이 있는지 확인 */
export function hasMaskConflict(a: bigint[], b: bigint[]): boolean {
  for (let i = 0; i < 5; i++) {
    if ((a[i] & b[i]) !== 0n) return true
  }
  return false
}

/** 두 weeklyMask 를 OR 병합 */
export function mergeWeeklyMasks(a: bigint[], b: bigint[]): bigint[] {
  return a.map((v, i) => v | b[i])
}

/** 여러 weeklyMask 를 한꺼번에 병합 */
export function combineWeeklyMasks(masks: bigint[][]): bigint[] {
  const result = [0n, 0n, 0n, 0n, 0n]
  for (const m of masks) {
    for (let i = 0; i < 5; i++) result[i] |= m[i]
  }
  return result
}

// ── 시간 분석 ────────────────────────────────────────────────

/** 요일별로 점유된 연속 구간 목록 반환 [{start, end}[]] (분 단위, 정렬됨) */
export function getIntervalsByDay(
  meetings: MeetingTime[],
): Partial<Record<Day, { start: number; end: number }[]>> {
  const dayMap: Partial<Record<Day, { start: number; end: number }[]>> = {}
  for (const mt of meetings) {
    if (!dayMap[mt.day]) dayMap[mt.day] = []
    dayMap[mt.day]!.push({ start: mt.startMinute, end: mt.endMinute })
  }
  for (const day of DAY_KEYS) {
    dayMap[day]?.sort((a, b) => a.start - b.start)
  }
  return dayMap
}

/** 두 구간 목록을 병합 + 정렬 (overlap/adjacent 구간 합치기) */
export function mergeIntervals(
  a: { start: number; end: number }[],
  b: { start: number; end: number }[],
): { start: number; end: number }[] {
  const all = [...a, ...b].sort((x, y) => x.start - y.start)
  if (!all.length) return []
  const merged: { start: number; end: number }[] = [all[0]]
  for (let i = 1; i < all.length; i++) {
    const last = merged[merged.length - 1]
    if (all[i].start <= last.end) {
      last.end = Math.max(last.end, all[i].end)
    } else {
      merged.push({ ...all[i] })
    }
  }
  return merged
}

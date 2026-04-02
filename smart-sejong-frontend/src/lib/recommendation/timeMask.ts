/**
 * timeMask.ts
 *
 * 시간 충돌 판정 모듈
 *
 * 하루를 30분 단위 슬롯으로 분할하고(09:00~21:00 = 24슬롯),
 * 각 요일별 비트마스크(number)로 점유 슬롯을 표현한다.
 * 충돌 판정은 AND 비트 연산으로 O(days) = O(5)로 처리.
 */

import { SLOT_START_HOUR, SLOT_MIN, SLOTS_PER_DAY, DAY_KEYS } from './constants'
import type { MeetingTime, DayMask } from './types'

/** 'HH:MM' → 슬롯 인덱스 (09:00 = 0, 09:30 = 1, …) */
export function timeToSlot(time: string): number {
  const [h, rest = '0'] = time.split(':')
  const m = parseInt(rest, 10)
  return Math.floor(((parseInt(h, 10) - SLOT_START_HOUR) * 60 + m) / SLOT_MIN)
}

/**
 * MeetingTime 배열 → 요일별 비트마스크 맵
 * 알고리즘: 각 미팅 시간을 슬롯으로 변환 후 비트 OR 누적
 */
export function buildMask(meetingTimes: MeetingTime[]): DayMask {
  const mask: DayMask = {}
  for (const { day, start, end } of meetingTimes) {
    const s = Math.max(0, timeToSlot(start))
    const e = Math.min(SLOTS_PER_DAY, timeToSlot(end))
    let m = mask[day] ?? 0
    for (let i = s; i < e; i++) m |= 1 << i
    mask[day] = m
  }
  return mask
}

/** 단일 블록(요일, 시작, 종료) → 마스크 */
export function buildSingleMask(day: string, start: string, end: string): DayMask {
  return buildMask([{ day, start, end }])
}

/**
 * 두 마스크 충돌 여부 - AND 연산으로 O(5)
 * @returns true이면 시간이 겹침
 */
export function conflicts(a: DayMask, b: DayMask): boolean {
  for (const d of DAY_KEYS) {
    if (a[d] && b[d] && (a[d] & b[d]) !== 0) return true
  }
  return false
}

/** 두 마스크 병합(합집합) */
export function merge(a: DayMask, b: DayMask): DayMask {
  const r: DayMask = { ...a }
  for (const d of DAY_KEYS) {
    if (b[d]) r[d] = (r[d] ?? 0) | b[d]
  }
  return r
}

/** 해당 요일에 점유된 슬롯이 없으면 true */
export function isDayEmpty(mask: DayMask, day: string): boolean {
  return !mask[day]
}

/** 특정 슬롯 구간(from~to)의 점유 슬롯 수 */
export function slotCount(mask: DayMask, day: string, from: number, to: number): number {
  const m = mask[day] ?? 0
  let n = 0
  for (let i = from; i < to; i++) if (m & (1 << i)) n++
  return n
}

/**
 * 요일별로 점유된 연속 구간 목록을 반환 (정렬된 순서)
 * DFS gap 계산에 사용
 */
export function occupiedRanges(mask: DayMask): Record<string, { s: number; e: number }[]> {
  const result: Record<string, { s: number; e: number }[]> = {}
  for (const day of DAY_KEYS) {
    const m = mask[day]
    if (!m) continue
    const ranges: { s: number; e: number }[] = []
    let i = 0
    while (i < SLOTS_PER_DAY) {
      if (m & (1 << i)) {
        const s = i
        while (i < SLOTS_PER_DAY && (m & (1 << i))) i++
        ranges.push({ s, e: i })
      } else {
        i++
      }
    }
    result[day] = ranges
  }
  return result
}

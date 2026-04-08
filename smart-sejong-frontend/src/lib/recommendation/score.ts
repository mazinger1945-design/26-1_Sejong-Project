/**
 * 소프트 조건 점수화
 * 하드 조건 통과한 완성 시간표에 대해서만 호출
 */

import { SCORE_WEIGHTS, DAY_KEYS, MORNING_SLOTS, AFTERNOON_SLOTS, EVENING_SLOTS, GAP_LEVEL_MINUTES } from './constants'
import type { RSection, CustomBlock, RecommendationFilters, ScoreBreakdown, Day } from './types'
import { mergeIntervals } from './timeMask'

// ── 유틸 ────────────────────────────────────────────────────

/** 요일에 수업이 있는지 (customBlocks 포함 여부 제어) */
function getSectionMinutesByDay(sections: RSection[]): Map<Day, { start: number; end: number }[]> {
  const map = new Map<Day, { start: number; end: number }[]>()
  for (const sec of sections) {
    for (const mt of sec.meetingTimes) {
      if (!map.has(mt.day)) map.set(mt.day, [])
      map.get(mt.day)!.push({ start: mt.startMinute, end: mt.endMinute })
    }
  }
  return map
}

function getAllBlocksByDay(
  sections: RSection[],
  customBlocks: CustomBlock[],
): Map<Day, { start: number; end: number }[]> {
  const map = getSectionMinutesByDay(sections)
  for (const blk of customBlocks) {
    if (!map.has(blk.day)) map.set(blk.day, [])
    map.get(blk.day)!.push({ start: blk.startMinute, end: blk.endMinute })
  }
  return map
}

// ── 각 점수 계산 ─────────────────────────────────────────────

function scoreFreeDay(
  filters: RecommendationFilters,
  sections: RSection[],
): number {
  const { preferredFreeDays } = filters
  if (!preferredFreeDays.length) return 0

  const byDay = getSectionMinutesByDay(sections)
  let matched = 0
  for (const d of preferredFreeDays) {
    const intervals = byDay.get(d)
    if (!intervals || intervals.length === 0) matched++
  }
  return SCORE_WEIGHTS.FREE_DAY * (matched / preferredFreeDays.length)
}

function scoreTimePreference(
  filters: RecommendationFilters,
  sections: RSection[],
): number {
  const { timePreference } = filters
  const { morning, afternoon, evening } = timePreference

  // active bands (NEUTRAL 제외)
  const bands: Array<{ pref: 'PREFER' | 'DISLIKE'; slots: { start: number; end: number } }> = []
  if (morning !== 'NEUTRAL') bands.push({ pref: morning as 'PREFER' | 'DISLIKE', slots: MORNING_SLOTS })
  if (afternoon !== 'NEUTRAL') bands.push({ pref: afternoon as 'PREFER' | 'DISLIKE', slots: AFTERNOON_SLOTS })
  if (evening !== 'NEUTRAL') bands.push({ pref: evening as 'PREFER' | 'DISLIKE', slots: EVENING_SLOTS })

  if (!bands.length) return 0

  // 전체 수업 시간(분) 계산
  let totalMin = 0
  const slotMin = 15 // 슬롯 단위(분)
  const minutesByBand = { morning: 0, afternoon: 0, evening: 0 }

  for (const sec of sections) {
    for (const mt of sec.meetingTimes) {
      const duration = mt.endMinute - mt.startMinute
      totalMin += duration

      // slot 기반 대신 분 범위로 band 판정
      const morningEnd = 12 * 60
      const afternoonEnd = 17 * 60
      const eveningEnd = 21 * 60
      const start = mt.startMinute
      const end = mt.endMinute

      // morning overlap [09:00, 12:00)
      const mStart = Math.max(start, 9 * 60), mEnd = Math.min(end, morningEnd)
      if (mEnd > mStart) minutesByBand.morning += mEnd - mStart
      // afternoon overlap [12:00, 17:00)
      const aStart = Math.max(start, morningEnd), aEnd = Math.min(end, afternoonEnd)
      if (aEnd > aStart) minutesByBand.afternoon += aEnd - aStart
      // evening overlap [17:00, 21:00)
      const eStart = Math.max(start, afternoonEnd), eEnd = Math.min(end, eveningEnd)
      if (eEnd > eStart) minutesByBand.evening += eEnd - eStart
    }
  }
  void slotMin // suppress unused

  if (totalMin === 0) return 0

  const bandWeight = SCORE_WEIGHTS.TIME_PREFERENCE / bands.length
  let score = 0
  for (const { pref, slots: _slots } of bands) {
    const bandKey = _slots === MORNING_SLOTS ? 'morning'
      : _slots === AFTERNOON_SLOTS ? 'afternoon' : 'evening'
    const ratio = minutesByBand[bandKey] / totalMin
    const satisfaction = pref === 'PREFER' ? ratio : (1 - ratio)
    score += bandWeight * satisfaction
  }
  return score
}

function scoreGap(
  filters: RecommendationFilters,
  sections: RSection[],
  customBlocks: CustomBlock[],
): number {
  const { allowedGapLevel } = filters
  const allowedMinutes = GAP_LEVEL_MINUTES[allowedGapLevel]

  if (allowedGapLevel === 3) return SCORE_WEIGHTS.GAP

  const byDay = getAllBlocksByDay(sections, customBlocks)
  let totalGaps = 0
  let oversizeGaps = 0

  for (const day of DAY_KEYS) {
    const intervals = byDay.get(day)
    if (!intervals || intervals.length < 2) continue
    const merged = mergeIntervals(intervals, [])
    for (let i = 1; i < merged.length; i++) {
      const gap = merged[i].start - merged[i - 1].end
      totalGaps++
      if (gap > allowedMinutes) oversizeGaps++
    }
  }

  if (totalGaps === 0) return SCORE_WEIGHTS.GAP
  return SCORE_WEIGHTS.GAP * (1 - oversizeGaps / totalGaps)
}

function scoreLunch(
  filters: RecommendationFilters,
  sections: RSection[],
  customBlocks: CustomBlock[],
): number {
  if (!filters.needsLunchBreak) return 0

  const byDay = getAllBlocksByDay(sections, customBlocks)
  let activeDays = 0
  let satisfiedDays = 0

  const lunchStart = 12 * 60
  const lunchEnd = 14 * 60
  const neededFree = 60

  for (const day of DAY_KEYS) {
    const intervals = byDay.get(day)
    if (!intervals || intervals.length === 0) continue
    activeDays++

    const merged = mergeIntervals(intervals, [])
    // 점심 구간 내 빈 구간 계산
    let freeStart = lunchStart
    let maxFree = 0
    for (const seg of merged) {
      if (seg.start >= lunchEnd) break
      const occupyStart = Math.max(seg.start, lunchStart)
      const occupyEnd = Math.min(seg.end, lunchEnd)
      if (occupyStart > freeStart) maxFree = Math.max(maxFree, occupyStart - freeStart)
      if (occupyEnd > freeStart) freeStart = occupyEnd
    }
    maxFree = Math.max(maxFree, lunchEnd - freeStart)
    if (maxFree >= neededFree) satisfiedDays++
  }

  if (activeDays === 0) return SCORE_WEIGHTS.LUNCH
  return SCORE_WEIGHTS.LUNCH * (satisfiedDays / activeDays)
}

function scoreDelivery(
  filters: RecommendationFilters,
  sections: RSection[],
): number {
  const { deliveryPreference } = filters
  if (deliveryPreference === 'ANY') return 0

  const totalCredits = sections.reduce((s, r) => s + r.credits, 0)
  if (totalCredits === 0) return 0

  let onlineCredits = 0
  let offlineCredits = 0
  let mixedCredits = 0
  for (const sec of sections) {
    if (sec.deliveryMode === 'ONLINE') onlineCredits += sec.credits
    else if (sec.deliveryMode === 'OFFLINE') offlineCredits += sec.credits
    else if (sec.deliveryMode === 'MIXED') mixedCredits += sec.credits
  }

  const satisfaction =
    deliveryPreference === 'ONLINE_PREFER'
      ? (onlineCredits + 0.5 * mixedCredits) / totalCredits
      : (offlineCredits + 0.5 * mixedCredits) / totalCredits

  return SCORE_WEIGHTS.DELIVERY * satisfaction
}

// ── 통합 점수 계산 ───────────────────────────────────────────

/**
 * 활성화된 항목 가중치 합 계산
 * ※ majorMinCount는 엔진에서 하드 조건으로 처리하므로 소프트 점수에서 제외
 */
function activeWeightSum(filters: RecommendationFilters): number {
  let sum = SCORE_WEIGHTS.GAP // 항상 활성
  if (filters.preferredFreeDays.length > 0) sum += SCORE_WEIGHTS.FREE_DAY
  const { morning, afternoon, evening } = filters.timePreference
  if (morning !== 'NEUTRAL' || afternoon !== 'NEUTRAL' || evening !== 'NEUTRAL') {
    sum += SCORE_WEIGHTS.TIME_PREFERENCE
  }
  if (filters.needsLunchBreak) sum += SCORE_WEIGHTS.LUNCH
  if (filters.deliveryPreference !== 'ANY') sum += SCORE_WEIGHTS.DELIVERY
  return sum
}

export function scoreSchedule(
  allSections: RSection[],  // fixed + newly selected
  customBlocks: CustomBlock[],
  filters: RecommendationFilters,
): ScoreBreakdown {
  const freeDay = scoreFreeDay(filters, allSections)
  const timePreference = scoreTimePreference(filters, allSections)
  const gap = scoreGap(filters, allSections, customBlocks)
  const lunch = scoreLunch(filters, allSections, customBlocks)
  const delivery = scoreDelivery(filters, allSections)
  // major은 엔진에서 하드 조건으로 처리 → 소프트 점수는 0 (표시용)
  const major = 0

  const earned = freeDay + timePreference + gap + lunch + delivery
  const maxPossible = activeWeightSum(filters)
  const total = maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 0

  return { freeDay, timePreference, gap, lunch, delivery, major, total }
}

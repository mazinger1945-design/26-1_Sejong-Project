/**
 * score.ts
 *
 * 소프트 조건 점수 계산 모듈.
 *
 * 점수 체계 (총 100점):
 *   - 공강 희망 요일 만족:     30점
 *   - 시간대 선호 반영:        25점
 *   - 강의 사이 공백 허용:     20점
 *   - 점심시간 확보:           15점
 *   - 온/오프라인 선호:        10점
 */

import {
  SCORE_WEIGHTS,
  MORNING,
  AFTERNOON,
  EVENING,
  LUNCH,
  GAP_MINUTES,
  SLOT_MIN,
  DAY_KEYS,
} from './constants'
import {
  buildMask,
  isDayEmpty,
  slotCount,
  occupiedRanges,
  merge,
} from './timeMask'
import type {
  SectionCandidate,
  FixedSection,
  CustomBlock,
  RecommendationConditions,
  ScoreBreakdown,
  DayMask,
  GapLevel,
} from './types'

/**
 * 완성된 시간표(고정 항목 + 선택 분반)에 대해 소프트 조건 점수를 계산.
 * 하드 조건은 이미 통과된 상태라고 가정.
 */
export function scoreSchedule(
  selectedSections: SectionCandidate[],
  conditions: RecommendationConditions,
  fixedSections: FixedSection[],
  fixedCustomBlocks: CustomBlock[]
): ScoreBreakdown {
  // 전체 점유 마스크 = 고정 분반 + 고정 일정 + 선택 분반
  let combinedMask: DayMask = {}
  for (const fs of fixedSections) combinedMask = merge(combinedMask, fs.mask)
  for (const cb of fixedCustomBlocks) combinedMask = merge(combinedMask, cb.mask)
  for (const s of selectedSections) combinedMask = merge(combinedMask, buildMask(s.meetingTimes))

  // 점수 계산에 쓸 전체 분반 목록 (고정 포함)
  const allSections = [...fixedSections.map((fs) => fs.section), ...selectedSections]

  const freeDayScore = calcFreeDayScore(combinedMask, conditions.preferredFreeDays)
  const timePreferenceScore = calcTimePreferenceScore(combinedMask, conditions.timePreference)
  const gapScore = calcGapScore(combinedMask, conditions.allowedGapLevel)
  const lunchScore = calcLunchScore(combinedMask, conditions.needsLunchBreak)
  const deliveryScore = calcDeliveryScore(allSections, conditions.deliveryPreference)

  const total = freeDayScore + timePreferenceScore + gapScore + lunchScore + deliveryScore
  return { freeDayScore, timePreferenceScore, gapScore, lunchScore, deliveryScore, total }
}

// ── 개별 점수 계산 함수 ─────────────────────────────────────

/** 공강 희망 요일 만족도 */
function calcFreeDayScore(mask: DayMask, preferredFreeDays: string[]): number {
  if (preferredFreeDays.length === 0) return SCORE_WEIGHTS.FREE_DAY
  const freeCount = preferredFreeDays.filter((d) => isDayEmpty(mask, d)).length
  return Math.round((freeCount / preferredFreeDays.length) * SCORE_WEIGHTS.FREE_DAY)
}

/**
 * 시간대 선호 반영 점수
 * PREFER 구간에 수업이 많을수록 가점, DISLIKE 구간에 많을수록 감점
 */
function calcTimePreferenceScore(
  mask: DayMask,
  timePreference: RecommendationConditions['timePreference']
): number {
  const totalSlots = DAY_KEYS.reduce((sum, d) => {
    const m = mask[d] ?? 0
    let cnt = 0
    for (let i = 0; i < 24; i++) if (m & (1 << i)) cnt++
    return sum + cnt
  }, 0)

  if (totalSlots === 0) return SCORE_WEIGHTS.TIME_PREFERENCE

  const zones = [
    { range: MORNING, pref: timePreference.morning },
    { range: AFTERNOON, pref: timePreference.afternoon },
    { range: EVENING, pref: timePreference.evening },
  ]

  let score = 0
  const perZone = SCORE_WEIGHTS.TIME_PREFERENCE / 3

  for (const { range, pref } of zones) {
    if (pref === 'NEUTRAL') {
      score += perZone
      continue
    }
    const zoneSlots = DAY_KEYS.reduce(
      (sum, d) => sum + slotCount(mask, d, range.start, range.end),
      0
    )
    const ratio = zoneSlots / totalSlots
    // PREFER: ratio 높을수록 가점 / DISLIKE: ratio 높을수록 감점
    const factor = pref === 'PREFER' ? 0.5 + ratio * 0.5 : 0.5 - ratio * 0.5
    score += perZone * factor
  }

  return Math.round(Math.max(0, score))
}

/**
 * 강의 사이 공백 허용 시간 만족도.
 * 일별로 연속 블록 사이의 gap을 계산하여 허용 범위와 비교.
 */
function calcGapScore(mask: DayMask, allowedGapLevel: GapLevel): number {
  const maxGap = GAP_MINUTES[allowedGapLevel]
  const ranges = occupiedRanges(mask)

  let checks = 0
  let violations = 0

  for (const day of DAY_KEYS) {
    const dayRanges = ranges[day]
    if (!dayRanges || dayRanges.length <= 1) continue

    for (let i = 0; i + 1 < dayRanges.length; i++) {
      const gapMin = (dayRanges[i + 1].s - dayRanges[i].e) * SLOT_MIN
      checks++
      if (allowedGapLevel === 0) {
        // 연강 선호: gap이 0이 아니면 위반
        if (gapMin > 0) violations++
      } else if (maxGap < 999_999) {
        if (gapMin > maxGap) violations++
      }
      // allowedGapLevel === 3 (제한 없음): 위반 없음
    }
  }

  if (checks === 0) return SCORE_WEIGHTS.GAP
  return Math.round(((checks - violations) / checks) * SCORE_WEIGHTS.GAP)
}

/**
 * 점심시간 확보 점수 (12:00~14:00 중 1시간 이상 여유)
 * needsLunchBreak = false 이면 만점 반환
 */
function calcLunchScore(mask: DayMask, needsLunchBreak: boolean): number {
  if (!needsLunchBreak) return SCORE_WEIGHTS.LUNCH

  const activeDays = DAY_KEYS.filter((d) => mask[d])
  if (activeDays.length === 0) return SCORE_WEIGHTS.LUNCH

  let satisfied = 0
  for (const day of activeDays) {
    const m = mask[day] ?? 0
    // 점심 슬롯(6~9) 중 연속 2슬롯(=1시간) 이상 비어 있으면 만족
    for (let s = LUNCH.start; s + 1 < LUNCH.end; s++) {
      if (!(m & (1 << s)) && !(m & (1 << (s + 1)))) {
        satisfied++
        break
      }
    }
  }
  return Math.round((satisfied / activeDays.length) * SCORE_WEIGHTS.LUNCH)
}

/** 온/오프라인 선호 점수 */
function calcDeliveryScore(
  sections: SectionCandidate[],
  preference: RecommendationConditions['deliveryPreference']
): number {
  if (preference === 'ANY' || sections.length === 0) return SCORE_WEIGHTS.DELIVERY

  const onlineCount = sections.filter((s) => s.deliveryMode === 'ONLINE').length
  const offlineCount = sections.filter((s) => s.deliveryMode === 'OFFLINE').length
  const total = sections.length

  if (preference === 'ONLINE_PREFER') {
    return Math.round((onlineCount / total) * SCORE_WEIGHTS.DELIVERY)
  }
  return Math.round((offlineCount / total) * SCORE_WEIGHTS.DELIVERY)
}

/**
 * 추천 이유 텍스트 생성.
 * 점수 계산 결과를 사람이 읽기 쉬운 문장으로 변환.
 */
export function buildReasons(
  selectedSections: SectionCandidate[],
  conditions: RecommendationConditions,
  fixedSections: FixedSection[],
  fixedCustomBlocks: CustomBlock[],
  score: ScoreBreakdown
): string[] {
  const reasons: string[] = []

  let combinedMask: DayMask = {}
  for (const fs of fixedSections) combinedMask = merge(combinedMask, fs.mask)
  for (const cb of fixedCustomBlocks) combinedMask = merge(combinedMask, cb.mask)
  for (const s of selectedSections) combinedMask = merge(combinedMask, buildMask(s.meetingTimes))

  // 공강 요일
  const freeDays = conditions.preferredFreeDays.filter((d) => isDayEmpty(combinedMask, d))
  if (freeDays.length > 0) reasons.push(`${freeDays.join(', ')}요일 공강 반영`)

  // 시간대
  const { morning, afternoon, evening } = conditions.timePreference
  if (morning === 'PREFER') reasons.push('오전 수업 위주')
  if (afternoon === 'PREFER') reasons.push('오후 수업 위주')
  if (evening === 'DISLIKE') reasons.push('저녁 수업 최소화')

  // 공백
  const gapLabels: Record<number, string> = {
    0: '연강 위주',
    1: '강의 사이 공백 1시간 이하',
    2: '강의 사이 공백 2시간 이하',
    3: '강의 사이 공백 여유 있음',
  }
  if (score.gapScore >= SCORE_WEIGHTS.GAP * 0.8) reasons.push(gapLabels[conditions.allowedGapLevel])

  // 점심
  if (conditions.needsLunchBreak && score.lunchScore >= SCORE_WEIGHTS.LUNCH * 0.6) {
    reasons.push('점심시간 확보')
  }

  // 온/오프라인
  if (conditions.deliveryPreference === 'ONLINE_PREFER') reasons.push('온라인 비중이 높음')
  if (conditions.deliveryPreference === 'OFFLINE_PREFER') reasons.push('오프라인 비중이 높음')

  if (reasons.length === 0) reasons.push('조건을 고려한 최적 조합')

  return reasons
}

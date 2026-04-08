/**
 * 추천 이유 자동 생성
 */

import type { RSection, RecommendationFilters, ScoreBreakdown, Day } from './types'
import { SCORE_WEIGHTS } from './constants'
import { hasMajorClassificationContext, isMajorCourseForUser } from './majorDetermination'

/** 공강 만족도 계산 (0~1) */
function freeDaySatisfaction(filters: RecommendationFilters, sections: RSection[]): number {
  const { preferredFreeDays } = filters
  if (!preferredFreeDays.length) return 0
  const busyDays = new Set<Day>()
  for (const sec of sections) {
    for (const mt of sec.meetingTimes) busyDays.add(mt.day)
  }
  const matched = preferredFreeDays.filter((d) => !busyDays.has(d)).length
  return matched / preferredFreeDays.length
}

/** 배달 만족도 계산 */
function deliverySatisfaction(filters: RecommendationFilters, sections: RSection[]): number {
  const { deliveryPreference } = filters
  if (deliveryPreference === 'ANY') return 0
  const total = sections.reduce((s, r) => s + r.credits, 0)
  if (total === 0) return 0
  let online = 0, offline = 0, mixed = 0
  for (const sec of sections) {
    if (sec.deliveryMode === 'ONLINE') online += sec.credits
    else if (sec.deliveryMode === 'OFFLINE') offline += sec.credits
    else if (sec.deliveryMode === 'MIXED') mixed += sec.credits
  }
  return deliveryPreference === 'ONLINE_PREFER'
    ? (online + 0.5 * mixed) / total
    : (offline + 0.5 * mixed) / total
}

export function buildRecommendationReasons(
  allSections: RSection[],
  filters: RecommendationFilters,
  score: ScoreBreakdown,
): string[] {
  const reasons: string[] = []

  // 공강 희망 요일
  if (filters.preferredFreeDays.length > 0) {
    const sat = freeDaySatisfaction(filters, allSections)
    if (sat >= 1.0) reasons.push('공강 희망 요일 100% 반영')
    else if (sat >= 0.5) reasons.push(`공강 희망 요일 ${Math.round(sat * 100)}% 반영`)
  }

  // 시간대 선호
  const { morning, afternoon, evening } = filters.timePreference
  const timePct = score.timePreference / SCORE_WEIGHTS.TIME_PREFERENCE
  if (morning === 'DISLIKE' && timePct >= 0.7) reasons.push('아침 수업 최소화')
  if (evening === 'DISLIKE' && timePct >= 0.7) reasons.push('저녁 수업 최소화')
  if (morning === 'PREFER' && timePct >= 0.7) reasons.push('오전 수업 위주 구성')
  if (afternoon === 'PREFER' && timePct >= 0.7) reasons.push('오후 수업 위주 구성')

  // 점심시간 확보
  if (filters.needsLunchBreak) {
    const lunchPct = score.lunch / SCORE_WEIGHTS.LUNCH
    if (lunchPct >= 0.8) reasons.push('점심시간 확보')
  }

  // 공백 시간
  const gapPct = score.gap / SCORE_WEIGHTS.GAP
  if (gapPct >= 0.9) reasons.push('강의 사이 공백 최소화')

  // 온라인/오프라인 선호
  if (filters.deliveryPreference !== 'ANY') {
    const dSat = deliverySatisfaction(filters, allSections)
    if (filters.deliveryPreference === 'ONLINE_PREFER' && dSat >= 0.7) {
      reasons.push('온라인 수업 비중 높음')
    }
    if (filters.deliveryPreference === 'OFFLINE_PREFER' && dSat >= 0.7) {
      reasons.push('오프라인 수업 비중 높음')
    }
  }

  // 전공 과목 수
  if (filters.majorMinCount > 0 && hasMajorClassificationContext(filters.userMajor)) {
    const { userMajor } = filters
    const majorCount = allSections.filter((s) =>
      isMajorCourseForUser(s.college ?? '', s.department ?? '', s.categoryDescription ?? '', userMajor),
    ).length
    reasons.push(`전공 과목 ${majorCount}개 포함`)
  }

  // 최소 2개 보장 (총점 기반 fallback)
  if (reasons.length === 0) {
    reasons.push(`종합 점수 ${score.total}점`)
  }
  if (reasons.length === 1) {
    reasons.push(`추천 분반 ${allSections.length}개 구성`)
  }

  return reasons.slice(0, 5)
}

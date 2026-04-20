/**
 * 추천 시작 전 하드 조건 검증
 */

import type { FixedSection, CustomBlock, ValidationError, RecommendationFilters } from './types'
import { hasMaskConflict, combineWeeklyMasks } from './timeMask'

export function validateFixedItems(
  filters: RecommendationFilters,
): ValidationError[] {
  const { fixedSections, customBlocks, excludedCourseIds, creditRange } = filters
  const errors: ValidationError[] = []

  // 1. creditRange 유효성
  if (creditRange.min > creditRange.max) {
    errors.push({ type: 'CREDIT_RANGE_INVALID', message: '희망 학점 범위를 다시 확인해주세요.' })
  }

  // 2. 고정 분반끼리 시간 충돌
  for (let i = 0; i < fixedSections.length; i++) {
    for (let j = i + 1; j < fixedSections.length; j++) {
      if (hasMaskConflict(fixedSections[i].weeklyMask, fixedSections[j].weeklyMask)) {
        errors.push({
          type: 'SECTION_SECTION_CONFLICT',
          message: `"${fixedSections[i].courseName}" 분반과 "${fixedSections[j].courseName}" 분반의 시간이 겹칩니다.`,
        })
      }
    }
  }

  // 3. 고정 분반과 사용자 일정 충돌
  for (const sec of fixedSections) {
    for (const blk of customBlocks) {
      if (hasMaskConflict(sec.weeklyMask, blk.weeklyMask)) {
        errors.push({
          type: 'SECTION_CUSTOM_CONFLICT',
          message: `"${sec.courseName}" 분반과 "${blk.title}" 일정이 겹칩니다.`,
        })
      }
    }
  }

  // 4. 사용자 일정끼리 충돌
  for (let i = 0; i < customBlocks.length; i++) {
    for (let j = i + 1; j < customBlocks.length; j++) {
      if (hasMaskConflict(customBlocks[i].weeklyMask, customBlocks[j].weeklyMask)) {
        errors.push({
          type: 'CUSTOM_CUSTOM_CONFLICT',
          message: `"${customBlocks[i].title}" 일정과 "${customBlocks[j].title}" 일정이 겹칩니다.`,
        })
      }
    }
  }

  // 5. 고정 분반 courseId가 제외 과목에 포함되는지
  for (const sec of fixedSections) {
    if (excludedCourseIds.includes(sec.courseId)) {
      errors.push({
        type: 'EXCLUDED_CONFLICT',
        message: `필수 포함 분반 "${sec.courseName}"이(가) 제외 과목에 추가되어 있습니다.`,
      })
    }
  }

  // 6. 고정 분반 학점 합 > maxCredits
  const fixedCredits = fixedSections.reduce((s, f) => s + f.credits, 0)
  if (fixedCredits > creditRange.max) {
    errors.push({
      type: 'CREDIT_EXCEED',
      message: `고정한 분반 학점 합(${fixedCredits}학점)이 최대 희망 학점(${creditRange.max}학점)을 초과했습니다.`,
    })
  }

  return errors
}

/** 고정 항목들로부터 초기 weeklyMask 생성 */
export function buildInitialMask(
  fixedSections: FixedSection[],
  customBlocks: CustomBlock[],
): bigint[] {
  return combineWeeklyMasks([
    ...fixedSections.map((s) => s.weeklyMask),
    ...customBlocks.map((b) => b.weeklyMask),
  ])
}

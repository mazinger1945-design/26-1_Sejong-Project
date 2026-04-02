/**
 * validate.ts
 *
 * 하드 조건 검증 로직
 * - 고정 분반끼리 충돌 검사
 * - 고정 분반 ↔ 사용자 일정 충돌 검사
 * - 사용자 일정끼리 충돌 검사
 * - 고정 학점 합이 최대 학점 초과 여부
 */

import { conflicts } from './timeMask'
import type { FixedSection, CustomBlock, ValidationError, DayMask } from './types'

/**
 * 고정 항목 전체 유효성 검사.
 * 추천 시작 전 또는 실시간으로 호출.
 */
export function validateFixedItems(
  fixedSections: FixedSection[],
  fixedCustomBlocks: CustomBlock[],
  creditRange: { min: number; max: number }
): ValidationError[] {
  const errors: ValidationError[] = []

  // 1. 고정 분반들끼리 충돌 검사
  for (let i = 0; i < fixedSections.length; i++) {
    for (let j = i + 1; j < fixedSections.length; j++) {
      if (conflicts(fixedSections[i].mask, fixedSections[j].mask)) {
        errors.push({
          type: 'SECTION_CONFLICT',
          message: `"${fixedSections[i].section.courseName} ${fixedSections[i].section.sectionName}"과 "${fixedSections[j].section.courseName} ${fixedSections[j].section.sectionName}"이 시간이 겹칩니다.`,
        })
      }
    }
  }

  // 2. 고정 분반 ↔ 사용자 정의 일정 충돌
  for (const fs of fixedSections) {
    for (const cb of fixedCustomBlocks) {
      if (conflicts(fs.mask, cb.mask)) {
        errors.push({
          type: 'CUSTOM_CONFLICT',
          message: `"${fs.section.courseName}"과 "${cb.title}" 일정이 시간이 겹칩니다.`,
        })
      }
    }
  }

  // 3. 사용자 정의 일정끼리 충돌
  for (let i = 0; i < fixedCustomBlocks.length; i++) {
    for (let j = i + 1; j < fixedCustomBlocks.length; j++) {
      if (conflicts(fixedCustomBlocks[i].mask, fixedCustomBlocks[j].mask)) {
        errors.push({
          type: 'CUSTOM_CONFLICT',
          message: `"${fixedCustomBlocks[i].title}"와 "${fixedCustomBlocks[j].title}" 일정이 겹칩니다.`,
        })
      }
    }
  }

  // 4. 고정 분반 학점 합 > 최대 학점
  const fixedCredits = fixedSections.reduce((s, fs) => s + fs.section.credits, 0)
  if (fixedCredits > creditRange.max) {
    errors.push({
      type: 'CREDIT_EXCEED',
      message: `고정 분반 총 학점(${fixedCredits}학점)이 최대 희망 학점(${creditRange.max}학점)을 초과합니다.`,
    })
  }

  return errors
}

/**
 * 새 분반을 추가할 때 기존 고정 항목과의 충돌 여부 즉시 확인.
 * @returns 충돌 메시지 | null
 */
export function checkNewSectionConflict(
  newMask: DayMask,
  fixedSections: FixedSection[],
  fixedCustomBlocks: CustomBlock[]
): string | null {
  for (const fs of fixedSections) {
    if (conflicts(newMask, fs.mask)) {
      return `"${fs.section.courseName} ${fs.section.sectionName}"과 시간이 겹칩니다.`
    }
  }
  for (const cb of fixedCustomBlocks) {
    if (conflicts(newMask, cb.mask)) {
      return `"${cb.title}" 일정과 시간이 겹칩니다.`
    }
  }
  return null
}

/**
 * 새 사용자 정의 일정 추가 시 충돌 여부 확인.
 */
export function checkNewCustomBlockConflict(
  newMask: DayMask,
  fixedSections: FixedSection[],
  fixedCustomBlocks: CustomBlock[]
): string | null {
  return checkNewSectionConflict(newMask, fixedSections, fixedCustomBlocks)
}

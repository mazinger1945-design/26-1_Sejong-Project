/**
 * candidate pool 전처리 / 필터링 / 과목 그룹화
 */

import type { NormalizedSection, FixedSection, CustomBlock, CourseGroup } from './types'
import { hasMaskConflict } from './timeMask'

interface FilterOptions {
  candidateSections: NormalizedSection[]
  fixedSections: FixedSection[]
  customBlocks: CustomBlock[]
  excludedCourseIds: string[]
}

/** 초기 고정 mask (fixed + custom 합산) */
function buildFixedMask(
  fixedSections: FixedSection[],
  customBlocks: CustomBlock[],
): bigint[] {
  const mask = [0n, 0n, 0n, 0n, 0n]
  for (const s of fixedSections) for (let i = 0; i < 5; i++) mask[i] |= s.weeklyMask[i]
  for (const b of customBlocks) for (let i = 0; i < 5; i++) mask[i] |= b.weeklyMask[i]
  return mask
}

export function filterCandidates(opts: FilterOptions): NormalizedSection[] {
  const { candidateSections, fixedSections, customBlocks, excludedCourseIds } = opts

  const fixedCourseIds = new Set(fixedSections.map((s) => s.courseId))
  const fixedSectionIds = new Set(fixedSections.map((s) => s.sectionId))
  const fixedMask = buildFixedMask(fixedSections, customBlocks)

  // 중복 sectionId 제거용 세트
  const seenSectionId = new Set<string>()

  return candidateSections.filter((sec) => {
    // 이미 처리한 sectionId
    if (seenSectionId.has(sec.sectionId)) return false
    seenSectionId.add(sec.sectionId)

    // 제외 과목
    if (excludedCourseIds.includes(sec.courseId)) return false

    // 이미 고정된 분반은 제외
    if (fixedSectionIds.has(sec.sectionId)) return false

    // 고정 과목의 다른 분반 제외
    if (fixedCourseIds.has(sec.courseId)) return false

    // meetingTimes 없고 학점 이상한 데이터 제외 (0학점 과목은 허용)
    if (sec.credits < 0) return false

    // 시간 충돌 검사
    if (hasMaskConflict(fixedMask, sec.weeklyMask)) return false

    return true
  })
}

/** courseId 기준 그룹화 + 분반 수 오름차순 정렬 */
export function buildCourseGroups(sections: NormalizedSection[]): CourseGroup[] {
  const map = new Map<string, NormalizedSection[]>()
  for (const s of sections) {
    if (!map.has(s.courseId)) map.set(s.courseId, [])
    map.get(s.courseId)!.push(s)
  }

  return Array.from(map.entries())
    .map(([courseId, secs]) => ({
      courseId,
      courseName: secs[0].courseName,
      sections: secs,
    }))
    .sort((a, b) => a.sections.length - b.sections.length)
}

/** 각 index 이후의 최대 획득 가능 학점 (prefix sum 방식) */
export function buildSuffixMaxCredits(groups: CourseGroup[]): number[] {
  const n = groups.length
  const suffix = new Array<number>(n + 1).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    const maxInGroup = Math.max(...groups[i].sections.map((s) => s.credits), 0)
    suffix[i] = suffix[i + 1] + maxInGroup
  }
  return suffix
}

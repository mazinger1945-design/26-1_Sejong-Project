/**
 * filter.ts
 *
 * 추천 후보 풀(candidate pool) 필터링 모듈.
 *
 * 처리 순서:
 * 1. 제외 과목 제거
 * 2. 이미 고정된 과목의 다른 분반 제거
 * 3. 고정 분반/일정과 시간 충돌하는 분반 제거
 * 4. courseId 기준으로 그룹화
 * 5. 그룹 정렬 (분반 수 적은 순 → pruning 효율 향상)
 */

import { conflicts, merge } from './timeMask'
import type {
  SectionCandidate,
  FixedSection,
  CustomBlock,
  CandidateGroup,
  DayMask,
} from './types'
import { buildMask } from './timeMask'

interface FilterInput {
  pool: SectionCandidate[]
  fixedSections: FixedSection[]
  fixedCustomBlocks: CustomBlock[]
  excludedCourseIds: number[]
}

/**
 * candidate pool을 필터링하고 과목 그룹으로 반환.
 * DFS 탐색 입력으로 사용.
 */
export function filterCandidates({
  pool,
  fixedSections,
  fixedCustomBlocks,
  excludedCourseIds,
}: FilterInput): CandidateGroup[] {
  // 이미 고정된 과목 ID 집합 (해당 과목의 다른 분반은 탐색 불필요)
  const fixedCourseIds = new Set(fixedSections.map((fs) => fs.section.courseId))
  const excludedSet = new Set(excludedCourseIds)

  // 고정 항목들의 통합 마스크 (고정 분반 + 사용자 일정)
  let combinedFixedMask: DayMask = {}
  for (const fs of fixedSections) combinedFixedMask = merge(combinedFixedMask, fs.mask)
  for (const cb of fixedCustomBlocks) combinedFixedMask = merge(combinedFixedMask, cb.mask)

  // 과목 그룹 맵
  const grouped = new Map<number, SectionCandidate[]>()

  for (const section of pool) {
    if (excludedSet.has(section.courseId)) continue   // 제외 과목
    if (fixedCourseIds.has(section.courseId)) continue // 이미 고정된 과목

    const sectionMask = buildMask(section.meetingTimes)
    if (conflicts(sectionMask, combinedFixedMask)) continue // 고정 항목과 충돌

    const existing = grouped.get(section.courseId) ?? []
    existing.push(section)
    grouped.set(section.courseId, existing)
  }

  const groups: CandidateGroup[] = Array.from(grouped.entries()).map(
    ([courseId, sections]) => ({
      courseId,
      courseName: sections[0].courseName,
      sections,
    })
  )

  // 분반 수 적은 그룹을 앞에 배치 → 조기 가지치기(pruning) 효과 향상
  groups.sort((a, b) => a.sections.length - b.sections.length)

  return groups
}

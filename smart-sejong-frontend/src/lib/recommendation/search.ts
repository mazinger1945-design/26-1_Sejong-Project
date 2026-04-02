/**
 * search.ts
 *
 * 분반/과목 검색 서비스
 *
 * TODO: 백엔드에 아래 엔드포인트 구현 후 API 호출로 교체
 *   - GET /api/courses/sections/search?q=<keyword>
 *     → SectionCandidate[] (courseId, courseName, credits 포함) 반환
 *   - 기존 /api/courses/search는 CourseMaster[] 반환 (과목 제외용으로 유지)
 *
 * 현재 동작:
 *   1. 기존 /api/courses/search 호출 (과목 단위 검색)
 *   2. 각 과목의 /api/courses/{id}/sections 호출
 *   3. 실패 시 mockData fallback
 */

import { api } from '@/lib/api'
import type { CourseMaster } from '@/types'
import type { SectionCandidate } from './types'
import { MOCK_SECTIONS } from './mockData'

/**
 * 분반 단위 검색 (필수 포함 분반 선택용).
 *
 * TODO: 백엔드 /api/courses/sections/search?q= 구현 후
 *       아래 로직을 `api.searchSections({ courseName: query })` 단일 호출로 교체 가능.
 */
export async function searchSections(query: string): Promise<SectionCandidate[]> {
  if (!query.trim()) return []

  try {
    // Step 1: 과목 검색
    const courses = await api.searchCourses({ name: query })
    if (courses.length === 0) throw new Error('no courses')

    // Step 2: 각 과목의 분반 조회 (최대 5개 과목만 — N+1 완화)
    // TODO: 백엔드에서 한 번의 API로 처리하도록 개선 필요
    const results: SectionCandidate[] = []
    for (const course of courses.slice(0, 5)) {
      const sections = await api.getSections(course.id)
      for (const s of sections) {
        const timeParts = s.time.split('~')
        if (timeParts.length !== 2) continue
        const days = s.day.split(/[,，]/).map((d) => d.trim()).filter(Boolean)
        const meetingTimes = days.map((day) => ({
          day,
          start: timeParts[0].trim(),
          end: timeParts[1].trim(),
        }))
        results.push({
          courseId: course.id,
          courseName: course.name,
          courseCode: course.code,
          sectionId: s.section_id,
          sectionName: s.professor ? `${s.professor} 교수` : `분반 ${s.section_id}`,
          credits: course.credits ?? 3,
          meetingTimes,
          deliveryMode: 'UNKNOWN', // TODO: 백엔드 deliveryMode 필드 추가 필요
          professor: s.professor,
        })
      }
    }

    if (results.length > 0) return results
  } catch {
    // 백엔드 미구현 또는 오류 → mock fallback
  }

  // Fallback: mock 데이터에서 키워드 매칭
  return MOCK_SECTIONS.filter(
    (s) =>
      s.courseName.includes(query) ||
      s.courseCode.toLowerCase().includes(query.toLowerCase()) ||
      (s.professor ?? '').includes(query)
  )
}

/**
 * 과목 단위 검색 (제외 과목 선택용).
 * 기존 /api/courses/search 엔드포인트 사용.
 */
export async function searchCourses(query: string): Promise<CourseMaster[]> {
  if (!query.trim()) return []

  try {
    return await api.searchCourses({ name: query })
  } catch {
    // Fallback: mock 데이터에서 유니크한 과목 목록
    const seen = new Set<number>()
    const fallback: CourseMaster[] = []
    for (const s of MOCK_SECTIONS) {
      if (!seen.has(s.courseId) && s.courseName.includes(query)) {
        seen.add(s.courseId)
        fallback.push({ id: s.courseId, code: s.courseCode, name: s.courseName, credits: s.credits })
      }
    }
    return fallback
  }
}

/** mock 데이터에서 모든 분반 반환 (초기 pool 세팅용) */
export function getMockPool(): SectionCandidate[] {
  return MOCK_SECTIONS
}

/**
 * 실제 백엔드 연동 검색 서비스
 *
 * - searchGroupedSections: 필수 포함 분반 검색 (GET /api/courses/sections/grouped-search?q=)
 * - searchCoursesForExclude: 제외 과목 검색 (GET /api/courses/search?name=)
 * - loadAllCandidateSections: 추천 candidate pool 로딩 (GET /api/courses/sections/grouped-search, 전체)
 */

import { api } from '@/lib/api'
import type { GroupedSectionRaw } from '@/types'
import type { ExcludedCourse } from './types'

// ── 필수 포함 분반 검색 ──────────────────────────────────────

export async function searchGroupedSections(q: string): Promise<GroupedSectionRaw[]> {
  if (!q.trim()) return []
  try {
    return await api.searchGroupedSections(q.trim())
  } catch {
    return []
  }
}

// ── 제외 과목 검색 ───────────────────────────────────────────

export interface CourseSearchResult {
  courseId: string
  courseCode: string
  courseName: string
  credits: number
}

export async function searchCoursesForExclude(name: string): Promise<CourseSearchResult[]> {
  if (!name.trim()) return []
  try {
    const results = await api.searchCourses({ name: name.trim() })
    return results.map((c) => ({
      courseId: String(c.id),
      courseCode: c.code ?? '',
      courseName: c.name,
      credits: c.credits ?? 0,
    }))
  } catch {
    return []
  }
}

// ── candidate pool 로딩 ──────────────────────────────────────

/**
 * 추천 엔진이 탐색할 전체 candidate pool 로딩
 * GET /api/courses/sections/grouped-search (q 없이 → 전체 반환)
 */
export async function loadAllCandidateSections(): Promise<GroupedSectionRaw[]> {
  try {
    return await api.getAllGroupedSections()
  } catch {
    return []
  }
}

// ExcludedCourse 변환 헬퍼
export function toExcludedCourse(result: CourseSearchResult): ExcludedCourse {
  return {
    courseId: result.courseId,
    courseCode: result.courseCode,
    courseName: result.courseName,
  }
}

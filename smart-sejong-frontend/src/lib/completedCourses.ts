export const COMPLETED_COURSES_STORAGE_KEY = 'completed_course_info'

export interface CompletedCourseInfo {
  courseCode: string
  courseName: string
}

export function saveCompletedCourseInfo(items: CompletedCourseInfo[]): void {
  localStorage.setItem(COMPLETED_COURSES_STORAGE_KEY, JSON.stringify(items))
}

export function loadCompletedCourseInfo(): CompletedCourseInfo[] {
  try {
    const raw = localStorage.getItem(COMPLETED_COURSES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
      return (parsed as string[]).map((c) => ({ courseCode: c, courseName: '' }))
    }
    return parsed as CompletedCourseInfo[]
  } catch {
    return []
  }
}

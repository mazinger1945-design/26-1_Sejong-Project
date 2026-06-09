// ============================================================
// 추천 엔진 도메인 타입
// ============================================================

/** 요일 키 */
export type Day = '월' | '화' | '수' | '목' | '금'

export type PreferenceLevel = 'PREFER' | 'NEUTRAL' | 'DISLIKE'
export type GapLevel = 0 | 1 | 2 | 3

// ── 수업 시간 블록 ───────────────────────────────────────────

/** 분(minute) 기반 수업 시간 */
export interface MeetingTime {
  day: Day
  startMinute: number  // 자정 기준 분 (예: 09:00 → 540)
  endMinute: number
}

// ── 추천 엔진 입력 타입 ─────────────────────────────────────

/** 백엔드 GroupedSectionResponse → 정규화된 분반 (추천 엔진 표준) */
export interface RSection {
  courseId: string          // 문자열 통일 (number → string 변환)
  courseName: string
  courseCode: string
  sectionId: string
  sectionName: string       // sectionNumber 포함
  credits: number
  meetingTimes: MeetingTime[]
  professor: string
  categoryDescription: string  // "전공필수", "교양선택" 등
  college: string              // 개설 단과대 (예: "인공지능융합대학")
  department: string           // 개설 학과/전공 (예: "AI로봇학과")
  wishlistCount: number        // allcll.kr 관심과목 담은 수
  cyberClass: string | null    // 사이버강좌 종류 (null이면 일반 강의)
}

/** 정규화 후 bitmask 추가된 분반 */
export interface NormalizedSection extends RSection {
  weeklyMask: bigint[]  // [mon, tue, wed, thu, fri] 각 56bit
  intervalsByDay: Partial<Record<Day, { start: number; end: number }[]>>
}

/** 사용자 정의 일정 */
export interface CustomBlock {
  id: string
  title: string
  day: Day
  startMinute: number
  endMinute: number
  weeklyMask: bigint[]
}

/** 고정 분반 (RSection + bitmask) */
export interface FixedSection extends NormalizedSection {
  // NormalizedSection 그대로 (mask 이미 포함)
}

/** 제외 과목 */
export interface ExcludedCourse {
  courseId: string
  courseCode: string
  courseName: string
}

// ── 조건 모델 ────────────────────────────────────────────────

export interface RecommendationFilters {
  fixedSections: FixedSection[]
  customBlocks: CustomBlock[]
  excludedCourseIds: string[]
  creditRange: { min: number; max: number }
  preferredFreeDays: Day[]
  timePreference: {
    morning: PreferenceLevel
    afternoon: PreferenceLevel
    evening: PreferenceLevel
  }
  allowedGapLevel: GapLevel
  needsLunchBreak: boolean
  /** 전공 최소 과목 수 (0이면 비활성) */
  majorMinCount: number
  /** 사용자 소속 학과 (전공 판정에 사용) */
  userMajor: string
}

// ── 검증 오류 ────────────────────────────────────────────────

export interface ValidationError {
  type:
    | 'SECTION_SECTION_CONFLICT'
    | 'SECTION_CUSTOM_CONFLICT'
    | 'CUSTOM_CUSTOM_CONFLICT'
    | 'EXCLUDED_CONFLICT'
    | 'CREDIT_EXCEED'
    | 'CREDIT_RANGE_INVALID'
  message: string
}

// ── 결과 타입 ────────────────────────────────────────────────

export interface ScoreBreakdown {
  freeDay: number
  timePreference: number
  gap: number
  lunch: number
  major: number
  total: number         // 100점 정규화
}

export interface RecommendationItem {
  sections: RSection[]  // fixed 제외, 새로 선택된 분반만
  totalCredits: number  // fixed 포함 전체 학점
  scoreBreakdown: ScoreBreakdown
  reasons: string[]
}

/** DFS 과목 그룹 */
export interface CourseGroup {
  courseId: string
  courseName: string
  sections: NormalizedSection[]
}

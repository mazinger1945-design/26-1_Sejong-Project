// ============================================================
// 추천 도메인 전용 타입 정의
// ============================================================

/** 수업 시간 블록 */
export interface MeetingTime {
  day: string   // '월' | '화' | '수' | '목' | '금'
  start: string // 'HH:MM'
  end: string   // 'HH:MM'
}

/** 추천 후보 분반 - 추천 엔진이 다루는 핵심 데이터 단위 */
export interface SectionCandidate {
  courseId: number
  courseName: string
  courseCode: string
  sectionId: number
  sectionName: string
  credits: number
  meetingTimes: MeetingTime[]
  deliveryMode: 'ONLINE' | 'OFFLINE' | 'MIXED' | 'UNKNOWN'
  professor?: string
}

/**
 * 요일별 점유 슬롯 비트마스크
 * 예: { '월': 0b000111 } → 월요일 슬롯 0,1,2 점유
 */
export type DayMask = Record<string, number>

/** 필수 고정 분반 (사용자가 직접 선택) */
export interface FixedSection {
  section: SectionCandidate
  mask: DayMask // 사전 계산된 시간 마스크
}

/** 사용자 정의 일정 블록 (알바, 동아리 등) */
export interface CustomBlock {
  id: string    // 클라이언트 임시 ID
  title: string
  day: string
  start: string
  end: string
  mask: DayMask // 사전 계산된 시간 마스크
}

/** 제외 과목 (과목 단위) */
export interface ExcludedCourse {
  courseId: number
  courseCode: string
  courseName: string
}

export type DeliveryPreference = 'ONLINE_PREFER' | 'ANY' | 'OFFLINE_PREFER'
export type TimePref = 'PREFER' | 'NEUTRAL' | 'DISLIKE'
export type GapLevel = 0 | 1 | 2 | 3

/** 추천 조건 전체 상태 모델 */
export interface RecommendationConditions {
  // 하드 조건
  fixedSections: FixedSection[]
  fixedCustomBlocks: CustomBlock[]
  excludedCourseIds: number[]
  creditRange: { min: number; max: number }
  deliveryPreference: DeliveryPreference

  // 소프트 조건
  preferredFreeDays: string[]
  timePreference: {
    morning: TimePref
    afternoon: TimePref
    evening: TimePref
  }
  allowedGapLevel: GapLevel
  needsLunchBreak: boolean
}

/** 소프트 조건별 세부 점수 */
export interface ScoreBreakdown {
  freeDayScore: number
  timePreferenceScore: number
  gapScore: number
  lunchScore: number
  deliveryScore: number
  total: number
}

/** 추천 결과 1개 */
export interface RecommendationResult {
  id: number
  sections: SectionCandidate[] // 고정 분반 제외, 추가 선택된 분반
  totalCredits: number         // 고정 학점 포함 전체 학점
  scoreBreakdown: ScoreBreakdown
  reasons: string[]            // 추천 이유 텍스트
}

/** DFS 탐색을 위한 과목 그룹 (같은 과목의 여러 분반 묶음) */
export interface CandidateGroup {
  courseId: number
  courseName: string
  sections: SectionCandidate[]
}

/** 하드 조건 검증 오류 */
export interface ValidationError {
  type: 'SECTION_CONFLICT' | 'CUSTOM_CONFLICT' | 'CREDIT_EXCEED' | 'EXCLUDED_CONFLICT'
  message: string
}

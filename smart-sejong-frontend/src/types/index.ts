// ── 백엔드 GroupedSectionResponse 원본 타입 ─────────────────────
export interface GroupedSectionRaw {
  sectionId: number
  courseId: number
  courseCode: string
  courseName: string
  credits: number
  sectionNumber: string
  professor: string | null
  categoryDescription: string | null  // "전공필수", "전공선택", "교양선택" 등
  college: string | null              // 개설 단과대 (예: "인공지능융합대학")
  department: string | null           // 개설 학과/전공 (예: "AI로봇학과")
  times: {
    dayOfWeekKor: string   // "월", "화", ...
    startTime: string      // "09:00"
    endTime: string        // "10:30"
  }[]
}

// Auth Types
export interface AuthResponse {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  user: AuthUserInfo
}

export interface AuthUserInfo {
  id: number
  studentId: string
  fullName?: string
  major?: string
}

export interface UserProfileApiResponse {
  fullName: string
  studentId: string
  major?: string
}

export interface UserInfo {
  id?: number
  nickname: string
  student_id?: string
  major?: string
  is_verified: boolean
  profile_image?: string
}

export interface LoginRequest {
  studentId: string
  password: string
}

// Learning Types (legacy, prefer CompletedCourse)
export interface Course {
  id: number
  course_name: string
  grade: string
  credits: number
}

export interface LearningSummary {
  total: number
  major: number
  ge: number
}

export interface UploadResponse {
  added_count: number
  total_credits: number
}

// Completed Course (기이수 과목) Types
export interface CompletedCourseItem {
  id?: number
  courseCode: string
  courseName: string
  category: string
  credits: number
  grade: string
  gradePoint: number
  year?: string
  semester?: string
}

export interface CategorySummary {
  totalCredits: number
  earnedCredits: number
  totalGradePoints: number
  gradePointCredits: number
  averageGradePoint: number
}

export interface CompletedCourseSummary {
  major: CategorySummary
  liberal: CategorySummary
  other: CategorySummary
  total: CategorySummary
}

export interface CompletedCourseUploadResult {
  totalRows: number
  successCount: number
  failCount: number
  skipCount: number
}

// Course Types
export interface CourseMaster {
  id: number
  code: string
  name: string
  credits?: number
}

export interface Section {
  section_id: number
  professor: string
  day: string
  time: string
}

// Timetable Types
export interface Timetable {
  id: number
  name: string
  created_at: string
  items?: TimetableItem[]
}

export interface TimetableItem {
  item_id: number
  section_id?: number
  course_id?: number
  course_code?: string
  section_number?: string
  professor?: string
  name: string
  day: string
  start: string
  end: string
  is_pinned: boolean
  type: 'section' | 'custom'
  /**
   * 표시 전용 variant (추천 페이지 미리보기에서 사용)
   * 'locked'        → 고정 분반 (초록)
   * 'custom-locked' → 고정 사용자 일정 (주황)
   * 'recommended'   → 추천 분반 (파랑, 연하게)
   * undefined       → 기존 TimetablePage 동작 유지
   */
  _variant?: 'locked' | 'custom-locked' | 'recommended'
}

export interface CreateTimetableRequest {
  name: string
}

export interface CreateTimetableResponse {
  timetable_id: number
}

// Group Types
export interface Group {
  id: number
  name: string
  count: number
  members?: GroupMember[]
}

export interface GroupDetail extends Group {
  invite_code?: string
  members: GroupMember[]
}

export interface GroupMember {
  user_id: number
  nickname: string
  active_timetable_id?: number | null
  active_timetable_name?: string | null
  timetable?: TimetableItem[]
}

export interface CreateGroupRequest {
  group_name: string
}

export interface CreateGroupResponse {
  invite_code: string
  group_id: number
}

export interface JoinGroupRequest {
  invite_code: string
}

export interface JoinGroupResponse {
  group_id: number
}

// Recommendation API Types (backend)
export interface BackendRecommendationRequest {
  fixedSectionIds: number[]
  customBlocks: { title: string; day: string; startTime: string; endTime: string }[]
  excludedCourseIds: number[]
  excludedCourseCodes: string[]
  creditMin: number
  creditMax: number
  preferredFreeDays: string[]
  morningPreference: string
  afternoonPreference: string
  eveningPreference: string
  allowedGapLevel: number
  needsLunchBreak: boolean
  majorMinCount: number
  userMajor: string
}

export interface BackendScoreBreakdown {
  freeDay: number
  timePreference: number
  gap: number
  lunch: number
  major: number
  total: number
  personalScore?: number
  groupScore?: number
  totalScore?: number
}

export interface BackendSectionDto {
  sectionId: number
  courseId: number
  courseCode: string
  courseName: string
  sectionNumber: string
  professor: string
  credits: number
  categoryDescription: string | null
  college: string | null
  department: string | null
  times: { dayOfWeekKor: string; startTime: string; endTime: string }[]
}

export interface BackendCombinationDto {
  sections: BackendSectionDto[]
  baseSections?: BackendSectionDto[]
  addedSections?: BackendSectionDto[]
  totalCredits: number
  scoreBreakdown: BackendScoreBreakdown
  reasons: string[]
  personalScore?: number
  groupScore?: number
  totalScore?: number
  groupReasons?: string[]
}

export interface BackendRecommendationResponse {
  combinations: BackendCombinationDto[]
  diagnosisMessage: string | null
}

export interface CopyRecommendationRequest {
  section_id: number
  target_id: number
}


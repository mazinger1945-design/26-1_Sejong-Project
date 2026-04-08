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

export interface GroupMember {
  user_id: number
  nickname: string
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

// AI Recommendation Types
export interface RecommendationFilters {
  preferred_days?: string[]
  min_free_days?: number
  preferred_times?: string[]
  required_courses?: string[]
}

export interface RecommendationRequest {
  filters: RecommendationFilters
  pinned_items?: number[]
}

export interface RecommendationCombination {
  combination_id: number
  items: TimetableItem[]
}

export interface CopyRecommendationRequest {
  section_id: number
  target_id: number
}


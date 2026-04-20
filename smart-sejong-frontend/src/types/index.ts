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

export type TimetableDay = '월' | '화' | '수' | '목' | '금'
export type PreferenceLevelValue = 'PREFER' | 'NEUTRAL' | 'DISLIKE'

export interface SectionTimeRaw {
  dayOfWeekKor: TimetableDay | string
  startTime: string
  endTime: string
}

export interface GroupedSectionRaw {
  sectionId: number
  courseId: number
  courseCode: string
  courseName: string
  credits: number
  sectionNumber: string
  professor?: string
  categoryDescription?: string
  college?: string
  department?: string
  times: SectionTimeRaw[]
}

export interface CourseMaster {
  id: number
  code?: string
  courseCode?: string
  name: string
  credits?: number
  category?: string
  categoryDescription?: string
}

export interface TimetableItem {
  item_id: number
  section_id?: number
  name: string
  day: TimetableDay | string
  start: string
  end: string
  is_pinned?: boolean
  type?: 'section' | 'custom'
  _variant?: 'locked' | 'custom-locked' | 'recommended'
}

export interface BackendCustomBlockRequest {
  title: string
  day: TimetableDay | string
  startTime: string
  endTime: string
}

export interface BackendRecommendationRequest {
  fixedSectionIds: number[]
  customBlocks: BackendCustomBlockRequest[]
  excludedCourseIds: number[]
  excludedCourseCodes: string[]
  creditMin: number
  creditMax: number
  preferredFreeDays: string[]
  morningPreference: PreferenceLevelValue
  afternoonPreference: PreferenceLevelValue
  eveningPreference: PreferenceLevelValue
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
}

export interface BackendCombinationDto {
  sections: GroupedSectionRaw[]
  totalCredits: number
  scoreBreakdown: BackendScoreBreakdown
  reasons: string[]
}

export interface BackendRecommendationResponse {
  combinations: BackendCombinationDto[]
  diagnosisMessage?: string | null
}

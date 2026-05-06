import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'
import type {
  AuthResponse,
  LoginRequest,
  UserInfo,
  UserProfileApiResponse,
  Course,
  LearningSummary,
  UploadResponse,
  CompletedCourseItem,
  CompletedCourseSummary,
  CompletedCourseUploadResult,
  CourseMaster,
  Section,
  Timetable,
  TimetableItem,
  CreateTimetableRequest,
  CreateTimetableResponse,
  Group,
  GroupDetail,
  CreateGroupRequest,
  CreateGroupResponse,
  JoinGroupRequest,
  JoinGroupResponse,
  BackendRecommendationRequest,
  BackendRecommendationResponse,
  CopyRecommendationRequest,
  GroupedSectionRaw,
} from '@/types'
import { normalizeUserInfo } from '@/lib/user'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

function formatSectionTime(s: { startTime?: string; endTime?: string }): string {
  const start = s.startTime ?? ''
  const end = s.endTime ?? ''
  if (start && end) return `${start}~${end}`
  return start || end || ''
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
    })

    // Request interceptor - Add token to headers
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token')
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // 네트워크 오류나 서버가 응답하지 않는 경우
        if (!error.response) {
          // 개발 모드에서는 콘솔에만 표시 (흰 화면 방지)
          if (import.meta.env.DEV) {
            console.warn('API 요청 실패:', error.message)
          }
          return Promise.reject(error)
        }
        
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          // 개발 모드에서는 리다이렉트 안 함
          if (!import.meta.env.DEV) {
            window.location.href = '/login'
            toast.error('인증이 만료되었습니다. 다시 로그인해주세요.')
          }
        } else if (error.response?.status >= 500) {
          // 개발 모드에서는 토스트 안 띄움 (너무 많은 알림 방지)
          if (!import.meta.env.DEV) {
            toast.error('서버 오류가 발생했습니다.')
          }
        } else if (error.response?.data?.message) {
          // 개발 모드에서는 토스트 안 띄움
          if (!import.meta.env.DEV) {
            toast.error(error.response.data.message)
          }
        }
        return Promise.reject(error)
      }
    )
  }

  // Auth APIs
  async login(request: LoginRequest): Promise<AuthResponse> {
    const { data } = await this.client.post<{ status: number; message: string; data: AuthResponse }>(
      '/api/auth/login',
      request
    )
    // CommonResponse 형식: { status: 200, message: "...", data: AuthResponse }
    if (data.status === 200 && data.data) {
      return data.data
    }
    throw new Error(data.message || '로그인에 실패했습니다.')
  }

  async logout(): Promise<void> {
    await this.client.post('/api/auth/logout')
    localStorage.removeItem('token')
  }

  async getMyInfo(): Promise<UserInfo> {
    const { data } = await this.client.get<{ status?: number; data?: UserProfileApiResponse }>('/api/users/me')
    const normalized = normalizeUserInfo(data?.data ?? (data as unknown as UserProfileApiResponse))
    if (!normalized) {
      throw new Error('사용자 정보를 받지 못했습니다.')
    }
    return normalized
  }

  async updateMyInfo(updates: { name?: string; major?: string }): Promise<void> {
    await this.client.put('/api/users/me', updates)
  }

  /** 서비스 탈퇴 (계정 및 데이터 영구 삭제) */
  async deleteAccount(): Promise<void> {
    const { data } = await this.client.delete<{ status?: number }>('/api/users/me')
    if (data?.status === 200) {
      localStorage.removeItem('token')
    }
  }

  /** 포털 정보 재동기화 (전과 등 변경 시) */
  async syncPortalData(password: string): Promise<{ updatedFields?: string[] }> {
    const { data } = await this.client.post<{ status?: number; data?: { updatedFields?: string[] } }>(
      '/api/users/me/sync',
      { password }
    )
    if (data?.data) return data.data
    return {}
  }

  // Learning APIs (legacy)
  async uploadGrades(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await this.client.post<UploadResponse>(
      '/api/learning/upload',
      formData
    )
    return data
  }

  async getCourses(): Promise<Course[]> {
    const { data } = await this.client.get<Course[]>('/api/learning/courses')
    return data
  }

  async getLearningSummary(): Promise<LearningSummary> {
    const { data } = await this.client.get<LearningSummary>('/api/learning/summary')
    return data
  }

  // Completed Course (기이수 과목) APIs
  /** 기이수 Excel 파싱만 (DB 저장 없음) */
  async uploadCompletedCoursesParseOnly(file: File): Promise<CompletedCourseItem[]> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await this.client.post<{ status?: number; data?: CompletedCourseItem[] }>(
      '/api/completed-courses/upload',
      formData
    )
    if (data?.data) return data.data
    return (data as unknown as CompletedCourseItem[]) ?? []
  }

  /** 기이수 Excel 업로드 후 DB 저장 */
  async importCompletedCourses(file: File): Promise<CompletedCourseUploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await this.client.post<{ status?: number; data?: CompletedCourseUploadResult }>(
      '/api/completed-courses/import',
      formData
    )
    if (data?.data) return data.data
    throw new Error('저장 결과를 받지 못했습니다.')
  }

  async getCompletedCourses(userId?: number): Promise<CompletedCourseItem[]> {
    const params = userId != null ? { userId } : {}
    const { data } = await this.client.get<{ status?: number; data?: CompletedCourseItem[] }>(
      '/api/completed-courses',
      { params }
    )
    if (data?.data) return data.data
    return (data as unknown as CompletedCourseItem[]) ?? []
  }

  async getCompletedCoursesSummary(userId?: number): Promise<CompletedCourseSummary> {
    const params = userId != null ? { userId } : {}
    const { data } = await this.client.get<{ status?: number; data?: CompletedCourseSummary }>(
      '/api/completed-courses/summary',
      { params }
    )
    if (data?.data) return data.data
    throw new Error('요약 정보를 받지 못했습니다.')
  }

  private mapCourseToMaster(c: { id?: number; courseCode?: string; code?: string; name?: string; credits?: number }): CourseMaster {
    return {
      id: c.id ?? 0,
      code: c.courseCode ?? c.code ?? '',
      name: c.name ?? '',
      credits: c.credits,
    }
  }

  // Course APIs (CommonResponse unwrapped)
  async getAllCourses(): Promise<CourseMaster[]> {
    const { data } = await this.client.get<{ status?: number; data?: unknown[] }>('/api/courses')
    const list = data?.data ?? (data as unknown as unknown[]) ?? []
    return list.map((c) => this.mapCourseToMaster(c as Record<string, unknown>))
  }

  async searchCourses(params?: { name?: string; category?: string }): Promise<CourseMaster[]> {
    const { data } = await this.client.get<{ status?: number; data?: unknown[] }>(
      '/api/courses/search',
      { params: params ?? {} }
    )
    const list = data?.data ?? (data as unknown as unknown[]) ?? []
    return list.map((c) => this.mapCourseToMaster(c as Record<string, unknown>))
  }

  async getCourseDetails(id: number): Promise<CourseMaster> {
    const { data } = await this.client.get<{ status?: number; data?: unknown }>(
      `/api/courses/${id}`
    )
    const c = data?.data ?? data
    if (c && typeof c === 'object') return this.mapCourseToMaster(c as Record<string, unknown>)
    throw new Error('과목 정보를 받지 못했습니다.')
  }

  async getCourseByCode(courseCode: string): Promise<CourseMaster> {
    const { data } = await this.client.get<{ status?: number; data?: unknown }>(
      `/api/courses/code/${encodeURIComponent(courseCode)}`
    )
    const c = data?.data ?? data
    if (c && typeof c === 'object') return this.mapCourseToMaster(c as Record<string, unknown>)
    throw new Error('과목 정보를 받지 못했습니다.')
  }

  async getSections(courseId: number): Promise<Section[]> {
    const { data } = await this.client.get<{ status?: number; data?: Section[] }>(
      `/api/courses/${courseId}/sections`
    )
    const raw = data?.data ?? (data as unknown as Section[])
    if (!raw || !Array.isArray(raw)) return []
    return raw.map((s) => ({
      section_id: (s as { section_id?: number; id?: number }).section_id ?? (s as { id?: number }).id ?? 0,
      professor: (s as Section).professor ?? '',
      day: (s as { day?: string; dayOfWeekKor?: string }).day ?? (s as { dayOfWeekKor?: string }).dayOfWeekKor ?? '',
      time: formatSectionTime(s as { startTime?: string; endTime?: string }),
    }))
  }

  async getAllSections(): Promise<Section[]> {
    const { data } = await this.client.get<{ status?: number; data?: Section[] }>(
      '/api/courses/sections'
    )
    const raw = data?.data ?? (data as unknown as Section[])
    if (!raw || !Array.isArray(raw)) return []
    return raw.map((s) => ({
      section_id: (s as { section_id?: number; id?: number }).section_id ?? (s as { id?: number }).id ?? 0,
      professor: (s as Section).professor ?? '',
      day: (s as { day?: string; dayOfWeekKor?: string }).day ?? (s as { dayOfWeekKor?: string }).dayOfWeekKor ?? '',
      time: formatSectionTime(s as { startTime?: string; endTime?: string }),
    }))
  }

  async searchSections(params?: {
    courseName?: string
    professor?: string
    dayOfWeek?: string
  }): Promise<Section[]> {
    const { data } = await this.client.get<{ status?: number; data?: Section[] }>(
      '/api/courses/sections/search',
      { params: params ?? {} }
    )
    const raw = data?.data ?? (data as unknown as Section[])
    if (!raw || !Array.isArray(raw)) return []
    return raw.map((s) => ({
      section_id: (s as { section_id?: number; id?: number }).section_id ?? (s as { id?: number }).id ?? 0,
      professor: (s as Section).professor ?? '',
      day: (s as { day?: string; dayOfWeekKor?: string }).day ?? (s as { dayOfWeekKor?: string }).dayOfWeekKor ?? '',
      time: formatSectionTime(s as { startTime?: string; endTime?: string }),
    }))
  }

  /** 분반 통합 검색 (그룹핑) - 추천 페이지 필수 포함 분반 검색용
   *  GET /api/courses/sections/grouped-search?q=<keyword>
   *  → GroupedSectionResponse[] (courseId, courseName, times[] 포함)
   */
  async searchGroupedSections(q: string): Promise<GroupedSectionRaw[]> {
    const { data } = await this.client.get<{ status?: number; data?: GroupedSectionRaw[] }>(
      '/api/courses/sections/grouped-search',
      { params: { q } }
    )
    return (data?.data ?? (data as unknown as GroupedSectionRaw[])) ?? []
  }

  /** 전체 분반 조회 (candidate pool 구성용) */
  async getAllGroupedSections(): Promise<GroupedSectionRaw[]> {
    const { data } = await this.client.get<{ status?: number; data?: GroupedSectionRaw[] }>(
      '/api/courses/sections/grouped-search'
    )
    return (data?.data ?? (data as unknown as GroupedSectionRaw[])) ?? []
  }

  /**
   * 동일과목 그룹 resolve
   * 완료한 학수번호 목록을 받아 동일과목 그룹의 모든 학수번호(제외 대상)를 반환한다.
   * 백엔드 데이터 없을 경우 빈 Set 반환 (graceful fallback)
   */
  async resolveEquivalentCodes(courseCodes: string[]): Promise<Set<string>> {
    if (!courseCodes.length) return new Set()
    try {
      const { data } = await this.client.post<{ status?: number; data?: string[] }>(
        '/api/courses/equivalents/resolve',
        { courseCodes }
      )
      const arr = data?.data ?? (data as unknown as string[]) ?? []
      return new Set(arr)
    } catch {
      return new Set(courseCodes)
    }
  }

  // Timetable APIs
  async createTimetable(request: CreateTimetableRequest): Promise<CreateTimetableResponse> {
    const { data } = await this.client.post<{ status?: number; data?: CreateTimetableResponse }>(
      '/api/timetables',
      request
    )
    return data?.data ?? (data as unknown as CreateTimetableResponse)
  }

  async getTimetables(): Promise<Timetable[]> {
    const { data } = await this.client.get<{ status?: number; data?: Timetable[] }>('/api/timetables')
    return data?.data ?? (data as unknown as Timetable[]) ?? []
  }

  async getTimetable(id: number): Promise<Timetable> {
    const { data } = await this.client.get<{ status?: number; data?: Timetable }>(`/api/timetables/${id}`)
    return data?.data ?? (data as unknown as Timetable)
  }

  async updateTimetableName(id: number, name: string): Promise<void> {
    await this.client.patch(`/api/timetables/${id}/name`, { name })
  }

  async deleteTimetable(id: number): Promise<void> {
    await this.client.delete(`/api/timetables/${id}`)
  }

  // Timetable Item APIs
  async addSectionItem(timetableId: number, sectionId: number): Promise<{ item_id: number }> {
    const { data } = await this.client.post<{ status?: number; data?: { item_id: number } }>(
      `/api/timetables/${timetableId}/items/section`,
      { section_id: sectionId }
    )
    return data?.data ?? (data as unknown as { item_id: number })
  }

  async addCustomItem(
    timetableId: number,
    item: { name: string; day: string; start: string; end: string }
  ): Promise<{ item_id: number }> {
    const { data } = await this.client.post<{ status?: number; data?: { item_id: number } }>(
      `/api/timetables/${timetableId}/items/custom`,
      item
    )
    return data?.data ?? (data as unknown as { item_id: number })
  }

  async updateCustomItem(
    itemId: number,
    item: { name: string; day: string; start: string; end: string }
  ): Promise<void> {
    await this.client.put(`/api/timetables/items/custom/${itemId}`, item)
  }

  async deleteItem(itemId: number): Promise<void> {
    await this.client.delete(`/api/timetables/items/${itemId}`)
  }

  async togglePin(itemId: number, isPinned: boolean): Promise<{ item_id: number; is_pinned: boolean }> {
    const { data } = await this.client.patch<{ status?: number; data?: { item_id: number; is_pinned: boolean } }>(
      `/api/timetables/items/${itemId}/pin`,
      { is_pinned: isPinned }
    )
    return data?.data ?? (data as unknown as { item_id: number; is_pinned: boolean })
  }

  // Group APIs
  async createGroup(request: CreateGroupRequest): Promise<CreateGroupResponse> {
    const { data } = await this.client.post<CreateGroupResponse>('/api/groups', request)
    return data
  }

  async getGroups(): Promise<Group[]> {
    const { data } = await this.client.get<Group[]>('/api/groups')
    return data
  }

  async getGroup(id: number): Promise<GroupDetail> {
    const { data } = await this.client.get<GroupDetail>(`/api/groups/${id}`)
    return data
  }

  async joinGroup(request: JoinGroupRequest): Promise<JoinGroupResponse> {
    const { data } = await this.client.post<JoinGroupResponse>('/api/groups/join', request)
    return data
  }

  async leaveGroup(id: number): Promise<void> {
    await this.client.delete(`/api/groups/${id}/leave`)
  }

  async setActiveTimetable(groupId: number, timetableId: number): Promise<void> {
    await this.client.put(`/api/groups/${groupId}/active`, { timetable_id: timetableId })
  }

  async getMemberTimetable(groupId: number, userId: number): Promise<{ user_id: number; items: TimetableItem[] }> {
    const { data } = await this.client.get<{ user_id: number; items: TimetableItem[] }>(
      `/api/groups/${groupId}/members/${userId}/timetable`
    )
    return data
  }

  // Recommendation API
  async generateRecommendations(
    request: BackendRecommendationRequest
  ): Promise<BackendRecommendationResponse> {
    const { data } = await this.client.post<{ status?: number; data?: BackendRecommendationResponse }>(
      '/api/recommend/generate',
      request
    )
    if (data?.data) return data.data
    throw new Error('추천 결과를 받지 못했습니다.')
  }

  async copyRecommendation(request: CopyRecommendationRequest): Promise<void> {
    await this.client.post('/api/recommend/copy', request)
  }
}

export const api = new ApiClient()


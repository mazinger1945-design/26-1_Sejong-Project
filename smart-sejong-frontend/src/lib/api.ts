import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type {
  AuthResponse,
  LoginRequest,
  CompletedCourseItem,
  CompletedCourseSummary,
  CompletedCourseUploadResult,
  BackendRecommendationRequest,
  BackendRecommendationResponse,
  CourseMaster,
  GroupedSectionRaw,
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
    })

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token')
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error),
    )

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('user')
        }
        return Promise.reject(error)
      },
    )
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const { data } = await this.client.post<{ status: number; message: string; data: AuthResponse }>(
      '/api/auth/login',
      request,
    )

    if (data.status === 200 && data.data) {
      return data.data
    }
    throw new Error(data.message || '로그인에 실패했습니다.')
  }

  async logout(): Promise<void> {
    await this.client.post('/api/auth/logout')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }

  async importCompletedCourses(file: File): Promise<CompletedCourseUploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await this.client.post<{ status?: number; data?: CompletedCourseUploadResult }>(
      '/api/completed-courses/import',
      formData,
    )
    if (data?.data) return data.data
    throw new Error('저장 결과를 받지 못했습니다.')
  }

  async getCompletedCourses(): Promise<CompletedCourseItem[]> {
    const { data } = await this.client.get<{ status?: number; data?: CompletedCourseItem[] }>(
      '/api/completed-courses',
    )
    if (data?.data) return data.data
    return []
  }

  async getCompletedCoursesSummary(): Promise<CompletedCourseSummary> {
    const { data } = await this.client.get<{ status?: number; data?: CompletedCourseSummary }>(
      '/api/completed-courses/summary',
    )
    if (data?.data) return data.data
    throw new Error('학점 요약 정보를 받지 못했습니다.')
  }

  async searchGroupedSections(q: string): Promise<GroupedSectionRaw[]> {
    const { data } = await this.client.get<{ status?: number; data?: GroupedSectionRaw[] }>(
      '/api/courses/sections/grouped-search',
      { params: { q } },
    )
    return data?.data ?? []
  }

  async getAllGroupedSections(): Promise<GroupedSectionRaw[]> {
    const { data } = await this.client.get<{ status?: number; data?: GroupedSectionRaw[] }>(
      '/api/courses/sections/grouped-search',
    )
    return data?.data ?? []
  }

  async searchCourses(params: { name?: string }): Promise<CourseMaster[]> {
    const { data } = await this.client.get<{ status?: number; data?: CourseMaster[] }>(
      '/api/courses/search',
      { params },
    )
    return (data?.data ?? []).map((course) => ({
      ...course,
      code: course.code ?? course.courseCode ?? '',
    }))
  }

  async resolveEquivalentCodes(courseCodes: string[]): Promise<Set<string>> {
    if (courseCodes.length === 0) return new Set()

    const { data } = await this.client.post<{ status?: number; data?: string[] }>(
      '/api/courses/equivalents/resolve',
      { courseCodes },
    )
    return new Set(data?.data ?? courseCodes)
  }

  async generateRecommendations(
    request: BackendRecommendationRequest,
  ): Promise<BackendRecommendationResponse> {
    const { data } = await this.client.post<{ status?: number; data?: BackendRecommendationResponse }>(
      '/api/recommend/generate',
      request,
    )

    if (data?.data) return data.data
    return { combinations: [], diagnosisMessage: '추천 결과를 받지 못했습니다.' }
  }
}

export const api = new ApiClient()

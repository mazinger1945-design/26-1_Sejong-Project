import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse, LoginRequest } from '@/types'

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
}

export const api = new ApiClient()

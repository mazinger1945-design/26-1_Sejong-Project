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

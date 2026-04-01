import type { AuthUserInfo, UserInfo, UserProfileApiResponse } from '@/types'

type UserLike = Partial<UserInfo> & Partial<UserProfileApiResponse> & Partial<AuthUserInfo>

export function normalizeUserInfo(user: UserLike | null | undefined): UserInfo | null {
  if (!user) return null

  const nickname =
    user.nickname ??
    user.fullName ??
    user.studentId ??
    user.student_id ??
    '사용자'

  return {
    nickname,
    student_id: user.student_id ?? user.studentId,
    major: user.major ?? '',
    is_verified: user.is_verified ?? Boolean(user.student_id ?? user.studentId),
    profile_image: user.profile_image,
  }
}

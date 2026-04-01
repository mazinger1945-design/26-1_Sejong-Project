import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { User, Edit2, Save, X } from 'lucide-react'
import type { UserInfo } from '@/types'

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { setUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [major, setMajor] = useState('')

  const { data: userInfo, isLoading } = useQuery<UserInfo>({
    queryKey: ['user-info'],
    queryFn: () => api.getMyInfo(),
  })

  useEffect(() => {
    if (userInfo) {
      setUser(userInfo)
      setName(userInfo.nickname || '')
      setMajor(userInfo.major || '')
    }
  }, [userInfo, setUser])

  const updateMutation = useMutation({
    mutationFn: (updates: { name?: string; major?: string }) =>
      api.updateMyInfo(updates),
    onSuccess: () => {
      toast.success('정보가 업데이트되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['user-info'] })
      setIsEditing(false)
    },
  })

  const handleSave = () => {
    updateMutation.mutate({ name, major })
  }

  const handleCancel = () => {
    if (userInfo) {
      setName(userInfo.nickname || '')
      setMajor(userInfo.major || '')
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">내 정보</h1>
        <p className="text-gray-600">프로필 정보를 확인하고 수정하세요</p>
      </div>

      <div className="card max-w-2xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-primary-100 p-4 rounded-full">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">프로필</h2>
            <p className="text-sm text-gray-500">개인 정보를 관리합니다</p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Edit2 className="w-4 h-4" />
              <span>수정</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>저장</span>
              </button>
              <button
                onClick={handleCancel}
                className="btn-secondary flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>취소</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              닉네임
            </label>
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            ) : (
              <p className="text-gray-900">{userInfo?.nickname || '-'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              학번
            </label>
            <p className="text-gray-900">{userInfo?.student_id || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              전공
            </label>
            {isEditing ? (
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className="input"
                placeholder="전공을 입력하세요"
              />
            ) : (
              <p className="text-gray-900">{userInfo?.major || '-'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              인증 상태
            </label>
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  userInfo?.is_verified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {userInfo?.is_verified ? '인증 완료' : '인증 필요'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


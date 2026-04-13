import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { normalizeUserInfo } from '@/lib/user'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { GraduationCap } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !password) {
      toast.error('학번과 비밀번호를 입력해주세요.')
      return
    }

    setIsLoggingIn(true)
    try {
      const response = await api.login({ studentId, password })

      if (response.accessToken) {
        localStorage.setItem('token', response.accessToken)
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken)
        }
      }

      if (response.user) {
        setUser(normalizeUserInfo(response.user))
      }

      toast.success('로그인되었습니다.')
      navigate('/learning', { replace: true })
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || '로그인에 실패했습니다.'
      toast.error(errorMessage)

      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Failed to fetch')) {
        toast.error('백엔드 서버가 실행 중인지 확인해주세요. (http://localhost:8080)')
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary-600 p-4 rounded-full">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Sejong</h1>
          <p className="text-gray-600 mb-8">세종대학교 포털 계정으로 로그인합니다</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                학번
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="input"
                placeholder="학번을 입력하세요"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-6 text-center">
            세종대학교 포털 인증 후 서비스에 접속합니다.
          </p>
        </div>
      </div>
    </div>
  )
}

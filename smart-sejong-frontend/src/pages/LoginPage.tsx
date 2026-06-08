import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { normalizeUserInfo } from '@/lib/user'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { Icon } from '@/components/ui/Icon'
import sejongLogo from '@/components/image.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')

  const handleDevLogin = async () => {
    setIsLoggingIn(true)
    try {
      const params = new URLSearchParams({ studentId: '99999999', fullName: '마재혁', major: '컴퓨터공학과' })
      const res = await fetch(`http://localhost:8080/api/auth/dev-login?${params}`, { method: 'POST' })
      const json = await res.json()
      const response = json.data
      if (response.accessToken) localStorage.setItem('token', response.accessToken)
      if (response.refreshToken) localStorage.setItem('refreshToken', response.refreshToken)
      if (response.user) setUser(normalizeUserInfo(response.user))
      toast.success('시연 계정으로 로그인했습니다!')
      navigate('/recommendation', { replace: true })
    } catch {
      toast.error('개발 서버가 실행 중인지 확인해주세요.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !password) {
      toast.error('학번과 비밀번호를 입력해주세요.')
      return
    }

    setIsLoggingIn(true)
    try {
      const response = await api.login({ studentId, password })
      
      // JWT 토큰 저장
      if (response.accessToken) {
        localStorage.setItem('token', response.accessToken)
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken)
        }
      }
      
      // 사용자 정보 저장 및 인증 상태 업데이트
      if (response.user) {
        setUser(normalizeUserInfo(response.user))
      }
      
      toast.success('로그인에 성공했습니다!')
      navigate('/recommendation', { replace: true })
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; response?: { data?: { message?: string } } }
      const errorMessage = err.response?.data?.message ?? err.message ?? '로그인에 실패했습니다.'
      toast.error(errorMessage)
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Failed to fetch')) {
        toast.error('백엔드 서버가 실행 중인지 확인해주세요. (http://localhost:8080)')
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 relative">

      {/* 로고 - absolute 고정 */}
      <div className="absolute top-8 left-10 hidden md:flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow">
          <img src={sejongLogo} alt="세종대 로고" className="w-9 h-9 object-contain brightness-[10]" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">Smart Sejong</span>
      </div>

      {/* 본문 - 수직 중앙 정렬 */}
      <div className="min-h-screen flex items-center justify-center px-10">
        <div className="w-full max-w-4xl flex items-center gap-16">

        {/* 왼쪽: 브랜딩 텍스트 */}
        <div className="hidden md:flex flex-1 flex-col">
          <h2 className="text-5xl font-bold text-white leading-tight">
            스마트한<br />시간표 관리
          </h2>
          <p className="text-white/70 mt-4 text-base leading-relaxed">
            조건을 입력하면 최적의 시간표를<br />자동으로 찾아드립니다.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            {[
              '학점·전공·공강 조건 자동 반영',
              '친구와 함께하는 그룹 시간표',
              '기이수 과목 자동 제외',
            ].map((text) => (
              <div key={text} className="flex items-center gap-2.5 text-white/80 text-sm">
                <Icon name="check_circle" size={15} filled className="text-white/60 shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 로그인 폼 */}
        <div className="w-full md:w-96 shrink-0">
          <div className="w-full max-w-sm md:max-w-none">

            {/* 모바일 전용 로고 */}
            <div className="md:hidden flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow">
                <img src={sejongLogo} alt="세종대 로고" className="w-9 h-9 object-contain brightness-[10]" />
              </div>
              <h1 className="text-2xl font-bold text-white">Smart Sejong</h1>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6">로그인</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">학번</label>
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
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">비밀번호</label>
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
                  className="w-full btn-primary py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? '로그인 중...' : '세종대 포털 로그인'}
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-4 text-center">
                세종대학교 포털 계정으로 로그인합니다
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDevLogin}
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition-colors border border-indigo-100"
                >
                  <Icon name="science" size={16} className="text-indigo-500" />
                  시연 계정으로 로그인 (마재혁)
                </button>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  )
}


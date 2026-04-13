import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { normalizeUserInfo } from './lib/user'
import LoginPage from './pages/LoginPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function LoginCompletePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인 완료</h1>
        <p className="text-gray-600 mb-6">
          {user?.nickname ?? '사용자'}님, Smart Sejong에 로그인되었습니다.
        </p>
        <div className="text-sm text-gray-500 space-y-1 mb-6">
          {user?.student_id && <p>학번: {user.student_id}</p>}
          {user?.major && <p>전공: {user.major}</p>}
        </div>
        <button type="button" onClick={handleLogout} className="btn-secondary w-full">
          로그아웃
        </button>
      </div>
    </div>
  )
}

function App() {
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (token && userStr) {
      try {
        const user = normalizeUserInfo(JSON.parse(userStr))
        setUser(user)
      } catch (error) {
        console.error('Failed to parse user info:', error)
      }
    }
  }, [setUser])

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <LoginCompletePage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

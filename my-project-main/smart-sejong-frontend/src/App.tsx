import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import { normalizeUserInfo } from './lib/user'
import LoginPage from './pages/LoginPage'
import LearningPage from './pages/LearningPage'
import RecommendationPage from './pages/RecommendationPage'
import TimetablePage from './pages/TimetablePage'
import GroupPage from './pages/GroupPage'
import ProfilePage from './pages/ProfilePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  // 개발 모드: 개발 중에는 인증 없이 접근 가능하도록 설정
  // 프로덕션 배포 시에는 이 부분을 제거하거나 환경 변수로 제어하세요
  const DEV_MODE = import.meta.env.DEV
  const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH !== 'false' // 기본값: true (개발 편의)
  
  // 개발 모드에서 인증 우회 (백엔드가 permitAll이므로 프론트도 허용)
  if (DEV_MODE && BYPASS_AUTH) {
    return <>{children}</>
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  const setUser = useAuthStore((state) => state.setUser)
  
  // 카카오 로그인 후 localStorage에서 사용자 정보 로드
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
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/learning" replace />} />
          <Route path="learning" element={<LearningPage />} />
          <Route path="recommendation" element={<RecommendationPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="group" element={<GroupPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        {/* 잘못된 경로 처리 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App


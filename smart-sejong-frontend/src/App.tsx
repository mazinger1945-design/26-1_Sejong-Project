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
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
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
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/recommendation" replace />} />
          <Route path="learning" element={<LearningPage />} />
          <Route path="recommendation" element={<RecommendationPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="group" element={<GroupPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        {/* 잘못된 경로 → 로그인 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App


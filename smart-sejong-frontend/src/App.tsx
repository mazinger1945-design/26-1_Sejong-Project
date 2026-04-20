import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { normalizeUserInfo } from './lib/user'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import LearningPage from './pages/LearningPage'
import RecommendationPage from './pages/RecommendationPage'

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
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/learning" replace />} />
          <Route path="learning" element={<LearningPage />} />
          <Route path="recommendation" element={<RecommendationPage />} />
        </Route>
        <Route
          path="*"
          element={
            <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

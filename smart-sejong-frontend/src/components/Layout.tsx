import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { 
  GraduationCap, 
  Sparkles, 
  Calendar, 
  Users, 
  User,
  LogOut 
} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { path: '/learning', label: '학습 현황', icon: GraduationCap },
  { path: '/recommendation', label: 'AI 추천', icon: Sparkles },
  { path: '/timetable', label: '내 시간표', icon: Calendar },
  { path: '/group', label: '그룹 협동', icon: Users },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout: clearUser } = useAuthStore()

  const handleLogout = async () => {
    try {
      await api.logout()
      clearUser()
      navigate('/login')
      toast.success('로그아웃되었습니다.')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-primary-600">Smart Sejong</h1>
              <nav className="hidden md:flex space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary-50 text-primary-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <NavLink
                to="/profile"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <User className="w-5 h-5" />
                <span className="hidden sm:inline">{user?.nickname || user?.student_id || '사용자'}</span>
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-2 px-4 flex-1 ${
                    isActive ? 'text-primary-600' : 'text-gray-600'
                  }`
                }
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        <Outlet />
      </main>
    </div>
  )
}


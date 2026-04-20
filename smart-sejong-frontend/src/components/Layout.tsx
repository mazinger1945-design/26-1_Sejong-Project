import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { CalendarCheck, GraduationCap, LogOut, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { path: '/learning', label: '학습 현황', icon: GraduationCap },
  { path: '/recommendation', label: '시간표 추천', icon: CalendarCheck },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout: clearUser } = useAuthStore()

  const handleLogout = async () => {
    try {
      await api.logout()
    } finally {
      clearUser()
      navigate('/login', { replace: true })
      toast.success('로그아웃되었습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <NavLink to="/learning" className="text-xl font-bold text-primary-600">
              Smart Sejong
            </NavLink>
            <nav className="hidden gap-1 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
                        isActive
                          ? 'bg-primary-50 font-medium text-primary-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <NavLink
              to="/profile"
              className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
            >
              <User className="h-5 w-5" />
              <span className="hidden sm:inline">{user?.nickname || user?.student_id || '사용자'}</span>
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 transition-colors hover:text-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <Outlet />

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center justify-center px-4 py-2 ${
                    isActive ? 'text-primary-600' : 'text-gray-600'
                  }`
                }
              >
                <Icon className="h-6 w-6" />
                <span className="mt-1 text-xs">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

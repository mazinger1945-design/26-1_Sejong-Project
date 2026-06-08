import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'
import toast from 'react-hot-toast'
import sejongLogo from '@/components/image.png'

const navItems = [
  { path: '/learning', label: '학습 현황', icon: 'school' },
  { path: '/recommendation', label: '시간표 추천', icon: 'event_available' },
  { path: '/timetable', label: '내 시간표', icon: 'calendar_month' },
  { path: '/group', label: '그룹 협동', icon: 'group' },
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-sky-600 to-indigo-600 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-5">
              <div className="flex items-center gap-2">
                <img src={sejongLogo} alt="세종대 로고" className="w-7 h-7 object-contain brightness-[10]" />
                <h1 className="text-lg font-bold text-white tracking-tight">Smart Sejong</h1>
              </div>
              <nav className="hidden md:flex space-x-0.5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
                        isActive
                          ? 'bg-white/20 text-white shadow-sm'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <Icon name={item.icon} size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-1">
              <NavLink
                to="/profile"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all text-sm"
              >
                <Icon name="person" size={18} />
                <span className="hidden sm:inline">{user?.nickname || user?.student_id || '사용자'}</span>
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all text-sm"
              >
                <Icon name="logout" size={18} />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t border-gray-100 fixed bottom-0 left-0 right-0 z-50 shadow-[0_-1px_8px_rgba(0,0,0,0.07)]">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-3 flex-1 gap-0.5 transition-colors ${
                  isActive ? 'text-sky-600' : 'text-gray-400'
                }`
              }
            >
              <Icon name={item.icon} size={22} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <Outlet />
      </main>
    </div>
  )
}


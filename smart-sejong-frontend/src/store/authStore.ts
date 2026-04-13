import { create } from 'zustand'
import type { UserInfo } from '@/types'
import { normalizeUserInfo } from '@/lib/user'

interface AuthState {
  user: UserInfo | null
  isAuthenticated: boolean
  setUser: (user: UserInfo | null) => void
  logout: () => void
}

const loadUserFromStorage = (): UserInfo | null => {
  try {
    const stored = localStorage.getItem('user')
    return stored ? normalizeUserInfo(JSON.parse(stored)) : null
  } catch {
    return null
  }
}

const saveUserToStorage = (user: UserInfo | null) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user))
  } else {
    localStorage.removeItem('user')
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUserFromStorage(),
  isAuthenticated: !!loadUserFromStorage(),
  setUser: (user) => {
    const normalized = normalizeUserInfo(user)
    saveUserToStorage(normalized)
    set({ user: normalized, isAuthenticated: !!normalized })
  },
  logout: () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    set({ user: null, isAuthenticated: false })
  },
}))


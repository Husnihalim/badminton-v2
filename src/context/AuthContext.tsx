import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'

const CURRENT_USER_KEY = 'kelabsukan_user'
const USER_STORE_KEY = 'kelabsukan_users'

type AuthUser = User & { passwordHash: string }

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, name: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function getSavedUsers() {
  const raw = window.localStorage.getItem(USER_STORE_KEY)
  if (!raw) return [] as AuthUser[]
  try {
    return JSON.parse(raw) as AuthUser[]
  } catch {
    window.localStorage.removeItem(USER_STORE_KEY)
    return [] as AuthUser[]
  }
}

function saveUsers(users: AuthUser[]) {
  window.localStorage.setItem(USER_STORE_KEY, JSON.stringify(users))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const raw = window.localStorage.getItem(CURRENT_USER_KEY)
    if (raw) {
      try {
        setUser(JSON.parse(raw) as User)
      } catch {
        window.localStorage.removeItem(CURRENT_USER_KEY)
      }
    }
  }, [])

  const getRoleForUser = (email: string, name: string): User['role'] => {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = name.trim().toLowerCase()

    if (normalizedEmail === 'mohdhusni@gmail.com' || normalizedName === 'husni halim') {
      return 'superadmin'
    }

    return 'member'
  }

  const login = useCallback(async (email: string, password: string) => {
    const savedUsers = getSavedUsers()
    const normalizedEmail = email.trim().toLowerCase()
    const found = savedUsers.find((item) => item.email.trim().toLowerCase() === normalizedEmail)
    if (!found) return false

    // Compare hashed password
    const hash = await hashPassword(password)
    if (hash !== found.passwordHash) return false

    const nextUser: User = {
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
    }
    window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
    return true
  }, [])

  const register = useCallback(async (email: string, name: string, password: string) => {
    const savedUsers = getSavedUsers()
    const normalizedEmail = email.trim().toLowerCase()

    const existing = savedUsers.find((item) => item.email.trim().toLowerCase() === normalizedEmail)
    if (existing) return false

    const passwordHash = await hashPassword(password)
    const nextUser: AuthUser = {
      id: `user-${Math.random().toString(16).slice(2)}`,
      email: normalizedEmail,
      name,
      passwordHash,
      role: getRoleForUser(normalizedEmail, name),
    }

    saveUsers([...savedUsers, nextUser])
    const publicUser: User = {
      id: nextUser.id,
      email: nextUser.email,
      name: nextUser.name,
      role: nextUser.role,
    }
    window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser))
    setUser(publicUser)
    return true
  }, [])

  const logout = useCallback(() => {
    window.localStorage.removeItem(CURRENT_USER_KEY)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
    }),
    [user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

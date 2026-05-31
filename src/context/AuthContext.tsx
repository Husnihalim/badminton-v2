import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, name: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const userProfile = await fetchUserProfile(session.user.id)
        setUser(userProfile)
      }
      
      setIsLoading(false)
    }

    checkSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user.id)
          setUser(userProfile)
        } else {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      // Fallback: create basic user from auth metadata
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        return {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          role: authUser.user_metadata?.role || 'member',
        }
      }
      return null
    }

    return {
      id: (data as any).id,
      email: (data as any).email,
      name: (data as any).name,
      role: (data as any).role,
    }
  }

  const getRoleForUser = (email: string, name: string): User['role'] => {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = name.trim().toLowerCase()

    if (normalizedEmail === 'mohdhusni@gmail.com' || normalizedName === 'husni halim') {
      return 'superadmin'
    }

    return 'member'
  }

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: attempting login for', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    console.log('AuthContext: login response', { data, error })

    if (error || !data.user) {
      console.error('Login error:', error?.message)
      return false
    }

    // Wait a moment for the profile trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500))
    const userProfile = await fetchUserProfile(data.user.id)
    if (userProfile) {
      setUser(userProfile)
      return true
    }
    // Fallback: create user from auth data
    setUser({
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.name || email.split('@')[0],
      role: data.user.user_metadata?.role || 'member',
    })
    return true
  }, [])

  const register = useCallback(async (email: string, name: string, password: string): Promise<boolean> => {
    const normalizedEmail = email.trim().toLowerCase()
    const role = getRoleForUser(normalizedEmail, name)

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    })

    if (error || !data.user) {
      console.error('Registration error:', error?.message)
      return false
    }

    // Profile is created automatically by the database trigger
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const userProfile: User = {
      id: data.user.id,
      email: normalizedEmail,
      name,
      role,
    }

    setUser(userProfile)
    return true
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

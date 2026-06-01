import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<User | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type ProfileRow = {
  id: string
  email: string
  name: string
  role: User['role']
  display_name?: string | null
  phone?: string | null
  city?: string | null
  bio?: string | null
  preferred_sport?: string | null
}

type AuthUserFallback = {
  id: string
  email?: string
  user_metadata?: {
    name?: string
    role?: User['role']
  }
}

function getRoleForUser(email: string, name: string): User['role'] {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = name.trim().toLowerCase()

  if (normalizedEmail === 'mohdhusni@gmail.com' || normalizedName === 'husni halim') {
    return 'superadmin'
  }

  return 'member'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserProfile = useCallback(async (
    userId: string,
    authUser?: AuthUserFallback
  ): Promise<User | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      if (authUser) {
        return {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          role: authUser.user_metadata?.role || 'member',
          display_name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        }
      }
      return null
    }

    const profile = data as ProfileRow

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      display_name: profile.display_name,
      phone: profile.phone,
      city: profile.city,
      bio: profile.bio,
      preferred_sport: profile.preferred_sport,
    }
  }, [])

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      setUser(null)
      return null
    }

    const userProfile = await fetchUserProfile(authUser.id, authUser)
    setUser(userProfile)
    return userProfile
  }, [fetchUserProfile])

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const userProfile = await fetchUserProfile(session.user.id, session.user)
          setUser(userProfile)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Session check error:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setTimeout(async () => {
          if (session?.user) {
            const userProfile = await fetchUserProfile(session.user.id, session.user)
            setUser(userProfile)
          } else {
            setUser(null)
          }
          setIsLoading(false)
        }, 0)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUserProfile])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error || !data.user) {
      console.error('Login error:', error?.message)
      return false
    }

    // Wait a moment for the profile trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500))
    const userProfile = await fetchUserProfile(data.user.id, data.user)
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
      display_name: data.user.user_metadata?.name || email.split('@')[0],
    })
    return true
  }, [fetchUserProfile])

  const register = useCallback(async (
    email: string,
    name: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
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
      return {
        success: false,
        error: error?.message || 'Could not create account. Please try again.',
      }
    }

    // Profile is created automatically by the database trigger
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const userProfile: User = {
      id: data.user.id,
      email: normalizedEmail,
      name,
      role,
      display_name: name,
    }

    setUser(userProfile)
    return { success: true }
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
    refreshUser,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'
import { supabase } from '../lib/supabase'
import { ensureCurrentUserProfile } from '../lib/api'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string; emailVerificationRequired?: boolean }>
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
  avatar_url?: string | null
}

type AuthUserFallback = {
  id: string
  email?: string
  user_metadata?: {
    name?: string
  }
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
        try {
          await ensureCurrentUserProfile()
          const { data: repairedProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

          if (repairedProfile) {
            const profile = repairedProfile as ProfileRow
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
              avatar_url: profile.avatar_url,
            }
          }
        } catch (profileError) {
          console.error('Missing profile repair failed:', profileError)
        }

        return {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          role: 'member',
          display_name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          avatar_url: null,
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
      avatar_url: profile.avatar_url,
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
      role: 'member',
      display_name: data.user.user_metadata?.name || email.split('@')[0],
      avatar_url: null,
    })
    return true
  }, [fetchUserProfile])

  const register = useCallback(async (
    email: string,
    name: string,
    password: string
  ): Promise<{ success: boolean; error?: string; emailVerificationRequired?: boolean }> => {
    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name,
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

    if (!data.session) {
      return { success: true, emailVerificationRequired: true }
    }
    
    const userProfile: User = {
      id: data.user.id,
      email: normalizedEmail,
      name,
      role: 'member',
      display_name: name,
      avatar_url: null,
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

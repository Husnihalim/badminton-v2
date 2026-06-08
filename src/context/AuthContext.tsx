import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'
import { supabase } from '../lib/supabase'
import { ensureCurrentUserProfile, logPlatformEvent } from '../lib/api'

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; redirectTo?: string }>
  register: (
    email: string,
    name: string,
    password: string,
    inviteToken?: string | null,
    wantsCreateClub?: boolean,
    postLoginRedirect?: string,
    additionalMetadata?: {
      preferred_sport?: string
      gear?: User['gear']
      city?: string
    }
  ) => Promise<{ success: boolean; error?: string; emailVerificationRequired?: boolean }>
  refreshUser: () => Promise<User | null>
  logout: () => Promise<void>
}

const postLoginRedirectKey = 'kelabsukan.postLoginRedirect'
const pendingVerificationKey = 'kelabsukan.pendingEmailVerification'

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
  is_private?: boolean | null
  social_links?: User['social_links'] | null
  gear?: User['gear'] | null
}

type AuthUserFallback = {
  id: string
  email?: string
  identities?: unknown[]
  user_metadata?: {
    name?: string
    wants_create_club?: boolean
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const manualLoginInProgressRef = useRef(false)

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
              wants_create_club: Boolean(authUser.user_metadata?.wants_create_club),
              display_name: profile.display_name,
              phone: profile.phone,
              city: profile.city,
              bio: profile.bio,
              preferred_sport: profile.preferred_sport,
              avatar_url: profile.avatar_url,
              is_private: profile.is_private,
              social_links: profile.social_links,
              gear: profile.gear,
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
          wants_create_club: Boolean(authUser.user_metadata?.wants_create_club),
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
      wants_create_club: Boolean(authUser?.user_metadata?.wants_create_club),
      display_name: profile.display_name,
      phone: profile.phone,
      city: profile.city,
      bio: profile.bio,
      preferred_sport: profile.preferred_sport,
      avatar_url: profile.avatar_url,
      is_private: profile.is_private,
      social_links: profile.social_links,
      gear: profile.gear,
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
          const hash = typeof window !== 'undefined' ? window.location.hash || '' : ''
          const search = typeof window !== 'undefined' ? window.location.search || '' : ''
          const pendingVerification = getPendingVerification()
          const isAuthCallback = hasAuthCallbackParams(search, hash)
          const isRecoveryCallback = includesAuthType(search, hash, 'recovery')
          const sessionEmail = session?.user?.email?.toLowerCase() || ''
          const pendingEmailMatches = Boolean(pendingVerification?.email && pendingVerification.email === sessionEmail)
          const shouldBlockVerificationAutoLogin = Boolean(
            session?.user &&
            !manualLoginInProgressRef.current &&
            !isRecoveryCallback &&
            (pendingEmailMatches || isEmailVerificationRedirect(search, hash) || isAuthCallback)
          )

          if (shouldBlockVerificationAutoLogin && session?.user) {
            const rememberedRedirect = pendingVerification?.redirectTo || getStorageItem(postLoginRedirectKey) || '/dashboard'
            
            // Clean up the hash/search from URL to avoid re-triggering
            if (typeof window !== 'undefined' && window.history?.replaceState) {
              window.history.replaceState(null, '', window.location.pathname)
            }

            await supabase.auth.signOut()
            setUser(null)
            setIsLoading(false)
            
            // Redirect to login with verified flag and the post-login destination
            window.location.href = `/login?verified=true&redirect=${encodeURIComponent(rememberedRedirect)}`
            return
          }

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

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; redirectTo?: string }> => {
    const normalizedEmail = email.trim().toLowerCase()
    manualLoginInProgressRef.current = true
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    }).finally(() => {
      manualLoginInProgressRef.current = false
    })

    if (error || !data.user) {
      console.error('Login error:', error?.message)
      logPlatformEvent('login_failed', `Failed login attempt for ${email.trim().toLowerCase()}`, 'warning', {
        email: email.trim().toLowerCase(),
        error: error?.message || 'Unknown error'
      })
      return { success: false, error: error?.message || 'Unknown error' }
    }

    // Wait a moment for the profile trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500))
    const userProfile = await fetchUserProfile(data.user.id, data.user)
    if (userProfile) {
      logPlatformEvent('login_success', `User logged in: ${userProfile.email}`, 'info', { email: userProfile.email })
      setUser(userProfile)
      return { success: true, redirectTo: consumePostLoginRedirect(data.user.email || normalizedEmail, userProfile.wants_create_club) }
    }
    // Fallback: create user from auth data
    const fallbackUser: User = {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.name || email.split('@')[0],
      role: 'member',
      wants_create_club: Boolean(data.user.user_metadata?.wants_create_club),
      display_name: data.user.user_metadata?.name || email.split('@')[0],
      avatar_url: null,
    }
    logPlatformEvent('login_success', `User logged in (fallback profile): ${fallbackUser.email}`, 'info', { email: fallbackUser.email })
    setUser(fallbackUser)
    return { success: true, redirectTo: consumePostLoginRedirect(data.user.email || normalizedEmail, fallbackUser.wants_create_club) }
  }, [fetchUserProfile])

  const register = useCallback(async (
    email: string,
    name: string,
    password: string,
    inviteToken?: string | null,
    wantsCreateClub = false,
    postLoginRedirect?: string,
    additionalMetadata?: {
      preferred_sport?: string
      gear?: User['gear']
      city?: string
    }
  ): Promise<{ success: boolean; error?: string; emailVerificationRequired?: boolean }> => {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedInviteToken = inviteToken?.trim().toUpperCase() || null
    const targetRedirect = getSafeAppRedirect(postLoginRedirect || (wantsCreateClub ? '/profile?create_club=true' : '/dashboard'))

    const { data: existingProfile, error: profileLookupError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle()

    if (profileLookupError) {
      console.error('Registration profile lookup error:', profileLookupError.message)
      logPlatformEvent('registration_failed', `Database lookup error for ${normalizedEmail}`, 'error', {
        email: normalizedEmail,
        error: profileLookupError.message
      })
      return {
        success: false,
        error: 'Could not verify this email. Please try again.',
      }
    }

    if (existingProfile) {
      logPlatformEvent('registration_failed', `Email already registered: ${normalizedEmail}`, 'warning', {
        email: normalizedEmail
      })
      return {
        success: false,
        error: 'This email is already registered. Please log in instead.',
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: buildEmailRedirectTo(targetRedirect),
        data: {
          name,
          wants_create_club: wantsCreateClub,
          ...(normalizedInviteToken ? { invite_token: normalizedInviteToken } : {}),
          preferred_sport: additionalMetadata?.preferred_sport || 'badminton',
          gear: additionalMetadata?.gear || {},
          city: additionalMetadata?.city || null,
        },
      },
    })

    if (error || !data.user) {
      console.error('Registration error:', error?.message)
      logPlatformEvent('registration_failed', `Sign up error for ${normalizedEmail}`, 'warning', {
        email: normalizedEmail,
        error: error?.message || 'Unknown error'
      })
      return {
        success: false,
        error: error?.message || 'Could not create account. Please try again.',
      }
    }

    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      logPlatformEvent('registration_failed', `Identity already exists for ${normalizedEmail}`, 'warning', {
        email: normalizedEmail
      })
      return {
        success: false,
        error: 'This email already has an account. Please log in instead.',
      }
    }

    if (!data.session) {
      rememberPendingVerification(normalizedEmail, targetRedirect)
      logPlatformEvent('registration_success', `User registered (verification required): ${normalizedEmail}`, 'info', {
        email: normalizedEmail
      })
      return { success: true, emailVerificationRequired: true }
    }
    
    const userProfile: User = {
      id: data.user.id,
      email: normalizedEmail,
      name,
      role: 'member',
      wants_create_club: wantsCreateClub,
      display_name: name,
      avatar_url: null,
      preferred_sport: additionalMetadata?.preferred_sport || 'badminton',
      gear: additionalMetadata?.gear || {},
      city: additionalMetadata?.city || null,
    }

    logPlatformEvent('registration_success', `User registered and signed in: ${normalizedEmail}`, 'info', {
      email: normalizedEmail
    })
    setUser(userProfile)
    return { success: true }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    const userEmail = user?.email
    await supabase.auth.signOut()
    removeStorageItem(pendingVerificationKey)
    removeStorageItem(postLoginRedirectKey)
    if (userEmail) {
      logPlatformEvent('logout', `User logged out: ${userEmail}`, 'info', { email: userEmail })
    }
    setUser(null)
  }, [user])

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

function getPendingVerification(): { email: string; redirectTo: string } | null {
  try {
    const rawValue = getStorageItem(pendingVerificationKey)
    if (!rawValue) return null
    const parsed = JSON.parse(rawValue) as { email?: string; redirectTo?: string }
    if (!parsed.email) return null
    return {
      email: parsed.email.toLowerCase(),
      redirectTo: getSafeAppRedirect(parsed.redirectTo || '/dashboard'),
    }
  } catch {
    return null
  }
}

function rememberPendingVerification(email: string, redirectTo = '/dashboard') {
  setStorageItem(postLoginRedirectKey, getSafeAppRedirect(redirectTo))
  setStorageItem(
    pendingVerificationKey,
    JSON.stringify({
      email: email.toLowerCase(),
      redirectTo: getSafeAppRedirect(redirectTo),
    })
  )
}

function consumePostLoginRedirect(email: string, wantsCreateClub?: boolean | null) {
  const pendingVerification = getPendingVerification()
  const storedRedirect = getStorageItem(postLoginRedirectKey)
  removeStorageItem(pendingVerificationKey)
  removeStorageItem(postLoginRedirectKey)

  if (pendingVerification?.email === email.toLowerCase()) {
    return pendingVerification.redirectTo
  }

  if (storedRedirect) {
    return getSafeAppRedirect(storedRedirect)
  }

  return wantsCreateClub ? '/profile?create_club=true' : undefined
}

function buildEmailRedirectTo(redirectTo = '/dashboard') {
  if (typeof window === 'undefined') return undefined
  const redirectUrl = `/login?verified=true&redirect=${encodeURIComponent(getSafeAppRedirect(redirectTo))}`
  return `${window.location.origin}${redirectUrl}`
}

function getSafeAppRedirect(value: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

function getStorageItem(key: string) {
  if (typeof window === 'undefined' || typeof window.localStorage?.getItem !== 'function') return null
  return window.localStorage.getItem(key)
}

function setStorageItem(key: string, value: string) {
  if (typeof window === 'undefined' || typeof window.localStorage?.setItem !== 'function') return
  window.localStorage.setItem(key, value)
}

function removeStorageItem(key: string) {
  if (typeof window === 'undefined' || typeof window.localStorage?.removeItem !== 'function') return
  window.localStorage.removeItem(key)
}

function hasAuthCallbackParams(search: string, hash: string) {
  return ['access_token=', 'refresh_token=', 'token_hash=', 'code='].some((param) =>
    search.includes(param) || hash.includes(param)
  )
}

function includesAuthType(search: string, hash: string, type: string) {
  return search.includes(`type=${type}`) || hash.includes(`type=${type}`)
}

function isEmailVerificationRedirect(search: string, hash: string) {
  return ['signup', 'invite', 'email', 'email_change'].some((type) => includesAuthType(search, hash, type))
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

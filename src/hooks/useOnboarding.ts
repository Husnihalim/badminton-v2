import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { User } from '../types'

export type OnboardingStatus = 'pending' | 'started' | 'skipped' | 'completed'

const storageKey = (userId: string, tourId: string) => `kelabsukan.onboarding.${tourId}.${userId}`

function getSnapshot(
  userId: string | undefined,
  tourId: string,
  autoShow: boolean,
  enabled: boolean
): OnboardingStatus {
  if (!enabled || !userId) return 'pending'
  if (typeof window === 'undefined') return 'pending'

  const stored = window.localStorage.getItem(storageKey(userId, tourId))
  if (stored === 'completed' || stored === 'skipped') {
    return stored
  }
  return autoShow ? 'started' : 'pending'
}

function subscribe(userId: string | undefined, tourId: string, callback: () => void) {
  if (typeof window === 'undefined' || !userId) return () => {}

  const key = storageKey(userId, tourId)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === key) callback()
  }

  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}

interface UseOnboardingOptions {
  user: User | null
  tourId: string
  /** Set to false if you want to trigger the tour manually. */
  autoShow?: boolean
  /** Prevents the tour from starting while underlying data is still loading. */
  enabled?: boolean
}

export function useOnboarding({
  user,
  tourId,
  autoShow = true,
  enabled = true,
}: UseOnboardingOptions) {
  const userId = user?.id

  const status = useSyncExternalStore(
    useCallback((callback) => subscribe(userId, tourId, callback), [userId, tourId]),
    () => getSnapshot(userId, tourId, autoShow, enabled),
    () => 'pending'
  )

  const key = useMemo(() => (userId ? storageKey(userId, tourId) : ''), [userId, tourId])

  const notifyChange = useCallback(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new StorageEvent('storage', { key }))
  }, [key])

  const skip = useCallback(() => {
    if (!key || typeof window === 'undefined') return
    window.localStorage.setItem(key, 'skipped')
    notifyChange()
  }, [key, notifyChange])

  const complete = useCallback(() => {
    if (!key || typeof window === 'undefined') return
    window.localStorage.setItem(key, 'completed')
    notifyChange()
  }, [key, notifyChange])

  const reset = useCallback(() => {
    if (!key || typeof window === 'undefined') return
    window.localStorage.removeItem(key)
    notifyChange()
  }, [key, notifyChange])

  return {
    status,
    isVisible: status === 'started',
    skip,
    complete,
    reset,
  }
}

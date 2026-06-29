import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/api/notifications'
import { supabase } from '../lib/supabase'
import type { Notification } from '../types'

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  toast: { message: string; type: 'success' | 'error' | 'info' } | null
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const seenNotificationIds = useRef<Set<string>>(new Set())
  const hasLoadedNotifications = useRef(false)
  const activeUserId = useRef<string | null>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      seenNotificationIds.current.clear()
      hasLoadedNotifications.current = false
      activeUserId.current = null
      return
    }

    try {
      setIsLoading(true)
      if (activeUserId.current !== user.id) {
        seenNotificationIds.current.clear()
        hasLoadedNotifications.current = false
        activeUserId.current = user.id
      }

      const data = await getNotifications()
      const newUnreadNotifications = data.filter((notification) => (
        hasLoadedNotifications.current && !notification.read && !seenNotificationIds.current.has(notification.id)
      ))
      setNotifications(data)
      data.forEach((notification) => seenNotificationIds.current.add(notification.id))
      hasLoadedNotifications.current = true

      if (newUnreadNotifications.length && typeof window !== 'undefined') {
        const latest = newUnreadNotifications[0]
        if ('Notification' in window && window.Notification.permission === 'granted') {
          new window.Notification(latest.title, {
            body: latest.message,
            tag: latest.id,
          })
        }
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([120, 80, 120])
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      )
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [])

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchNotifications()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [fetchNotifications])

  // Realtime handles normal notification updates; the interval is a slow fallback.
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchNotifications()
        }
      )
      .subscribe()

    const fallbackInterval = window.setInterval(() => {
      void fetchNotifications()
    }, 120000)

    return () => {
      window.clearInterval(fallbackInterval)
      void supabase.removeChannel(channel)
    }
  }, [user, fetchNotifications])

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        showToast,
        toast,
      }}
    >
      {children}
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '16px 24px',
            borderRadius: '12px',
            backgroundColor: 
              toast.type === 'success' ? '#059669' : 
              toast.type === 'error' ? '#dc2626' : '#3b82f6',
            color: 'white',
            fontWeight: 500,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          {toast.message}
        </div>
      )}
    </NotificationsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}

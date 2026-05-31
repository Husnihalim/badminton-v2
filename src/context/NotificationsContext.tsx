import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/api'
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

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      return
    }

    try {
      setIsLoading(true)
      const data = await getNotifications()
      setNotifications(data)
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
    fetchNotifications()
  }, [fetchNotifications])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return
    
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => clearInterval(interval)
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

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}

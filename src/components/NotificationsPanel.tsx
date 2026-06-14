import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext'
import type { Notification } from '../types'

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications()
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default'
  )
  const supportsBrowserAlerts = typeof window !== 'undefined' && 'Notification' in window

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingAll(true)
      await markAllAsRead()
    } finally {
      setIsMarkingAll(false)
    }
  }

  const handleEnablePhoneAlerts = async () => {
    if (!supportsBrowserAlerts) return
    const result = await window.Notification.requestPermission()
    setPermission(result)
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    
    const clubId = notification.data?.clubId
    if (typeof clubId === 'string') {
      const isApproved = notification.type === 'join_approved'
      navigate(`/club/${clubId}?tab=noticeboard${isApproved ? '&celebrate=true' : ''}`)
    }
    onClose()
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'join_request': return '👤'
      case 'join_approved': return '✅'
      case 'event_created': return '📅'
      case 'event_reminder': return '📅'
      case 'rsvp_update': return '✓'
      case 'score_recorded': return '🏆'
      case 'announcement': return '📢'
      default: return '📌'
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 998,
        }}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: '400px',
          height: '100vh',
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease-out',
          borderLeft: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Notifications</h2>
            {unreadCount > 0 && (
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                {unreadCount} unread
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {supportsBrowserAlerts && permission !== 'granted' && (
              <button
                className="small-button"
                onClick={handleEnablePhoneAlerts}
              >
                Enable alerts
              </button>
            )}
            {unreadCount > 0 && (
              <button
                className="small-button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
              >
                Mark all read
              </button>
            )}
            <button
              className="small-button"
              onClick={onClose}
              style={{ fontSize: '20px', padding: '4px 12px' }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: notification.read ? 'var(--surface)' : 'rgba(59, 130, 246, 0.06)',
                    border: `1px solid ${notification.read ? 'var(--border)' : 'rgba(59, 130, 246, 0.2)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notification.read ? 'var(--surface-muted)' : 'rgba(59, 130, 246, 0.12)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notification.read ? 'var(--surface)' : 'rgba(59, 130, 246, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '18px', lineHeight: 1, marginTop: '2px' }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <strong style={{ fontSize: '13px', fontWeight: '600' }}>{notification.title}</strong>
                        {!notification.read && (
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#3b82f6',
                              flexShrink: 0,
                              marginTop: '5px',
                            }}
                          />
                        )}
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {notification.message}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '10.5px', color: 'var(--text-muted)', opacity: 0.75 }}>
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  )
}

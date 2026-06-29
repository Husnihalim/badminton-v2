import { useState } from 'react'
import { Megaphone, ChevronRight, Share2, MessageCircle, Copy, X } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useClub, useClubMessages, useMyMembership } from '../hooks/useClubQueries'
import { useCreateClubAnnouncement, useUpdateClubMessage, useDeleteClubMessage } from '../../hooks/useMutations'
import { THEME_MAP } from '../constants'
import { Card, CardContent } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { buildInviteUrl } from '../../../lib/api/clubs'
import type { ClubMessage } from '../../../types'

interface ClubNoticeboardProps {
  clubId: string
  setSuccessMessage: (msg: string) => void
  setActionError: (msg: string) => void
}

export function ClubNoticeboard({ clubId, setSuccessMessage, setActionError }: ClubNoticeboardProps) {
  const { user } = useAuth()
  const { data: club } = useClub(clubId)
  const { data: messages, isLoading: messagesLoading } = useClubMessages(clubId)
  const { data: myMembership } = useMyMembership(clubId, !!user)

  const createAnnouncementMutation = useCreateClubAnnouncement()
  const updateMessageMutation = useUpdateClubMessage(clubId)
  const deleteMessageMutation = useDeleteClubMessage(clubId)

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')
  const [editingMessage, setEditingMessage] = useState<ClubMessage | null>(null)
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({})

  if (!club) return null

  const isAdmin = myMembership?.role === 'owner' || myMembership?.role === 'admin' || user?.role === 'superadmin'
  const accent = club.accent_color || 'emerald'
  const theme = THEME_MAP[accent] || THEME_MAP.emerald
  const inviteUrl = club.invite_code ? buildInviteUrl(club.invite_code) : ''

  const boardShareText = [
    `${club.name} club board`,
    club.description,
    'Join the club to follow announcements and game days.',
    inviteUrl,
  ].filter(Boolean).join('\n')
  const boardWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(boardShareText)}`

  const announcementItems = (messages || []).map((message) => ({
    id: `message-${message.id}`,
    title: message.title,
    body: message.message,
    actor: message.authorName || 'Club admin',
    createdAt: message.created_at,
    message,
  }))

  const toggleExpand = (id: string, isLatest: boolean) => {
    setExpandedMessages(prev => {
      const current = isLatest ? (prev[id] !== false) : !!prev[id];
      return {
        ...prev,
        [id]: !current
      };
    });
  }

  const openCreateMessageModal = () => {
    setEditingMessage(null)
    setAnnouncementTitle('')
    setAnnouncementMessage('')
    setShowAnnouncementModal(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openEditMessageModal = (message: ClubMessage) => {
    setEditingMessage(message)
    setAnnouncementTitle(message.title)
    setAnnouncementMessage(message.message)
    setShowAnnouncementModal(true)
  }

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!announcementTitle.trim() || !announcementMessage.trim()) return

    try {
      await createAnnouncementMutation.mutateAsync({
        clubId,
        title: announcementTitle.trim(),
        message: announcementMessage.trim()
      })
      setAnnouncementTitle('')
      setAnnouncementMessage('')
      setShowAnnouncementModal(false)
      setSuccessMessage('Announcement sent to members.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send announcement')
    }
  }

  const handleUpdateMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMessage || !announcementTitle.trim() || !announcementMessage.trim()) return

    try {
      await updateMessageMutation.mutateAsync({
        messageId: editingMessage.id,
        title: announcementTitle.trim(),
        message: announcementMessage.trim()
      })
      setAnnouncementTitle('')
      setAnnouncementMessage('')
      setEditingMessage(null)
      setShowAnnouncementModal(false)
      setSuccessMessage('Message updated.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update message')
    }
  }

  const handleDeleteMessage = async (message: ClubMessage) => {
    if (!window.confirm(`Delete ${message.title}? This removes the message and related notifications.`)) return

    try {
      await deleteMessageMutation.mutateAsync(message.id)
      setSuccessMessage('Message deleted.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete message')
    }
  }

  const handleNativeBoardShare = async () => {
    if (!inviteUrl) return

    if (!navigator.share) {
      await navigator.clipboard.writeText(inviteUrl)
      setSuccessMessage('General request link copied.')
      setTimeout(() => setSuccessMessage(''), 3000)
      return
    }

    await navigator.share({
      title: `${club.name} club board`,
      text: boardShareText,
      url: inviteUrl,
    })
  }

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setSuccessMessage('General request link copied.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Pinned Noticeboard Announcement */}
      {club.announcement ? (
        <div className="rounded-xl border border-[var(--arena-accent)]/20 bg-[var(--arena-accent-soft)] p-3 shadow-sm sm:p-4">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] text-[var(--arena-accent)] shadow-sm">
              <Megaphone size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-sm font-bold text-[var(--arena-text)]">Pinned Announcement</h3>
                {club.announcement_updated_at ? (
                  <span className="text-xs text-[var(--arena-text-dim)]">
                    Updated {new Date(club.announcement_updated_at).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--arena-text-muted)]">
                {club.announcement}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-4 pt-4 sm:pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--arena-text)]">Club board</h2>
            {isAdmin ? (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleNativeBoardShare}
                  disabled={!inviteUrl}
                  className="h-9 w-9 p-0 flex items-center justify-center cursor-pointer"
                  title="Share board"
                >
                  <Share2 size={15} aria-hidden="true" />
                </Button>
                <a
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface)] text-[var(--arena-text-muted)] transition-colors hover:bg-[var(--arena-surface-muted)] hover:text-[var(--arena-accent)] hover:border-[var(--arena-accent)] cursor-pointer ${
                    !inviteUrl ? 'pointer-events-none opacity-50' : ''
                  }`}
                  href={boardWhatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Share on WhatsApp"
                >
                  <MessageCircle size={15} aria-hidden="true" />
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleCopyInviteLink}
                  disabled={!inviteUrl}
                  className="h-9 w-9 p-0 flex items-center justify-center cursor-pointer"
                  title="Copy invite link"
                >
                  <Copy size={15} aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </div>

          {isAdmin ? (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] p-2 text-left transition-colors hover:bg-[var(--arena-surface-muted)]/80"
              onClick={openCreateMessageModal}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--arena-surface)] text-[var(--arena-accent)] shadow-sm border border-[var(--arena-border)]">
                <Megaphone size={14} aria-hidden="true" />
              </span>
              <span className="min-h-8 flex-1 flex items-center rounded-full border border-[var(--arena-border)] bg-[var(--arena-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--arena-text-muted)]">
                Post an announcement
              </span>
            </button>
          ) : null}

          {announcementItems.length ? (
            <div className="space-y-2.5">
              {announcementItems.map((item, index) => {
                const isLatest = index === 0
                const isExpanded = isLatest 
                  ? (expandedMessages[item.id] !== false) 
                  : !!expandedMessages[item.id]

                return (
                  <div key={item.id} className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)]/50 p-2.5 hover:bg-[var(--arena-surface-muted)]/80 transition-colors">
                    <div className="flex items-start justify-between gap-2.5">
                      <div 
                        className="flex min-w-0 items-start gap-2.5 cursor-pointer flex-1"
                        onClick={() => toggleExpand(item.id, isLatest)}
                      >
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--arena-surface)] ${theme.text} shadow-sm border border-[var(--arena-border)]`}>
                          <Megaphone size={14} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-semibold text-xs text-[var(--arena-text)]">{item.actor}</p>
                            <Badge className="border-blue-200/50 bg-blue-50/10 text-blue-400 text-[9px] px-1 py-0">Announcement</Badge>
                            <span className="text-[9px] text-[var(--arena-text-dim)]">
                              {isExpanded ? 'Click to collapse' : 'Click to expand'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-[var(--arena-text-dim)]">{new Date(item.createdAt).toLocaleString()}</p>
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <p className="break-words font-bold text-xs text-[var(--arena-text)]">{item.title}</p>
                              <span className="text-[var(--arena-text-dim)]">
                                <ChevronRight className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} size={14} />
                              </span>
                            </div>
                            
                            {isExpanded && (
                              <p className="mt-1.5 whitespace-pre-wrap break-words rounded border border-[var(--arena-border)]/50 bg-[var(--arena-surface)]/75 p-2 text-xs leading-relaxed text-[var(--arena-text-muted)]">
                                {item.body}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {isAdmin ? (
                        <div className="flex items-center gap-1 shrink-0 self-start">
                          <Button 
                            type="button" 
                            size="icon" 
                            variant="ghost" 
                            className="min-h-8 h-8 w-8 p-0 text-[var(--arena-text-muted)] hover:bg-red-500/10 hover:text-red-400 rounded-lg flex items-center justify-center shrink-0" 
                            onClick={(e) => { e.stopPropagation(); handleDeleteMessage(item.message); }} 
                            disabled={deleteMessageMutation.isPending}
                            title="Delete announcement"
                          >
                            <X size={16} aria-hidden="true" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-[var(--arena-border)] p-6 text-center text-sm text-[var(--arena-text-muted)]">
              {messagesLoading ? 'Loading announcements...' : 'No announcements yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAnnouncementModal && isAdmin} onOpenChange={(open) => { if (!open) { setShowAnnouncementModal(false); setEditingMessage(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMessage ? 'Edit message' : 'Notify members'}</DialogTitle>
            <DialogDescription>{editingMessage ? 'Update the message and member notifications.' : 'Send news or updates to all active club members.'}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={editingMessage ? handleUpdateMessage : handleSendAnnouncement}>
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
              <span>Title *</span>
              <Input type="text" placeholder="e.g. Court changed this Friday" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} maxLength={120} required />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold text-[var(--arena-text-muted)]">
              <span>Message *</span>
              <Textarea placeholder="Write the update members should see." value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} maxLength={1000} required />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => { setShowAnnouncementModal(false); setEditingMessage(null) }} disabled={createAnnouncementMutation.isPending || updateMessageMutation.isPending}>Cancel</Button>
              <Button type="submit" disabled={createAnnouncementMutation.isPending || updateMessageMutation.isPending}>
                {createAnnouncementMutation.isPending || updateMessageMutation.isPending ? 'Sending...' : editingMessage ? 'Save' : 'Send'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

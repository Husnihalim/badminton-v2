import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Share2, Palette, Check, MessageCircle, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import type { MatchWithDetails } from '../types'
import { useAuth } from '../context/AuthContext'
import { toggleMatchReaction, addMatchComment, deleteMatchComment } from '../lib/api'

interface MatchScoreboardProps {
  match: MatchWithDetails & { clubName?: string }
  onShare?: (match: MatchWithDetails & { clubName?: string }) => void
  showClubName?: boolean
  isAdmin?: boolean
  onEdit?: (match: MatchWithDetails & { clubName?: string }) => void
  onDelete?: (matchId: string) => void
}

export function MatchScoreboard({
  match,
  onShare,
  showClubName = true,
  isAdmin = false,
  onEdit,
  onDelete,
}: MatchScoreboardProps) {
  const scoreSets = match.score_sets || []
  const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
  const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
  const winner = team1Sets > team2Sets ? 1 : team2Sets > team1Sets ? 2 : 0

  const team1 = match.participants.filter((p) => p.team === 1)
  const team2 = match.participants.filter((p) => p.team === 2)

  // Card background theme state
  const [cardTheme, setCardTheme] = useState<'adaptive' | 'light' | 'dark' | 'forest' | 'ocean' | 'clay'>(() => {
    const saved = localStorage.getItem('scoreboard-card-theme')
    if (saved === 'adaptive' || saved === 'light' || saved === 'dark' || saved === 'forest' || saved === 'ocean' || saved === 'clay') {
      return saved
    }
    return 'adaptive'
  })

  const [isSystemDark, setIsSystemDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { user } = useAuth()
  const [reactions, setReactions] = useState(match.reactions || [])
  const [comments, setComments] = useState(match.comments || [])
  const [showComments, setShowComments] = useState(false)
  const [newCommentText, setNewCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const optimisticReactionCounterRef = useRef(0)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setReactions(match.reactions || [])
      setComments(match.comments || [])
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [match.reactions, match.comments])

  const handleToggleReaction = async (emoji: string) => {
    if (!user) return
    
    // Optimistic UI updates
    const hasAlreadyReacted = reactions.some(r => r.user_id === user.id && r.reaction === emoji)
    let updatedReactions = [...reactions]
    
    if (hasAlreadyReacted) {
      updatedReactions = updatedReactions.filter(r => !(r.user_id === user.id && r.reaction === emoji))
    } else {
      optimisticReactionCounterRef.current += 1
      updatedReactions.push({
        id: `temp-id-${optimisticReactionCounterRef.current}`,
        match_id: match.id,
        user_id: user.id,
        reaction: emoji,
        created_at: new Date().toISOString(),
        name: user.name,
        display_name: user.display_name || user.name
      })
    }
    
    setReactions(updatedReactions)
    
    try {
      await toggleMatchReaction(match.id, emoji)
    } catch (err) {
      console.error('Failed to toggle reaction:', err)
      setReactions(reactions)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newCommentText.trim() || isSubmittingComment) return

    try {
      setIsSubmittingComment(true)
      const newComment = await addMatchComment(match.id, newCommentText.trim())
      setComments(prev => [...prev, newComment])
      setNewCommentText('')
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return
    
    // Optimistic UI update
    const previousComments = [...comments]
    setComments(prev => prev.filter(c => c.id !== commentId))
    
    try {
      await deleteMatchComment(commentId)
    } catch (err) {
      console.error('Failed to delete comment:', err)
      setComments(previousComments)
    }
  }

  const reactionEmojis = ['🔥', '💪', '👏', '🎯', '😱', '😢']

  const getReactionCount = (emoji: string) => {
    return reactions.filter(r => r.reaction === emoji).length
  }

  const hasReacted = (emoji: string) => {
    return user ? reactions.some(r => r.user_id === user.id && r.reaction === emoji) : false
  }

  // Listen to external theme changes (so multiple cards sync together)
  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<'adaptive' | 'light' | 'dark' | 'forest' | 'ocean' | 'clay'>
      if (customEvent.detail) {
        setCardTheme(customEvent.detail)
      }
    }
    window.addEventListener('scoreboard-theme-change', handleThemeChange)

    const observer = new MutationObserver(() => {
      setIsSystemDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      window.removeEventListener('scoreboard-theme-change', handleThemeChange)
      observer.disconnect()
    }
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false)
      }
    }
    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isThemeMenuOpen])

  const updateTheme = (newTheme: typeof cardTheme) => {
    setCardTheme(newTheme)
    localStorage.setItem('scoreboard-card-theme', newTheme)
    window.dispatchEvent(new CustomEvent('scoreboard-theme-change', { detail: newTheme }))
  }

  const effectiveTheme = cardTheme === 'adaptive' ? (isSystemDark ? 'dark' : 'light') : cardTheme

  // Theme styling configurations
  const themeStyles = {
    light: {
      card: 'bg-white border-slate-200 hover:border-slate-350 shadow-sm text-slate-800',
      borderL1: 'border-l-4 border-l-orange-500',
      borderL2: 'border-l-4 border-l-emerald-600',
      topBar: 'bg-slate-50/80 border-b border-slate-200/60',
      title: 'text-slate-550 font-bold',
      meta: 'text-slate-400 font-medium',
      actionBtn: 'text-slate-400 hover:text-slate-800 hover:bg-slate-100',
      actionBtnDelete: 'text-red-500 hover:text-red-705 hover:bg-red-50',
      team1: winner === 1 ? 'text-orange-600 font-extrabold' : 'text-orange-600/60 font-medium',
      team2: winner === 2 ? 'text-emerald-700 font-extrabold' : 'text-emerald-700/60 font-medium',
      teamSeparator: 'text-slate-350',
      setLabel: 'text-slate-450',
      setBox1Won: 'bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/15',
      setBox1Lost: 'bg-slate-50 border-orange-200/50 text-orange-600/60',
      setBox2Won: 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/15',
      setBox2Lost: 'bg-slate-50 border-emerald-200/50 text-emerald-700/60',
    },
    dark: {
      card: 'bg-[#0b1322] border-slate-800 hover:border-slate-700 shadow-lg text-slate-100',
      borderL1: 'border-l-4 border-l-[#f97316]',
      borderL2: 'border-l-4 border-l-[#22c55e]',
      topBar: 'bg-[#070b13] border-b border-slate-800/60',
      title: 'text-slate-400 font-bold',
      meta: 'text-slate-550 font-medium',
      actionBtn: 'text-slate-400 hover:text-white hover:bg-slate-800',
      actionBtnDelete: 'text-red-400 hover:text-red-300 hover:bg-red-950/45',
      team1: winner === 1 ? 'text-[#f97316] font-extrabold' : 'text-orange-500/50 font-medium',
      team2: winner === 2 ? 'text-[#22c55e] font-extrabold' : 'text-emerald-500/50 font-medium',
      teamSeparator: 'text-slate-650',
      setLabel: 'text-slate-500',
      setBox1Won: 'bg-[#f97316] border-[#f97316] text-[#090f17] shadow-sm shadow-orange-500/25',
      setBox1Lost: 'bg-[#121c2c] border-orange-500/20 text-[#f97316]/50',
      setBox2Won: 'bg-[#22c55e] border-[#22c55e] text-[#090f17] shadow-sm shadow-emerald-500/25',
      setBox2Lost: 'bg-[#121c2c] border-emerald-500/20 text-[#22c55e]/50',
    },
    forest: {
      card: 'bg-[#031d12] border-emerald-900/65 hover:border-emerald-800 shadow-lg text-emerald-50',
      borderL1: 'border-l-4 border-l-orange-500',
      borderL2: 'border-l-4 border-l-emerald-400',
      topBar: 'bg-[#01140b] border-b border-emerald-950/50',
      title: 'text-emerald-400 font-bold',
      meta: 'text-emerald-600/80 font-medium',
      actionBtn: 'text-emerald-500 hover:text-white hover:bg-emerald-900/50',
      actionBtnDelete: 'text-red-400 hover:text-red-350 hover:bg-red-950/40',
      team1: winner === 1 ? 'text-orange-400 font-extrabold' : 'text-orange-500/55 font-medium',
      team2: winner === 2 ? 'text-emerald-300 font-extrabold' : 'text-emerald-500/55 font-medium',
      teamSeparator: 'text-emerald-800/80',
      setLabel: 'text-emerald-600',
      setBox1Won: 'bg-orange-500 border-orange-500 text-slate-950 shadow-sm shadow-orange-500/25',
      setBox1Lost: 'bg-[#031d12] border-orange-500/20 text-orange-400/50',
      setBox2Won: 'bg-emerald-450 border-emerald-450 text-slate-950 shadow-sm shadow-emerald-500/25',
      setBox2Lost: 'bg-[#031d12] border-emerald-450/20 text-emerald-400/50',
    },
    ocean: {
      card: 'bg-[#091526] border-blue-900/65 hover:border-blue-800 shadow-lg text-blue-50',
      borderL1: 'border-l-4 border-l-orange-500',
      borderL2: 'border-l-4 border-l-emerald-400',
      topBar: 'bg-[#050c17] border-b border-blue-950/50',
      title: 'text-blue-450 font-bold',
      meta: 'text-slate-500 font-medium',
      actionBtn: 'text-blue-500 hover:text-white hover:bg-blue-900/40',
      actionBtnDelete: 'text-red-400 hover:text-red-300 hover:bg-red-950/40',
      team1: winner === 1 ? 'text-orange-450 font-extrabold' : 'text-orange-500/55 font-medium',
      team2: winner === 2 ? 'text-emerald-450 font-extrabold' : 'text-emerald-500/55 font-medium',
      teamSeparator: 'text-blue-900/60',
      setLabel: 'text-blue-700/80',
      setBox1Won: 'bg-orange-500 border-orange-500 text-slate-950 shadow-sm shadow-orange-500/25',
      setBox1Lost: 'bg-[#091526] border-orange-500/20 text-orange-400/50',
      setBox2Won: 'bg-emerald-450 border-emerald-450 text-slate-950 shadow-sm shadow-emerald-400/25',
      setBox2Lost: 'bg-[#091526] border-emerald-400/20 text-emerald-400/50',
    },
    clay: {
      card: 'bg-[#240e06] border-orange-950/65 hover:border-orange-900 shadow-lg text-orange-50',
      borderL1: 'border-l-4 border-l-orange-400',
      borderL2: 'border-l-4 border-l-emerald-500',
      topBar: 'bg-[#160803] border-b border-orange-980/50',
      title: 'text-orange-400 font-bold',
      meta: 'text-orange-650/80 font-medium',
      actionBtn: 'text-orange-500 hover:text-white hover:bg-orange-900/50',
      actionBtnDelete: 'text-red-400 hover:text-red-300 hover:bg-red-950/40',
      team1: winner === 1 ? 'text-orange-350 font-extrabold' : 'text-orange-450/55 font-medium',
      team2: winner === 2 ? 'text-emerald-400 font-extrabold' : 'text-emerald-450/55 font-medium',
      teamSeparator: 'text-orange-900/80',
      setLabel: 'text-orange-700/80',
      setBox1Won: 'bg-orange-400 border-orange-400 text-slate-950 shadow-sm shadow-orange-400/25',
      setBox1Lost: 'bg-[#240e06] border-orange-450/20 text-orange-350/50',
      setBox2Won: 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/25',
      setBox2Lost: 'bg-[#240e06] border-emerald-500/20 text-emerald-400/50',
    }
  }

  const s = themeStyles[effectiveTheme] || themeStyles.light

  const themeOptions = [
    { id: 'adaptive', label: 'Adaptive (Auto)', icon: '🌓' },
    { id: 'light', label: 'Clean Light', icon: '☀️' },
    { id: 'dark', label: 'Sporty Dark', icon: '🌑' },
    { id: 'forest', label: 'Grass Court', icon: '🌱' },
    { id: 'ocean', label: 'Deep Ocean', icon: '🌊' },
    { id: 'clay', label: 'Clay Court', icon: '🧱' },
  ] as const

  return (
    <div
      className={`relative rounded-xl border overflow-visible shadow-lg transition duration-200 ${s.card} ${
        winner === 1 ? s.borderL1 : winner === 2 ? s.borderL2 : ''
      }`}
    >
      {/* Top Bar: Title, Meta, and Action Buttons */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl ${s.topBar}`}>
        <div className="min-w-0">
          <span className={`text-xs font-bold uppercase tracking-widest block truncate ${s.title}`}>
            {match.title || `${match.sport} Match`}
          </span>
          <span className={`text-[10px] font-medium block truncate ${s.meta}`}>
            {match.sport} • {match.match_type} • {showClubName && match.clubName ? `${match.clubName} • ` : ''}
            {new Date(match.match_date).toLocaleDateString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Theme Selector */}
          <div className="relative" ref={menuRef}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              title="Change Card Theme"
              className={`h-7 w-7 rounded-lg ${s.actionBtn}`}
            >
              <Palette size={13} aria-hidden="true" />
            </Button>

            {isThemeMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-xl z-50 text-left text-xs text-slate-800 dark:text-slate-100"
                style={{ top: '100%' }}
              >
                <div className="px-2.5 py-1 text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[8px] font-black">
                  Card Theme
                </div>
                <div className="py-0.5">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        updateTheme(opt.id)
                        setIsThemeMenuOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition font-semibold ${
                        cardTheme === opt.id ? 'bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-455' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm leading-none">{opt.icon}</span>
                        <span className="leading-none">{opt.label}</span>
                      </div>
                      {cardTheme === opt.id && <Check size={11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {onShare && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onShare(match)}
              title="Share Scorecard"
              className={`h-7 w-7 rounded-lg ${s.actionBtn}`}
            >
              <Share2 size={13} aria-hidden="true" />
            </Button>
          )}
          {isAdmin && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(match)}
              title="Edit score"
              className={`h-7 w-7 flex items-center justify-center rounded-lg transition ${s.actionBtn}`}
            >
              <span className="text-xs">✏️</span>
            </button>
          )}
          {isAdmin && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(match.id)}
              title="Delete score"
              className={`h-7 w-7 flex items-center justify-center rounded-lg transition ${s.actionBtnDelete}`}
            >
              <span className="text-xs">🗑️</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scoreboard Area (Two rows, with name & set boxes) */}
      <div className="p-4 flex items-center justify-between gap-4">
        {/* Left Panel: Teams */}
        <div className="space-y-3.5 flex-1 min-w-0">
          {/* Row Team 1 */}
          <div className="flex items-center gap-2">
            {winner === 1 && (
              <span className="text-amber-400 font-bold shrink-0 animate-pulse" title="Winner">
                👑
              </span>
            )}
            <div
              className={`truncate text-sm md:text-base font-extrabold uppercase tracking-wide flex flex-wrap items-center gap-1.5 ${s.team1}`}
            >
              {team1.map((p, pIdx) => {
                const pName = p.name || p.guest_name || 'Guest'
                return (
                  <span key={pIdx} className="flex items-center">
                    {p.user_id ? (
                      <Link to={`/member/${p.user_id}`} className="hover:underline">
                        {pName}
                      </Link>
                    ) : (
                      <span>{pName}</span>
                    )}
                    {pIdx < team1.length - 1 && <span className={`mx-1 ${s.teamSeparator} font-normal`}>&</span>}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Row Team 2 */}
          <div className="flex items-center gap-2">
            {winner === 2 && (
              <span className="text-amber-400 font-bold shrink-0 animate-pulse" title="Winner">
                👑
              </span>
            )}
            <div
              className={`truncate text-sm md:text-base font-extrabold uppercase tracking-wide flex flex-wrap items-center gap-1.5 ${s.team2}`}
            >
              {team2.map((p, pIdx) => {
                const pName = p.name || p.guest_name || 'Guest'
                return (
                  <span key={pIdx} className="flex items-center">
                    {p.user_id ? (
                      <Link to={`/member/${p.user_id}`} className="hover:underline">
                        {pName}
                      </Link>
                    ) : (
                      <span>{pName}</span>
                    )}
                    {pIdx < team2.length - 1 && <span className={`mx-1 ${s.teamSeparator} font-normal`}>&</span>}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Sets Grid Boxes */}
        <div className="flex items-center gap-1.5 shrink-0">
          {scoreSets.map((set, setIdx) => {
            const t1Won = set.team1_score > set.team2_score
            const t2Won = set.team2_score > set.team1_score

            return (
              <div key={setIdx} className="flex flex-col gap-1 text-center">
                <span className={`text-[8px] font-bold uppercase tracking-widest block mb-0.5 ${s.setLabel}`}>
                  SET {set.set_number || setIdx + 1}
                </span>

                {/* Team 1 Box */}
                <div
                  className={`w-10 h-10 rounded flex items-center justify-center font-mono font-black text-lg border transition ${
                    t1Won ? s.setBox1Won : s.setBox1Lost
                  }`}
                >
                  {set.team1_score}
                </div>

                {/* Team 2 Box */}
                <div
                  className={`w-10 h-10 rounded flex items-center justify-center font-mono font-black text-lg border transition ${
                    t2Won ? s.setBox2Won : s.setBox2Lost
                  }`}
                >
                  {set.team2_score}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reactions and Comments toggle row */}
      <div className="border-t border-slate-100 dark:border-slate-800/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {reactionEmojis.map((emoji) => {
            const count = getReactionCount(emoji)
            const active = hasReacted(emoji)
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggleReaction(emoji)}
                disabled={!user}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border transition select-none cursor-pointer ${
                  active
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-250 dark:border-emerald-800 font-bold"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-100"
                }`}
                title={!user ? "Login to react" : ""}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="text-[10px] font-extrabold">{count}</span>}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-slate-500 hover:text-slate-850 dark:hover:text-white transition select-none cursor-pointer"
        >
          <MessageCircle size={14} />
          <span className="font-bold">{comments.length > 0 ? `${comments.length} Comments` : 'Comment'}</span>
        </button>
      </div>

      {/* Comments Panel */}
      {showComments && (
        <div className="border-t border-slate-150/60 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-b-xl space-y-4">
          {/* Feed */}
          {comments.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {comments.map((comment) => {
                const canDelete = user && (
                  comment.user_id === user.id || 
                  isAdmin || 
                  user.role === 'superadmin'
                )
                return (
                  <div key={comment.id} className="flex gap-2.5 items-start text-xs">
                    <div className="h-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 uppercase shadow-sm">
                      {comment.display_name ? comment.display_name.slice(0, 2).toUpperCase() : 'M'}
                    </div>
                    <div className="flex-1 min-w-0 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-850 shadow-sm space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-150 truncate">
                          {comment.display_name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-semibold">
                          {new Date(comment.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-250 break-words leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-slate-450 hover:text-red-650 transition shrink-0 self-center"
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-slate-450 dark:text-slate-550 py-3 italic">
              No comments yet. Start the conversation!
            </p>
          )}

          {/* Form */}
          {user ? (
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                maxLength={280}
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a comment..."
                disabled={isSubmittingComment}
                className="flex-1 min-w-0 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-150 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 shadow-sm"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newCommentText.trim()}
                className="bg-emerald-650 hover:bg-emerald-750 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition shrink-0 select-none cursor-pointer disabled:opacity-50"
              >
                Post
              </button>
            </form>
          ) : (
            <p className="text-center text-xs text-slate-450 dark:text-slate-550 pt-1">
              Please <Link to="/login" className="text-emerald-750 font-bold hover:underline">login</Link> to post comments.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

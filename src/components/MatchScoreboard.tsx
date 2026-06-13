import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Share2, Palette, Check } from 'lucide-react'
import { Button } from './ui/button'
import type { MatchWithDetails } from '../types'
import { PlayerCard } from './PlayerCard'
import { cn } from '../lib/utils'

interface MatchScoreboardProps {
  match: MatchWithDetails & { clubName?: string }
  onShare?: (match: MatchWithDetails & { clubName?: string }) => void
  showClubName?: boolean
  isAdmin?: boolean
  onEdit?: (match: MatchWithDetails & { clubName?: string }) => void
  onDelete?: (matchId: string) => void
}

type CardTheme = 'adaptive' | 'light' | 'dark' | 'forest' | 'ocean' | 'clay'

export function MatchScoreboard({
  match,
  onShare,
  showClubName = true,
  isAdmin = false,
  onEdit,
  onDelete,
}: MatchScoreboardProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const [showLineup, setShowLineup] = useState(false)
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false)
  const [isSystemDark, setIsSystemDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [cardTheme, setCardTheme] = useState<CardTheme>(() => {
    const saved = localStorage.getItem('scoreboard-card-theme')
    return saved === 'adaptive' || saved === 'light' || saved === 'dark' || saved === 'forest' || saved === 'ocean' || saved === 'clay'
      ? saved
      : 'dark'
  })

  const team1 = match.participants.filter((p) => p.team === 1)
  const team2 = match.participants.filter((p) => p.team === 2)
  const firstSet = match.score_sets?.[0]
  const team1Score = firstSet ? String(firstSet.team1_score) : '0'
  const team2Score = firstSet ? String(firstSet.team2_score) : '0'
  const scoreSets = match.score_sets || []
  const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
  const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
  const winner = team1Sets > team2Sets ? 1 : team2Sets > team1Sets ? 2 : 0

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<CardTheme>
      if (customEvent.detail) setCardTheme(customEvent.detail)
    }
    window.addEventListener('scoreboard-theme-change', handleThemeChange)

    const observer = new MutationObserver(() => setIsSystemDark(document.documentElement.classList.contains('dark')))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      window.removeEventListener('scoreboard-theme-change', handleThemeChange)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsThemeMenuOpen(false)
    }
    if (isThemeMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isThemeMenuOpen])

  const effectiveTheme = cardTheme === 'adaptive' ? (isSystemDark ? 'dark' : 'light') : cardTheme

  const themeStyles: Record<CardTheme, { card: string; topBar: string; actionBtn: string; actionBtnDelete: string; label: string; pair: string; pairWinner: string; accentBorder: string }> = {
    adaptive: { card: 'bg-[var(--arena-surface)] border-[var(--arena-border)] text-[var(--arena-text)]', topBar: 'bg-[var(--arena-surface-muted)]/90 border-b border-[var(--arena-border)]', actionBtn: 'text-[var(--arena-text-dim)] hover:text-[var(--arena-text)] hover:bg-[var(--arena-surface-muted)]', actionBtnDelete: 'text-red-500 hover:text-red-300 hover:bg-red-950/40', label: 'text-[var(--arena-text-dim)]', pair: 'text-[var(--arena-text-dim)]', pairWinner: 'text-[var(--arena-accent)]', accentBorder: 'border-l-[var(--arena-accent)]' },
    light: { card: 'bg-[var(--arena-surface)] border-[var(--arena-border)] text-[var(--arena-text)]', topBar: 'bg-[var(--arena-surface-muted)]/90 border-b border-[var(--arena-border)]', actionBtn: 'text-[var(--arena-text-dim)] hover:text-[var(--arena-text)] hover:bg-[var(--arena-surface-muted)]', actionBtnDelete: 'text-red-500 hover:text-red-300 hover:bg-red-950/40', label: 'text-[var(--arena-text-dim)]', pair: 'text-[var(--arena-text-dim)]', pairWinner: 'text-[var(--arena-accent)]', accentBorder: 'border-l-[var(--arena-accent)]' },
    dark: { card: 'bg-[var(--arena-surface)] border-[var(--arena-border)] text-[var(--arena-text)]', topBar: 'bg-[var(--arena-bg)] border-b border-[var(--arena-border)]', actionBtn: 'text-[var(--arena-text-dim)] hover:text-[var(--arena-text)] hover:bg-[var(--arena-surface-muted)]', actionBtnDelete: 'text-red-500 hover:text-red-300 hover:bg-red-950/40', label: 'text-[var(--arena-text-dim)]', pair: 'text-[var(--arena-text-dim)]', pairWinner: 'text-[var(--arena-accent)]', accentBorder: 'border-l-[var(--arena-accent)]' },
    forest: { card: 'bg-[#031d12] border-emerald-900/65 text-emerald-50', topBar: 'bg-[#01140b] border-b border-emerald-950/50', actionBtn: 'text-emerald-400 hover:text-white hover:bg-emerald-900/50', actionBtnDelete: 'text-red-400 hover:text-red-300 hover:bg-red-950/40', label: 'text-emerald-500/80', pair: 'text-emerald-400/60', pairWinner: 'text-emerald-300', accentBorder: 'border-l-emerald-400' },
    ocean: { card: 'bg-[#091526] border-blue-900/65 text-blue-50', topBar: 'bg-[#050c17] border-b border-blue-950/50', actionBtn: 'text-blue-400 hover:text-white hover:bg-blue-900/40', actionBtnDelete: 'text-red-400 hover:text-red-300 hover:bg-red-950/40', label: 'text-blue-500/80', pair: 'text-blue-300/60', pairWinner: 'text-blue-300', accentBorder: 'border-l-blue-400' },
    clay: { card: 'bg-[#240e06] border-orange-950/65 text-orange-50', topBar: 'bg-[#160803] border-b border-orange-980/50', actionBtn: 'text-orange-400 hover:text-white hover:bg-orange-900/50', actionBtnDelete: 'text-red-400 hover:text-red-300 hover:bg-red-950/40', label: 'text-orange-400/80', pair: 'text-orange-300/60', pairWinner: 'text-orange-300', accentBorder: 'border-l-orange-400' },
  }

  const s = themeStyles[effectiveTheme]

  const updateTheme = (newTheme: CardTheme) => {
    setCardTheme(newTheme)
    localStorage.setItem('scoreboard-card-theme', newTheme)
    window.dispatchEvent(new CustomEvent('scoreboard-theme-change', { detail: newTheme }))
  }

  const teamLine = (players: typeof team1, isWinner: boolean) => (
    <div className="flex items-center gap-2 min-w-0">
      {isWinner && <span className="text-[var(--arena-accent)] text-[12px] leading-none shrink-0">👑</span>}
      <div className={cn('min-w-0 flex flex-wrap items-center gap-1.5 uppercase tracking-wide font-semibold text-[12px] sm:text-[13px] leading-none', isWinner ? s.pairWinner : s.pair)}>
        {players.map((p, idx) => {
          const name = p.name || p.guest_name || 'Guest'
          const avatarUrl = p.profile?.avatar_url
          const avatarEl = avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-[18px] w-[18px] rounded-full object-cover border border-[var(--arena-border)] mr-1 shrink-0" />
          ) : (
            <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--arena-surface-muted)] text-[8px] font-black text-[var(--arena-text-muted)] border border-[var(--arena-border)] mr-1 uppercase">
              {name.charAt(0)}
            </div>
          )
          return (
            <span key={p.id || idx} className="min-w-0 flex items-center">
              <span className="relative group inline-flex items-center min-w-0">
                {p.user_id ? (
                  <Link to={`/member/${p.user_id}`} className="hover:underline inline-flex items-center min-w-0">
                    {avatarEl}
                    <span className="truncate">{name}</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center min-w-0">
                    {avatarEl}
                    <span className="truncate">{name}</span>
                  </span>
                )}
                {p.profile && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[60] w-60 text-left pointer-events-none">
                    <PlayerCard profile={p.profile} isSimplified={true} className="border-[var(--arena-accent)]/20 shadow-2xl shadow-black bg-[var(--arena-bg)] text-[var(--arena-text)]" />
                  </div>
                )}
              </span>
              {idx < players.length - 1 && <span className="mx-1 text-[var(--arena-text-dim)] font-normal">&</span>}
            </span>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className={cn('relative w-full max-w-[560px] mx-auto overflow-hidden rounded-2xl border shadow-lg', s.card, winner ? s.accentBorder : '')}>
      <div className={cn('flex items-center justify-between gap-2 px-3 py-2', s.topBar)}>
        <div className="min-w-0 flex-1">
          <div className={cn('truncate text-[11px] font-black uppercase tracking-[0.22em]', s.label)}>{match.title || `${match.sport} Match`}</div>
          <div className="truncate text-[10px] leading-4 text-[var(--arena-text-dim)]">{match.sport} • {match.match_type} • {showClubName && match.clubName ? `${match.clubName} • ` : ''}{new Date(match.match_date).toLocaleDateString()}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0" ref={menuRef}>
          <Button type="button" variant="ghost" size="icon" onClick={() => setIsThemeMenuOpen((v) => !v)} className={cn('h-6 w-6 rounded-lg', s.actionBtn)}><Palette size={13} /></Button>
          {isThemeMenuOpen && (
            <div className="absolute right-3 top-full mt-1.5 w-44 rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface-elevated)] p-1 shadow-xl z-50">
              {(['adaptive','light','dark','forest','ocean','clay'] as CardTheme[]).map((opt) => (
                <button key={opt} type="button" onClick={() => { updateTheme(opt); setIsThemeMenuOpen(false) }} className={cn('w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold', cardTheme === opt ? 'bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]' : 'text-[var(--arena-text-dim)] hover:bg-[var(--arena-surface-muted)] hover:text-[var(--arena-text)]')}>
                  <span className="flex items-center gap-2 min-w-0"><span>{opt === 'adaptive' ? '🌓' : opt === 'light' ? '☀️' : opt === 'dark' ? '🌑' : opt === 'forest' ? '🌱' : opt === 'ocean' ? '🌊' : '🧱'}</span><span className="truncate">{opt}</span></span>
                  {cardTheme === opt && <Check size={11} />}
                </button>
              ))}
            </div>
          )}
          <Button type="button" variant="ghost" size="icon" onClick={() => setShowLineup((v) => !v)} title="Lineup specs" className={cn('h-6 w-6 rounded-lg', s.actionBtn)}><span className="text-xs">👥</span></Button>
          {onShare && <Button type="button" variant="ghost" size="icon" onClick={() => onShare(match)} className={cn('h-6 w-6 rounded-lg', s.actionBtn)}><Share2 size={13} /></Button>}
          {isAdmin && onEdit && <button type="button" onClick={() => onEdit(match)} className={cn('h-6 w-6 rounded-lg', s.actionBtn)}><span className="text-xs">✏️</span></button>}
          {isAdmin && onDelete && <button type="button" onClick={() => onDelete(match.id)} className={cn('h-6 w-6 rounded-lg', s.actionBtnDelete)}><span className="text-xs">🗑️</span></button>}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-4">
          {teamLine(team1, winner === 1)}
          <div className={cn('font-mono font-bold text-[12px] sm:text-[13px] leading-none shrink-0 text-right w-6', winner === 1 ? s.pairWinner : s.pair)}>
            {team1Score}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          {teamLine(team2, winner === 2)}
          <div className={cn('font-mono font-bold text-[12px] sm:text-[13px] leading-none shrink-0 text-right w-6', winner === 2 ? s.pairWinner : s.pair)}>
            {team2Score}
          </div>
        </div>
      </div>

      {showLineup && (
        <div className="border-t border-[var(--arena-border)] p-3 sm:p-4 bg-[var(--arena-surface-muted)]/40">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-[var(--arena-accent)] mb-2">Team 1 Lineup</div>
              <div className="grid gap-3">{team1.map((p, idx) => <PlayerCard key={p.id || idx} profile={p.profile || { name: p.guest_name || 'Guest', display_name: p.guest_name || 'Guest Player' }} isSimplified className="border-[var(--arena-border)]" />)}</div>
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-[var(--arena-accent)] mb-2">Team 2 Lineup</div>
              <div className="grid gap-3">{team2.map((p, idx) => <PlayerCard key={p.id || idx} profile={p.profile || { name: p.guest_name || 'Guest', display_name: p.guest_name || 'Guest Player' }} isSimplified className="border-[var(--arena-border)]" />)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

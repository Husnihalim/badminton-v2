import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Flame, 
  Trophy, 
  Share2, 
  Users, 
  ChevronRight, 
  Copy, 
  Check,
  Smartphone,
  ClipboardPenLine,
  Zap,
  Swords,
  Info
} from 'lucide-react'
import ClubCard from '../components/ClubCard'
import { getClubs } from '../lib/api'
import type { Club, MatchWithDetails, MatchParticipant, ScoreSet } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Page } from '../components/ui/page'
import heroBadminton from '../assets/hero-badminton.webp'
import heroPickleball from '../assets/hero-pickleball.webp'
import heroTennis from '../assets/hero-tennis.webp'
import { mockClubs, mockUsers, mockStories, mockLeaderboards, mockMatches } from '../lib/mockShowcase'

export default function LandingPage() {
  const [realClubs, setRealClubs] = useState<Club[]>([])
  const [isLoadingReal, setIsLoadingReal] = useState(true)

  // Interactive Live Arena Desk Tab
  const [activeTab, setActiveTab] = useState<'stories' | 'leaderboards' | 'drama' | 'players'>('stories')
  
  // Leaderboard toggle (LEP BC vs Smashers PJ)
  const [leaderboardClubId, setLeaderboardClubId] = useState<'mock-lep-bc' | 'mock-smashers-pj'>('mock-lep-bc')

  // WhatsApp share toast state
  const [copiedStoryId, setCopiedStoryId] = useState<string | null>(null)

  // Try Club Setup Widget State
  const [clubName, setClubName] = useState('')
  const [clubSport, setClubSport] = useState('badminton')
  const [clubAccent, setClubAccent] = useState('#ccff00')
  const [clubApproval, setClubApproval] = useState<'open' | 'invite'>('open')

  // Record Performance Playground State
  const [perfGame1T1, setPerfGame1T1] = useState(21)
  const [perfGame1T2, setPerfGame1T2] = useState(19)
  const [perfGame2T1, setPerfGame2T1] = useState(17)
  const [perfGame2T2, setPerfGame2T2] = useState(21)
  const [perfGame3T1, setPerfGame3T1] = useState(22)
  const [perfGame3T2, setPerfGame3T2] = useState(20)
  
  const [perfRating, setPerfRating] = useState(1500)
  const [perfWins, setPerfWins] = useState(12)
  const [perfLosses, setPerfLosses] = useState(6)
  const [perfStreak, setPerfStreak] = useState(3)
  const [perfHistory, setPerfHistory] = useState<Array<{ score: string; result: 'W' | 'L'; eloChange: number }>>([])
  const [perfCopied, setPerfCopied] = useState(false)

  // Load real clubs from database
  const loadRealClubs = useCallback(async () => {
    try {
      setIsLoadingReal(true)
      const data = await getClubs()
      // Only keep actual non-mock clubs for the bottom grid
      setRealClubs(data.filter(c => !c.id.startsWith('mock-')).slice(0, 4))
    } catch (err) {
      console.error('Error loading real clubs:', err)
    } finally {
      setIsLoadingReal(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRealClubs()
  }, [loadRealClubs])

  // Copy/Share WhatsApp stories
  const handleShareStory = async (storyId: string, headline: string, body: string, proof: string, clubName: string) => {
    const text = `🔥 *${headline}*\n🏆 ${body}\n\n📊 *The Proof:* ${proof}\n📍 ${clubName} | ${new Date().toLocaleDateString()}\n\nRead match reports on KelabSukan:\n🔗 ${window.location.origin}/club/mock-lep-bc`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: headline,
          text: text,
          url: `${window.location.origin}/club/mock-lep-bc`
        })
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        // Fallback to clipboard if sharing fails
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedStoryId(storyId)
      setTimeout(() => setCopiedStoryId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Record Performance Playground Handler
  const handleRecordPerformance = (e: React.FormEvent) => {
    e.preventDefault()
    
    let t1Sets = 0
    let t2Sets = 0

    // Set 1
    if (perfGame1T1 > perfGame1T2) t1Sets++
    else t2Sets++

    // Set 2
    if (perfGame2T1 > perfGame2T2) t1Sets++
    else t2Sets++

    // Set 3 (Decider if sets are tied)
    const needsDecider = t1Sets === 1 && t2Sets === 1
    if (needsDecider) {
      if (perfGame3T1 > perfGame3T2) t1Sets++
      else t2Sets++
    }

    const won = t1Sets > t2Sets
    const eloChange = won ? 16 : -12

    const newRating = Math.max(800, perfRating + eloChange)
    setPerfRating(newRating)
    
    if (won) {
      setPerfWins(perfWins + 1)
      setPerfStreak(perfStreak + 1)
    } else {
      setPerfLosses(perfLosses + 1)
      setPerfStreak(0)
    }

    const scoreStr = needsDecider 
      ? `${perfGame1T1}-${perfGame1T2}, ${perfGame2T1}-${perfGame2T2}, ${perfGame3T1}-${perfGame3T2}`
      : `${perfGame1T1}-${perfGame1T2}, ${perfGame2T1}-${perfGame2T2}`

    setPerfHistory([
      { score: scoreStr, result: won ? 'W' : 'L', eloChange },
      ...perfHistory.slice(0, 2) // Keep last 3 records
    ])
  }

  const copyPerfHype = () => {
    const lastResult = perfHistory[0]
    if (!lastResult) return
    const text = `🏸 *Match Recorded on KelabSukan!*\n🏆 Result: ${lastResult.result === 'W' ? 'Victory' : 'Defeat'} (${lastResult.score})\n⚡ New Elo Rating: ${perfRating} (${lastResult.eloChange > 0 ? '+' : ''}${lastResult.eloChange})\n🔥 Win Streak: ${perfStreak}\n\nTrack your racket stats:\n🔗 ${window.location.origin}`
    navigator.clipboard.writeText(text)
    setPerfCopied(true)
    setTimeout(() => setPerfCopied(false), 2000)
  }

  return (
    <Page>
      {/* 1. HERO SECTION */}
      <section className="landing-hero relative overflow-hidden rounded-2xl border border-[var(--arena-border)] bg-[var(--arena-surface)] p-6 md:p-12 shadow-[var(--arena-glow)]">
        <div className="absolute inset-0 bg-radial-gradient from-[var(--arena-accent-soft)]/20 via-transparent to-transparent opacity-70 pointer-events-none" />
        
        <div className="landing-hero-copy z-10 flex flex-col justify-center items-start text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--arena-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--arena-accent)] border border-[var(--arena-accent)]/20 uppercase tracking-wider mb-4 animate-pulse">
            <Zap size={12} className="fill-[var(--arena-accent)]" />
            Live Sports Network
          </span>
          <h1 className="landing-hero-title text-3xl md:text-5xl font-black text-[var(--arena-text)] uppercase tracking-tight leading-none mb-4">
            The Grassroots <br/>
            <span className="text-[var(--arena-accent)]">Sports Arena</span>
          </h1>
          <p className="landing-hero-text text-sm md:text-base leading-relaxed text-[var(--arena-text-muted)] max-w-lg mb-6">
            Where social athletes become visible. Organize your racket club, schedule game days, capture scores, track Elo leaderboards, and auto-generate ESPN-style story moments to share on WhatsApp.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link to="/register">
              <Button className="w-full sm:w-auto font-bold bg-[var(--arena-accent)] text-[var(--arena-bg)] shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:shadow-[0_0_30px_rgba(204,255,0,0.5)] border border-[var(--arena-accent)] transition-all">
                Start Your Club free
              </Button>
            </Link>
            <a href="#live-desk">
              <Button variant="secondary" className="w-full sm:w-auto border border-[var(--arena-border)] hover:bg-[var(--arena-surface-muted)] text-[var(--arena-text)]">
                Explore live feed
              </Button>
            </a>
          </div>
        </div>

        <div className="racket-hero-collage z-10 hidden md:block">
          <img className="racket-hero-image racket-hero-image-main border border-[var(--arena-accent)]/30" src={heroBadminton} alt="Badminton player lunging for a shuttle" />
          <img className="racket-hero-image racket-hero-image-side" src={heroTennis} alt="Tennis player hitting a forehand" />
          <img className="racket-hero-image racket-hero-image-small" src={heroPickleball} alt="Pickleball player reaching near the net" />
        </div>
      </section>

      {/* 2. DYNAMIC LIVE ARENA DESK */}
      <section id="live-desk" className="space-y-6 pt-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--arena-blue)]">Interactive Hub</span>
            <h2 className="text-2xl font-black text-[var(--arena-text)] uppercase tracking-tight">The Sports Desk</h2>
            <p className="text-sm text-[var(--arena-text-muted)]">Tour the actual platform loops with real communities like LEP BC & Smashers PJ.</p>
          </div>

          {/* Broadcast Desk Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-[var(--arena-surface-muted)] border border-[var(--arena-border)] rounded-lg">
            <button
              onClick={() => setActiveTab('stories')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all uppercase flex items-center gap-1.5 ${
                activeTab === 'stories' 
                  ? 'bg-[var(--arena-accent)] text-[var(--arena-bg)] shadow-md' 
                  : 'text-[var(--arena-text-muted)] hover:text-[var(--arena-text)]'
              }`}
            >
              <Flame size={13} />
              Live Stories
            </button>
            <button
              onClick={() => setActiveTab('leaderboards')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all uppercase flex items-center gap-1.5 ${
                activeTab === 'leaderboards' 
                  ? 'bg-[var(--arena-accent)] text-[var(--arena-bg)] shadow-md' 
                  : 'text-[var(--arena-text-muted)] hover:text-[var(--arena-text)]'
              }`}
            >
              <Trophy size={13} />
              Leaderboards
            </button>
            <button
              onClick={() => setActiveTab('drama')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all uppercase flex items-center gap-1.5 ${
                activeTab === 'drama' 
                  ? 'bg-[var(--arena-accent)] text-[var(--arena-bg)] shadow-md' 
                  : 'text-[var(--arena-text-muted)] hover:text-[var(--arena-text)]'
              }`}
            >
              <Swords size={13} />
              Court Drama
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all uppercase flex items-center gap-1.5 ${
                activeTab === 'players' 
                  ? 'bg-[var(--arena-accent)] text-[var(--arena-bg)] shadow-md' 
                  : 'text-[var(--arena-text-muted)] hover:text-[var(--arena-text)]'
              }`}
            >
              <Users size={13} />
              Player Cards
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="arena-panel p-5 min-h-[380px] flex flex-col justify-between">
          
          {/* TAB 1: STORIES */}
          {activeTab === 'stories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--arena-border)]">
                <span className="text-xs font-bold text-[var(--arena-text-dim)] uppercase">🚨 Generated Sports Newsroom Moments</span>
                <span className="text-xs text-[var(--arena-accent)] flex items-center gap-1 font-bold">● LIVE UPDATES</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {[...mockStories['mock-lep-bc'], ...mockStories['mock-smashers-pj']].map((story) => (
                  <div key={story.id} className="bg-[var(--arena-surface-elevated)]/40 hover:bg-[var(--arena-surface-elevated)]/60 border border-[var(--arena-border)] p-4 rounded-xl flex flex-col justify-between transition-all">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          story.type === 'comeback_win' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          story.type === 'clean_sweep' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                          story.type === 'win_streak' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {story.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-[var(--arena-text-dim)] font-semibold">{story.clubName}</span>
                      </div>
                      <h3 className="font-bold text-[var(--arena-text)] text-sm">{story.title}</h3>
                      <p className="text-xs leading-relaxed text-[var(--arena-text-muted)]">{story.body}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--arena-border)] flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[var(--arena-accent)] font-bold">{story.proofLabel}</span>
                      <button
                        onClick={() => handleShareStory(story.id, story.title, story.body, story.proofLabel, story.clubName || 'LEP BC')}
                        className="p-2 rounded-lg bg-[var(--arena-surface-muted)] hover:bg-[var(--arena-accent)] text-[var(--arena-text-muted)] hover:text-[var(--arena-bg)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
                        title={copiedStoryId === story.id ? "Copied Hype text" : "Share story"}
                      >
                        {copiedStoryId === story.id ? (
                          <Check size={14} />
                        ) : (
                          <Share2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: LEADERBOARDS */}
          {activeTab === 'leaderboards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--arena-border)]">
                <span className="text-xs font-bold text-[var(--arena-text-dim)] uppercase">🏆 Broadcast League Standings</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setLeaderboardClubId('mock-lep-bc')} 
                    className={`px-2 py-1 rounded text-xs font-extrabold uppercase transition-all ${
                      leaderboardClubId === 'mock-lep-bc' ? 'bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] border border-[var(--arena-accent)]/30' : 'text-[var(--arena-text-dim)]'
                    }`}
                  >
                    LEP BC
                  </button>
                  <button 
                    onClick={() => setLeaderboardClubId('mock-smashers-pj')} 
                    className={`px-2 py-1 rounded text-xs font-extrabold uppercase transition-all ${
                      leaderboardClubId === 'mock-smashers-pj' ? 'bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] border border-[var(--arena-accent)]/30' : 'text-[var(--arena-text-dim)]'
                    }`}
                  >
                    Smashers PJ
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--arena-border)] text-[10px] uppercase tracking-wider text-[var(--arena-text-dim)] font-bold">
                      <th className="py-2 px-4">Rank</th>
                      <th className="py-2">Player</th>
                      <th className="py-2 text-center">Played</th>
                      <th className="py-2 text-center">W - L</th>
                      <th className="py-2 text-center">Win %</th>
                      <th className="py-2 text-right px-4">Elo Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockLeaderboards[leaderboardClubId].map((row, idx) => {
                      const userKey = Object.keys(mockUsers).find(k => mockUsers[k].name === row.name)
                      return (
                        <tr key={idx} className="border-b border-[var(--arena-border)]/50 hover:bg-[var(--arena-surface-muted)]/50 text-xs transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[var(--arena-text-muted)]">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </td>
                          <td className="py-3 font-bold text-[var(--arena-text)]">
                            {userKey ? (
                              <Link to={`/member/${userKey}`} className="hover:text-[var(--arena-accent)] flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-[var(--arena-surface-elevated)] flex items-center justify-center text-[10px] text-[var(--arena-accent)] border border-[var(--arena-border)] uppercase font-black">
                                  {row.name.substring(0, 2)}
                                </div>
                                {row.name}
                              </Link>
                            ) : row.name}
                          </td>
                          <td className="py-3 text-center font-mono font-semibold text-[var(--arena-text-muted)]">{row.games}</td>
                          <td className="py-3 text-center font-mono text-[var(--arena-text-muted)]">{row.wins} - {row.losses}</td>
                          <td className="py-3 text-center font-mono font-bold text-[var(--arena-text-muted)]">{row.winPercentage}%</td>
                          <td className="py-3 text-right px-4 font-mono font-black text-[var(--arena-accent)]">{row.elo_rating ?? 1500}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DRAMA */}
          {activeTab === 'drama' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--arena-border)]">
                <span className="text-xs font-bold text-[var(--arena-text-dim)] uppercase">🔥 Recent Intense Match Results</span>
                <span className="text-xs text-[var(--arena-text-dim)] uppercase font-semibold">BWF Broadcast Format</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[...mockMatches['mock-lep-bc'], ...mockMatches['mock-smashers-pj']].map((match: MatchWithDetails) => {
                  const t1Wins = match.score_sets.filter((s: ScoreSet) => s.team1_score > s.team2_score).length
                  const t2Wins = match.score_sets.filter((s: ScoreSet) => s.team2_score > s.team1_score).length
                  const isT1Winner = t1Wins > t2Wins

                  return (
                    <div key={match.id} className="bg-[var(--arena-surface-elevated)]/30 border border-[var(--arena-border)] rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-[var(--arena-text-dim)] font-semibold border-b border-[var(--arena-border)]/50 pb-2">
                        <span>{match.title || 'Doubles Match'}</span>
                        <span className="uppercase text-[var(--arena-blue)]">{match.clubName}</span>
                      </div>
                      
                      {/* Scoreboard line */}
                      <div className="grid grid-cols-12 items-center gap-2">
                        {/* Team 1 */}
                        <div className="col-span-5 space-y-1">
                          {match.participants.filter((p: MatchParticipant) => p.team === 1).map((p: MatchParticipant, idx: number) => (
                            <div key={idx} className={`text-xs truncate font-bold ${isT1Winner ? 'text-[var(--arena-text)]' : 'text-[var(--arena-text-dim)]'}`}>
                              {p.name}
                            </div>
                          ))}
                        </div>
                        
                        {/* Scores */}
                        <div className="col-span-2 flex flex-col items-center justify-center font-mono font-black border-x border-[var(--arena-border)]/50">
                          <span className={`text-sm ${isT1Winner ? 'text-[var(--arena-accent)]' : 'text-[var(--arena-text-dim)]'}`}>{t1Wins}</span>
                          <span className="text-[10px] text-[var(--arena-text-dim)]">vs</span>
                          <span className={`text-sm ${!isT1Winner ? 'text-[var(--arena-accent)]' : 'text-[var(--arena-text-dim)]'}`}>{t2Wins}</span>
                        </div>

                        {/* Team 2 */}
                        <div className="col-span-5 space-y-1 text-right">
                          {match.participants.filter((p: MatchParticipant) => p.team === 2).map((p: MatchParticipant, idx: number) => (
                            <div key={idx} className={`text-xs truncate font-bold ${!isT1Winner ? 'text-[var(--arena-text)]' : 'text-[var(--arena-text-dim)]'}`}>
                              {p.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Set breakdown */}
                      <div className="flex justify-center gap-4 pt-2 border-t border-[var(--arena-border)]/50 text-[10px] font-mono text-[var(--arena-text-dim)]">
                        {match.score_sets.map((set: ScoreSet, idx: number) => (
                          <div key={set.id} className="flex gap-1">
                            <span>S{idx + 1}:</span>
                            <span className={set.team1_score > set.team2_score ? 'text-[var(--arena-accent)] font-bold' : ''}>{set.team1_score}</span>
                            <span>-</span>
                            <span className={set.team2_score > set.team1_score ? 'text-[var(--arena-accent)] font-bold' : ''}>{set.team2_score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PLAYERS */}
          {activeTab === 'players' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border(--arena-border)">
                <span className="text-xs font-bold text-[var(--arena-text-dim)] uppercase">👤 Featured Athlete Profiles</span>
                <span className="text-xs text-[var(--arena-accent)] font-bold uppercase">Click to browse full tour</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {['mock-husni', 'mock-troma', 'mock-amir'].map((userId) => {
                  const player = mockUsers[userId]
                  const rating = userId === 'mock-husni' ? 1540 : userId === 'mock-troma' ? 1490 : 1610
                  const wRecord = userId === 'mock-husni' ? '16W - 8L' : userId === 'mock-troma' ? '13W - 11L' : '18W - 6L'
                  const winRate = userId === 'mock-husni' ? '66.7%' : userId === 'mock-troma' ? '54.2%' : '75%'
                  const badge = userId === 'mock-husni' ? '🥇 Founder' : userId === 'mock-troma' ? '🛡️ Wall' : '🔥 Smasher'

                  return (
                    <Link to={`/member/${userId}`} key={userId} className="bg-[var(--arena-surface-elevated)]/30 hover:bg-[var(--arena-surface-elevated)]/60 hover:-translate-y-1 border border-[var(--arena-border)] rounded-xl p-4 space-y-4 flex flex-col justify-between transition-all group">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--arena-surface-elevated)] flex items-center justify-center text-sm text-[var(--arena-accent)] border border-[var(--arena-accent)]/30 font-black uppercase group-hover:scale-105 transition-transform">
                              {player.name.substring(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-[var(--arena-text)] text-sm group-hover:text-[var(--arena-accent)] transition-colors">{player.name}</h4>
                              <span className="text-[10px] text-[var(--arena-text-dim)] font-semibold">{player.city}</span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 bg-[var(--arena-surface-muted)] text-[var(--arena-text-muted)] rounded-full font-bold border border-[var(--arena-border)]">
                            {badge}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-[var(--arena-text-muted)] italic">"{player.bio}"</p>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--arena-border)]/50 text-[10px] text-[var(--arena-text-muted)] font-semibold">
                          <div>🏸 Racket: <span className="text-[var(--arena-text)] font-bold">{player.gear?.racket}</span></div>
                          <div>⚡ Play Style: <span className="text-[var(--arena-text)] font-bold">{player.gear?.play_style?.replace('_', ' ')}</span></div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-[var(--arena-border)]/50 flex items-center justify-between font-mono">
                        <div className="text-[10px] text-[var(--arena-text-dim)] font-bold">
                          <span>W-L: {wRecord} ({winRate})</span>
                        </div>
                        <div className="text-xs text-[var(--arena-accent)] font-black">
                          <span>Elo: {rating}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Desk Footer Tour Hook */}
          <div className="mt-6 pt-4 border-t border-[var(--arena-border)] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--arena-surface-muted)]/30 p-3 rounded-lg border border-[var(--arena-border)]/50">
            <span className="text-xs text-[var(--arena-text-muted)] font-semibold flex items-center gap-1">
              <Info size={13} className="text-[var(--arena-blue)]" />
              This interactive feed intercepts mock club data structures to demo KelabSukan features.
            </span>
            <Link to="/club/mock-lep-bc" className="text-xs font-black text-[var(--arena-accent)] uppercase flex items-center hover:underline">
              Tour the full LEP BC Home Page
              <ChevronRight size={14} />
            </Link>
          </div>

        </div>
      </section>

      {/* 3. PERFORMANCE RECORDER & CLUB CREATOR GRID */}
      <section className="grid gap-6 md:grid-cols-2 pt-10">
        
        {/* PLAYGROUND: RECORD PERFORMANCE */}
        <div className="arena-panel p-6 flex flex-col justify-between space-y-4 border border-[var(--arena-accent)]/20 shadow-[0_0_15px_rgba(204,255,0,0.05)]">
          <div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--arena-accent)] uppercase tracking-wider bg-[var(--arena-accent-soft)] px-2.5 py-0.5 rounded border border-[var(--arena-accent)]/10">
              <ClipboardPenLine size={12} /> Live Playground
            </span>
            <h3 className="text-lg font-black text-[var(--arena-text)] uppercase tracking-tight mt-2">Test Score Dopamine</h3>
            <p className="text-xs text-[var(--arena-text-muted)] mt-1">
              Input sample game scores to calculate Elo rating shifts and watch your career card update instantly.
            </p>
          </div>

          <form onSubmit={handleRecordPerformance} className="space-y-3 bg-[var(--arena-surface-muted)]/50 p-4 rounded-xl border border-[var(--arena-border)]/50">
            <div className="grid grid-cols-3 gap-2 items-center text-center">
              <span className="text-[10px] font-bold text-[var(--arena-text-dim)] uppercase">Game Set</span>
              <span className="text-[10px] font-bold text-[var(--arena-accent)] uppercase">Your Score</span>
              <span className="text-[10px] font-bold text-[var(--arena-text-dim)] uppercase">Opponent</span>
            </div>

            {/* Set 1 */}
            <div className="grid grid-cols-3 gap-2 items-center text-center">
              <span className="text-xs font-bold text-[var(--arena-text-muted)]">Set 1</span>
              <input 
                type="number" 
                value={perfGame1T1} 
                onChange={(e) => setPerfGame1T1(Number(e.target.value))}
                className="bg-[var(--arena-surface-elevated)] border border-[var(--arena-border)] rounded text-xs py-1 text-center font-bold text-[var(--arena-text)]"
                min="0" max="30"
              />
              <input 
                type="number" 
                value={perfGame1T2} 
                onChange={(e) => setPerfGame1T2(Number(e.target.value))}
                className="bg-[var(--arena-surface-elevated)] border border-[var(--arena-border)] rounded text-xs py-1 text-center font-bold text-[var(--arena-text)]"
                min="0" max="30"
              />
            </div>

            {/* Set 2 */}
            <div className="grid grid-cols-3 gap-2 items-center text-center">
              <span className="text-xs font-bold text-[var(--arena-text-muted)]">Set 2</span>
              <input 
                type="number" 
                value={perfGame2T1} 
                onChange={(e) => setPerfGame2T1(Number(e.target.value))}
                className="bg-[var(--arena-surface-elevated)] border border-[var(--arena-border)] rounded text-xs py-1 text-center font-bold text-[var(--arena-text)]"
                min="0" max="30"
              />
              <input 
                type="number" 
                value={perfGame2T2} 
                onChange={(e) => setPerfGame2T2(Number(e.target.value))}
                className="bg-[var(--arena-surface-elevated)] border border-[var(--arena-border)] rounded text-xs py-1 text-center font-bold text-[var(--arena-text)]"
                min="0" max="30"
              />
            </div>

            {/* Set 3 */}
            <div className="grid grid-cols-3 gap-2 items-center text-center">
              <span className="text-xs font-bold text-[var(--arena-text-muted)]">Set 3 (If tied)</span>
              <input 
                type="number" 
                value={perfGame3T1} 
                onChange={(e) => setPerfGame3T1(Number(e.target.value))}
                className="bg-[var(--arena-surface-elevated)] border border-[var(--arena-border)] rounded text-xs py-1 text-center font-bold text-[var(--arena-text)]"
                min="0" max="30"
              />
              <input 
                type="number" 
                value={perfGame3T2} 
                onChange={(e) => setPerfGame3T2(Number(e.target.value))}
                className="bg-[var(--arena-surface-elevated)] border border-[var(--arena-border)] rounded text-xs py-1 text-center font-bold text-[var(--arena-text)]"
                min="0" max="30"
              />
            </div>

            <Button type="submit" size="sm" className="w-full bg-[var(--arena-accent)] text-[var(--arena-bg)] font-bold mt-2">
              Record Performance
            </Button>
          </form>

          {/* Interactive Player Card Upgrading Preview */}
          <div className="border border-[var(--arena-border)] bg-[var(--arena-surface-elevated)]/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--arena-accent-soft)] flex items-center justify-center font-black text-xs text-[var(--arena-accent)] border border-[var(--arena-accent)]/30">
                  ME
                </div>
                <div>
                  <h4 className="text-xs font-black text-[var(--arena-text)]">You (Social Athlete)</h4>
                  <span className="text-[9px] text-[var(--arena-text-dim)] font-semibold">Self-managed Profile</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--arena-text-dim)] font-semibold uppercase block">Elo Rating</span>
                <span className="text-sm font-black text-[var(--arena-accent)] font-mono">{perfRating}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-[var(--arena-border)]/50 pt-2.5 text-center font-mono">
              <div>
                <span className="text-[9px] text-[var(--arena-text-dim)] font-bold block uppercase">Wins</span>
                <span className="text-xs font-black text-[var(--arena-text)]">{perfWins}</span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--arena-text-dim)] font-bold block uppercase">Losses</span>
                <span className="text-xs font-black text-[var(--arena-text)]">{perfLosses}</span>
              </div>
              <div>
                <span className="text-[9px] text-[var(--arena-text-dim)] font-bold block uppercase">Streak</span>
                <span className="text-xs font-black text-[var(--arena-accent)]">{perfStreak}🔥</span>
              </div>
            </div>

            {/* Match History list */}
            {perfHistory.length > 0 && (
              <div className="border-t border-[var(--arena-border)]/50 pt-2.5 space-y-1.5">
                <span className="text-[9px] text-[var(--arena-text-dim)] font-extrabold uppercase block text-left">Recent Submissions</span>
                {perfHistory.map((h, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px] font-mono bg-[var(--arena-surface-muted)]/80 px-2 py-1 rounded border border-[var(--arena-border)]/30">
                    <span className="font-semibold text-[var(--arena-text-muted)]">{h.score}</span>
                    <div className="flex gap-2 items-center">
                      <span className={`px-1 rounded text-[8px] font-extrabold ${h.result === 'W' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                        {h.result}
                      </span>
                      <span className={h.eloChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {h.eloChange > 0 ? '+' : ''}{h.eloChange} Elo
                      </span>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={copyPerfHype}
                  className="w-full text-center text-[9px] font-black text-[var(--arena-blue)] uppercase py-1 border border-[var(--arena-border)] border-dashed rounded mt-1.5 hover:bg-[var(--arena-surface-muted)] transition-colors flex items-center justify-center gap-1"
                >
                  {perfCopied ? (
                    <>
                      <Check size={10} />
                      Copied share mockup!
                    </>
                  ) : (
                    <>
                      <Copy size={10} />
                      Copy WhatsApp Performance Hype
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* WIDGET: TRY CLUB SETUP */}
        <div className="arena-panel p-6 flex flex-col justify-between space-y-4">
          <div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--arena-blue)] uppercase tracking-wider bg-sky-950/20 px-2.5 py-0.5 rounded border border-[var(--arena-blue)]/10">
              <Zap size={12} className="fill-[var(--arena-blue)]" /> Club Lobby Builder
            </span>
            <h3 className="text-lg font-black text-[var(--arena-text)] uppercase tracking-tight mt-2">Design Your Club</h3>
            <p className="text-xs text-[var(--arena-text-muted)] mt-1">
              Type your club details below to generate a live visual mockup of your customized homepage.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--arena-text-dim)] uppercase block mb-1">Club Name</label>
              <input 
                type="text" 
                value={clubName} 
                onChange={(e) => setClubName(e.target.value)}
                placeholder="e.g. USJ Smashers, PJ Rebels"
                className="w-full bg-[var(--arena-surface-muted)] border border-[var(--arena-border)] rounded-lg text-xs py-2 px-3 text-[var(--arena-text)] placeholder-[var(--arena-text-dim)] focus:border-[var(--arena-accent)] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-[var(--arena-text-dim)] uppercase block mb-1">Preferred Sport</label>
                <select 
                  value={clubSport}
                  onChange={(e) => setClubSport(e.target.value)}
                  className="w-full bg-[var(--arena-surface-muted)] border border-[var(--arena-border)] rounded-lg text-xs py-2 px-3 text-[var(--arena-text)] focus:border-[var(--arena-accent)] focus:outline-none"
                >
                  <option value="badminton">🏸 Badminton</option>
                  <option value="tennis">🎾 Tennis</option>
                  <option value="pickleball">🏓 Pickleball</option>
                  <option value="squash">💥 Squash</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--arena-text-dim)] uppercase block mb-1">Accent Theme</label>
                <div className="flex gap-2 py-1">
                  {['#ccff00', '#38bdf8', '#ef4444', '#10b981'].map(color => (
                    <button 
                      key={color}
                      type="button"
                      onClick={() => setClubAccent(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${clubAccent === color ? 'border-[var(--arena-text)] scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--arena-text-dim)] uppercase block mb-1">Access Policy</label>
              <select 
                value={clubApproval}
                onChange={(e) => setClubApproval(e.target.value as 'open' | 'invite')}
                className="w-full bg-[var(--arena-surface-muted)] border border-[var(--arena-border)] rounded-lg text-xs py-2 px-3 text-[var(--arena-text)] focus:border-[var(--arena-accent)] focus:outline-none"
              >
                <option value="open">🔓 Open Join (Anyone can join directly)</option>
                <option value="invite">🔒 Request Only (Admin approval required)</option>
              </select>
            </div>
          </div>

          {/* Visual Club Mockup Card */}
          <div className="border border-[var(--arena-border)] bg-[var(--arena-surface-elevated)]/30 rounded-xl p-4 relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: clubAccent }} />
            
            <div className="flex justify-between items-start pl-2">
              <div className="flex gap-3">
                <div 
                  style={{ borderColor: clubAccent, color: clubAccent }}
                  className="w-10 h-10 rounded-xl bg-[var(--arena-surface-muted)] flex items-center justify-center text-sm font-black border uppercase"
                >
                  {(clubName || 'My Club').substring(0, 2)}
                </div>
                <div>
                  <h4 className="font-extrabold text-[var(--arena-text)] text-sm">{clubName || 'My Club Name'}</h4>
                  <span className="text-[9px] text-[var(--arena-text-dim)] font-semibold uppercase flex items-center gap-1">
                    <span>📍 Kuala Lumpur, Malaysia</span>
                    <span>•</span>
                    <span className="text-[var(--arena-blue)]">{clubSport}</span>
                  </span>
                </div>
              </div>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold border" style={{ color: clubAccent, borderColor: `${clubAccent}30` }}>
                {clubApproval === 'open' ? '🔓 Open Join' : '🔒 Approval Needed'}
              </span>
            </div>

            <div className="pl-2 pt-3 mt-3 border-t border-[var(--arena-border)]/50 flex justify-between items-center text-[10px] text-[var(--arena-text-dim)] font-semibold">
              <span>Roster: <strong className="text-[var(--arena-text)]">1 Athlete</strong></span>
              <span style={{ color: clubAccent }} className="font-bold">Active Newsroom</span>
            </div>
          </div>

          <Link to="/register" className="w-full">
            <Button size="sm" className="w-full font-bold bg-[var(--arena-accent)] text-[var(--arena-bg)] border border-[var(--arena-accent)] shadow-md hover:shadow-lg">
              Launch {clubName ? `"${clubName}"` : 'Your Club'} free
            </Button>
          </Link>
        </div>

      </section>

      {/* 4. WHAT THE PLATFORM OFFERS */}
      <section className="space-y-6 pt-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--arena-blue)]">Features Overview</span>
          <h2 className="text-2xl font-black text-[var(--arena-text)] uppercase tracking-tight">What We Offer</h2>
          <p className="text-sm text-[var(--arena-text-muted)]">KelabSukan is built to make ordinary racket sessions feel like professional sports leagues.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard 
            icon={<ClipboardPenLine size={20} />} 
            title="Fast Scoring & Elo" 
            text="Submit set scores right beside the court. The system calculates Elo updates, W-L ratios, and win percentages in real time." 
          />
          <FeatureCard 
            icon={<Flame size={20} />} 
            title="Auto-Generated Stories" 
            text="Our engine transforms raw matches into narratives. Read about comebacks, sweeps, win streaks, and nemesis updates." 
          />
          <FeatureCard 
            icon={<Smartphone size={20} />} 
            title="WhatsApp Sharing" 
            text="Copy rich, formatted updates containing emojis and details. Perfect for pasting summaries directly into your chat groups." 
          />
          <FeatureCard 
            icon={<Users size={20} />} 
            title="Career Racket Profiles" 
            text="Build a sports identity. Share racket details, stiffness preference, play styles, and trophies on a public-safe URL." 
          />
        </div>
      </section>

      {/* 5. FEATURED CLUBS GRID */}
      <section className="space-y-6 pt-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--arena-blue)]">Directory</span>
          <h2 className="text-2xl font-black text-[var(--arena-text)] uppercase tracking-tight">Active Sports Clubs</h2>
          <p className="text-sm text-[var(--arena-text-muted)]">Explore existing clubs, view stats, and request to join the community.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Mock Club A Card */}
          <Link to="/club/mock-lep-bc" className="bg-[var(--arena-surface)] hover:bg-[var(--arena-surface-elevated)]/50 border border-[var(--arena-accent)]/20 hover:border-[var(--arena-accent)]/40 p-5 rounded-2xl flex flex-col justify-between transition-all group shadow-[0_0_15px_rgba(204,255,0,0.02)]">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--arena-surface-muted)] border border-[var(--arena-accent)]/30 text-[var(--arena-accent)] flex items-center justify-center font-black text-sm transition-transform group-hover:scale-105">
                    LE
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[var(--arena-text)] text-base group-hover:text-[var(--arena-accent)] transition-colors">{mockClubs['mock-lep-bc'].name}</h3>
                    <span className="text-xs text-[var(--arena-text-dim)] font-semibold flex items-center gap-1">
                      <span>📍 {mockClubs['mock-lep-bc'].location}</span>
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] rounded border border-[var(--arena-accent)]/20 font-bold uppercase tracking-wider">
                  ⭐ Showcase Club
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--arena-text-muted)]">{mockClubs['mock-lep-bc'].description}</p>
            </div>
            
            <div className="mt-5 pt-3 border-t border-[var(--arena-border)]/50 flex justify-between items-center text-xs font-mono text-[var(--arena-text-dim)]">
              <span className="font-bold text-[var(--arena-text-muted)]">Roster: 4 social athletes</span>
              <span className="text-[var(--arena-accent)] font-bold flex items-center gap-1 group-hover:underline">
                Tour Club House
                <ChevronRight size={14} />
              </span>
            </div>
          </Link>

          {/* Mock Club B Card */}
          <Link to="/club/mock-smashers-pj" className="bg-[var(--arena-surface)] hover:bg-[var(--arena-surface-elevated)]/50 border border-[var(--arena-blue)]/20 hover:border-[var(--arena-blue)]/40 p-5 rounded-2xl flex flex-col justify-between transition-all group shadow-[0_0_15px_rgba(56,189,248,0.02)]">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--arena-surface-muted)] border border-[var(--arena-blue)]/30 text-[var(--arena-blue)] flex items-center justify-center font-black text-sm transition-transform group-hover:scale-105">
                    SM
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[var(--arena-text)] text-base group-hover:text-[var(--arena-blue)] transition-colors">{mockClubs['mock-smashers-pj'].name}</h3>
                    <span className="text-xs text-[var(--arena-text-dim)] font-semibold flex items-center gap-1">
                      <span>📍 {mockClubs['mock-smashers-pj'].location}</span>
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-sky-950 text-[var(--arena-blue)] rounded border border-[var(--arena-blue)]/20 font-bold uppercase tracking-wider">
                  ⭐ Showcase Club
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--arena-text-muted)]">{mockClubs['mock-smashers-pj'].description}</p>
            </div>
            
            <div className="mt-5 pt-3 border-t border-[var(--arena-border)]/50 flex justify-between items-center text-xs font-mono text-[var(--arena-text-dim)]">
              <span className="font-bold text-[var(--arena-text-muted)]">Roster: 4 social athletes</span>
              <span className="text-[var(--arena-blue)] font-bold flex items-center gap-1 group-hover:underline">
                Tour Club House
                <ChevronRight size={14} />
              </span>
            </div>
          </Link>
        </div>

        {/* Real DB Clubs (dynamic) */}
        {realClubs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--arena-text-dim)] uppercase tracking-wider">Community Created Clubs</h3>
            <div className="grid gap-3">
              {realClubs.map((club) => (
                <ClubCard key={club.id} club={club} />
              ))}
            </div>
          </div>
        )}

        {realClubs.length === 0 && !isLoadingReal && (
          <div className="arena-panel p-6 text-center border border-dashed border-[var(--arena-border)] space-y-3">
            <p className="text-xs text-[var(--arena-text-dim)] font-semibold">No custom community clubs registered yet. Launch yours to be featured first!</p>
            <Link to="/register">
              <Button size="sm" className="bg-[var(--arena-accent)] text-[var(--arena-bg)] font-bold">
                Launch A Club
              </Button>
            </Link>
          </div>
        )}
      </section>
      
      {/* 6. CALL TO ACTION AREA */}
      <section className="pt-10 text-center">
        <div className="bg-gradient-to-r from-[var(--arena-surface-muted)] to-[var(--arena-surface)] border border-[var(--arena-border)] rounded-2xl p-8 space-y-4 shadow-[var(--arena-glow)] max-w-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-black text-[var(--arena-text)] uppercase tracking-tight">Ready to activate your community?</h2>
          <p className="text-xs md:text-sm text-[var(--arena-text-muted)] max-w-md mx-auto">
            Stop pasting complex spreadsheet rosters into chat. Build your player profiles, log Elo rating progression, and automatically generate stories starting tonight.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/register">
              <Button className="w-full sm:w-auto font-extrabold bg-[var(--arena-accent)] text-[var(--arena-bg)]">
                Create Club House
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="w-full sm:w-auto text-[var(--arena-text)] border border-[var(--arena-border)]">
                Log In to Court
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </Page>
  )
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card className="h-full rounded-xl bg-[var(--arena-surface-elevated)]/25 border border-[var(--arena-border)] hover:bg-[var(--arena-surface-elevated)]/40 transition-colors">
      <CardContent className="flex flex-col gap-3 pt-5 pb-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] border border-[var(--arena-accent)]/15">
          {icon}
        </span>
        <div className="space-y-1">
          <h3 className="font-extrabold text-[var(--arena-text)] text-sm uppercase tracking-tight">{title}</h3>
          <p className="text-xs leading-relaxed text-[var(--arena-text-muted)]">{text}</p>
        </div>
      </CardContent>
    </Card>
  )
}

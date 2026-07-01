import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ClipboardPenLine, Copy, Zap } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Page, PageHeader } from '../components/ui/page'

/**
 * Phase 5 — the interactive product playground (record-performance simulator
 * + club builder mockup) was lifted off the public landing page so the
 * homepage reads as a newsroom, not a SaaS pitch deck. The widgets still exist
 * here for demos and onboarding hand-holding; nothing is deleted.
 */
export default function PlaygroundPage() {
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

  const handleRecordPerformance = (e: React.FormEvent) => {
    e.preventDefault()

    let t1Sets = 0
    let t2Sets = 0

    if (perfGame1T1 > perfGame1T2) t1Sets++
    else t2Sets++

    if (perfGame2T1 > perfGame2T2) t1Sets++
    else t2Sets++

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
      ...perfHistory.slice(0, 2),
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
      <PageHeader
        eyebrow="Product playground"
        title="Try the loops"
        description="Interactive demos of score recording and club setup. These widgets used to live on the homepage — they have their own page now so the homepage can lead with the community."
      />

      <section className="grid gap-6 md:grid-cols-2 pt-2">
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
                      <span className={`px-1 rounded text-[8px] font-extrabold ${h.result === 'W' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                        {h.result}
                      </span>
                      <span className={h.eloChange > 0 ? 'text-success' : 'text-danger'}>
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
                      Copy summary
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
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--arena-blue)] uppercase tracking-wider bg-info-soft/20 px-2.5 py-0.5 rounded border border-[var(--arena-blue)]/10">
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
    </Page>
  )
}
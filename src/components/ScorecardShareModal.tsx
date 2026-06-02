import { useEffect, useRef, useState } from 'react'
import { Download, Share2, X, Check } from 'lucide-react'
import type { MatchWithDetails } from '../types'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

interface ScorecardShareModalProps {
  match: MatchWithDetails | null
  clubName: string
  onClose: () => void
}

export default function ScorecardShareModal({ match, clubName, onClose }: ScorecardShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string>('')

  useEffect(() => {
    if (!match) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set dimensions
    canvas.width = 800
    canvas.height = 500

    // 1. Background Gradient (Sleek dark sports card theme)
    const gradient = ctx.createLinearGradient(0, 0, 800, 500)
    gradient.addColorStop(0, '#022c22') // Deep emerald
    gradient.addColorStop(0.5, '#0f172a') // Dark slate
    gradient.addColorStop(1, '#022c22') // Deep emerald
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 800, 500)

    // 2. Add subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.lineWidth = 1
    for (let x = 0; x < 800; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 500)
      ctx.stroke()
    }
    for (let y = 0; y < 500; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(800, y)
      ctx.stroke()
    }

    // 3. Gold Accent borders
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1.5
    ctx.strokeRect(20, 20, 760, 460)

    ctx.strokeStyle = '#fbbf24' // Gold border
    ctx.lineWidth = 3
    ctx.strokeRect(25, 25, 750, 450)

    // 4. Header: Club name & title
    ctx.fillStyle = '#fbbf24' // Gold
    ctx.font = 'bold 26px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(clubName.toUpperCase(), 400, 70)

    ctx.fillStyle = '#94a3b8' // Slate gray
    ctx.font = 'semibold 13px sans-serif'
    ctx.fillText(`${match.sport.toUpperCase()} • ${match.match_type.toUpperCase()}`, 400, 95)

    // Divider line
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(100, 115)
    ctx.lineTo(700, 115)
    ctx.stroke()

    // 5. Extract Team details
    const team1 = match.participants
      .filter((p) => p.team === 1)
      .map((p) => p.name || p.guest_name || 'Guest')
    const team2 = match.participants
      .filter((p) => p.team === 2)
      .map((p) => p.name || p.guest_name || 'Guest')

    const team1Text = team1.join(' & ')
    const team2Text = team2.join(' & ')

    // Determine Winner for visual tag
    const scoreSets = match.score_sets || []
    const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
    const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
    const winner = team1Sets > team2Sets ? 1 : 2

    // 6. Draw Teams UI Left and Right
    ctx.textAlign = 'center'
    
    // Team 1
    ctx.fillStyle = winner === 1 ? '#ffffff' : '#94a3b8'
    ctx.font = winner === 1 ? 'bold 22px sans-serif' : '20px sans-serif'
    ctx.fillText(team1Text, 230, 200)
    if (winner === 1) {
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('WINNER ★', 230, 165)
    }

    // VS text
    ctx.fillStyle = '#f59e0b'
    ctx.font = 'italic bold 28px sans-serif'
    ctx.fillText('VS', 400, 220)

    // Team 2
    ctx.fillStyle = winner === 2 ? '#ffffff' : '#94a3b8'
    ctx.font = winner === 2 ? 'bold 22px sans-serif' : '20px sans-serif'
    ctx.fillText(team2Text, 570, 200)
    if (winner === 2) {
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('WINNER ★', 570, 165)
    }

    // 7. Render Scores block in the middle
    ctx.fillStyle = '#1e293b' // dark block for scores
    ctx.fillRect(150, 270, 500, 110)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.strokeRect(150, 270, 500, 110)

    // Set score values
    const sets = match.score_sets || []
    const maxSets = Math.max(sets.length, 1)
    const setWidth = 500 / maxSets

    ctx.textAlign = 'center'
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'

    sets.forEach((set, idx) => {
      const centerX = 150 + (idx * setWidth) + (setWidth / 2)

      // Set label (e.g. Set 1)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '12px sans-serif'
      ctx.fillText(`SET ${idx + 1}`, centerX, 298)

      // Set score numbers
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px sans-serif'
      ctx.fillText(`${set.team1_score} - ${set.team2_score}`, centerX, 352)

      // Vertical separator
      if (idx < sets.length - 1) {
        ctx.beginPath()
        ctx.moveTo(150 + ((idx + 1) * setWidth), 275)
        ctx.lineTo(150 + ((idx + 1) * setWidth), 375)
        ctx.stroke()
      }
    })

    // 8. Footer metadata
    ctx.fillStyle = '#64748b'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(new Date(match.match_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 50, 450)

    ctx.textAlign = 'right'
    ctx.fillText('KELABSUKAN.COM', 750, 450)

    // Save download URL
    setDownloadUrl(canvas.toDataURL('image/png'))
  }, [match, clubName])

  if (!match) return null

  const handleDownload = () => {
    if (!downloadUrl) return
    const link = document.createElement('a')
    link.download = `scorecard-${match.id}.png`
    link.href = downloadUrl
    link.click()
  }

  const handleShare = async () => {
    const shareText = `Match result in ${clubName}:\n${match.title || 'Singles/Doubles match'}\nScores: ${match.score_sets.map(s => `${s.team1_score}-${s.team2_score}`).join(', ')}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Match Scorecard',
          text: shareText,
          url: window.location.href
        })
      } catch (err) {
        console.error('Share failed:', err)
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 text-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Share Match Scorecard</h2>
              <p className="text-sm text-slate-400">Download or copy a beautiful summary card of this match.</p>
            </div>
            <button type="button" className="text-slate-400 hover:text-white" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="flex justify-center border border-slate-800 rounded-lg overflow-hidden bg-slate-950 p-2 sm:p-4">
            <canvas ref={canvasRef} className="max-w-full max-h-[300px] sm:max-h-[380px] object-contain rounded shadow-lg border border-slate-800" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button type="button" onClick={handleDownload} fullWidth className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-none">
              <Download size={16} />
              Download Image
            </Button>
            <Button type="button" variant="secondary" onClick={handleShare} fullWidth className="gap-2 border-slate-700 text-slate-200 bg-slate-800 hover:bg-slate-700">
              {copied ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
              {copied ? 'Copied Details' : 'Share Result'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

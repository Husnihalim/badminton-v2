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

    // 1. Background (Sleek professional stadium scoreboard dark theme)
    ctx.fillStyle = '#090d16' // Solid very dark slate/black
    ctx.fillRect(0, 0, 800, 500)

    // Subtle dark stadium grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)'
    ctx.lineWidth = 1
    for (let x = 0; x < 800; x += 30) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 500)
      ctx.stroke()
    }
    for (let y = 0; y < 500; y += 30) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(800, y)
      ctx.stroke()
    }

    // Outer border
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 1
    ctx.strokeRect(15, 15, 770, 470)

    // 2. Header
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(clubName.toUpperCase(), 400, 55)

    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText(`${match.sport.toUpperCase()} • ${match.match_type.toUpperCase()} SESSION`, 400, 80)

    // 3. Extract Team details
    const team1 = match.participants
      .filter((p) => p.team === 1)
      .map((p) => p.name || p.guest_name || 'Guest')
    const team2 = match.participants
      .filter((p) => p.team === 2)
      .map((p) => p.name || p.guest_name || 'Guest')

    const team1Text = team1.join(' & ').toUpperCase()
    const team2Text = team2.join(' & ').toUpperCase()

    // Determine Winner for visual highlight
    const scoreSets = match.score_sets || []
    const team1Sets = scoreSets.filter((s) => s.team1_score > s.team2_score).length
    const team2Sets = scoreSets.filter((s) => s.team2_score > s.team1_score).length
    const winner = team1Sets > team2Sets ? 1 : (team2Sets > team1Sets ? 2 : 0)

    // 4. Scoreboard Main Container
    const containerX = 40
    const containerY = 110
    const containerW = 720
    const containerH = 280

    ctx.fillStyle = '#111827' // Dark slate box
    ctx.fillRect(containerX, containerY, containerW, containerH)
    ctx.strokeStyle = '#1f2937' // Border
    ctx.lineWidth = 2
    ctx.strokeRect(containerX, containerY, containerW, containerH)

    // Row highlights for the winning team
    if (winner === 1) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.04)' // Translucent orange glow
      ctx.fillRect(containerX + 2, containerY + 2, containerW - 4, 136)
      // Solid orange left-indicator bar
      ctx.fillStyle = '#f97316'
      ctx.fillRect(containerX, containerY, 5, 140)
    } else if (winner === 2) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.04)' // Translucent green glow
      ctx.fillRect(containerX + 2, containerY + 142, containerW - 4, 136)
      // Solid green left-indicator bar
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(containerX, containerY + 140, 5, 140)
    }

    // Horizontal Row Separator
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(containerX, containerY + 140)
    ctx.lineTo(containerX + containerW, containerY + 140)
    ctx.stroke()

    // 5. Draw Crown Function
    const drawCrown = (c: CanvasRenderingContext2D, cx: number, cy: number) => {
      c.fillStyle = '#fbbf24' // gold
      c.beginPath()
      c.moveTo(cx, cy + 18)
      c.lineTo(cx + 4, cy + 6)
      c.lineTo(cx + 9, cy + 12)
      c.lineTo(cx + 13, cy + 2)
      c.lineTo(cx + 17, cy + 12)
      c.lineTo(cx + 22, cy + 6)
      c.lineTo(cx + 26, cy + 18)
      c.closePath()
      c.fill()
    }

    // 6. Render Team Names
    ctx.textAlign = 'left'
    
    // Team 1 Row Names
    ctx.fillStyle = '#f97316' // Orange
    ctx.font = 'bold 22px sans-serif'
    let t1NameX = containerX + 30
    if (winner === 1) {
      drawCrown(ctx, containerX + 30, containerY + 60)
      ctx.fillStyle = '#fbbf24' // Show "WINNER" tag in gold
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('MATCH WINNER', containerX + 62, containerY + 45)
      
      ctx.fillStyle = '#f97316'
      ctx.font = 'bold 22px sans-serif'
      t1NameX = containerX + 62
    }
    ctx.fillText(team1Text, t1NameX, containerY + 78)

    // Team 2 Row Names
    ctx.fillStyle = '#22c55e' // Green
    ctx.font = 'bold 22px sans-serif'
    let t2NameX = containerX + 30
    if (winner === 2) {
      drawCrown(ctx, containerX + 30, containerY + 200)
      ctx.fillStyle = '#fbbf24' // Show "WINNER" tag in gold
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText('MATCH WINNER', containerX + 62, containerY + 185)
      
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 22px sans-serif'
      t2NameX = containerX + 62
    }
    ctx.fillText(team2Text, t2NameX, containerY + 218)

    // 7. Draw Set Scores Grid Boxes (Centered in Right Panel X: 460 to 740)
    const numSets = scoreSets.length
    const boxW = 66
    const boxH = 92
    const boxGap = 12
    const totalW = numSets * boxW + (numSets - 1) * boxGap
    const scoreAreaCenterX = containerX + containerW - 150 // X = 610
    const startX = scoreAreaCenterX - (totalW / 2)

    scoreSets.forEach((set, idx) => {
      const xPos = startX + idx * (boxW + boxGap)
      
      // Draw set labels above the box (e.g. SET 1)
      ctx.fillStyle = '#64748b'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`SET ${set.set_number}`, xPos + boxW / 2, containerY - 10)

      // Set Winner detection
      const team1WonSet = set.team1_score > set.team2_score
      const team2WonSet = set.team2_score > set.team1_score

      // Draw Team 1 Box (Top Row)
      const t1Y = containerY + 24
      if (team1WonSet) {
        // Solid Orange fill for Set Winner
        ctx.fillStyle = '#f97316'
        ctx.fillRect(xPos, t1Y, boxW, boxH)
        ctx.fillStyle = '#111827' // Dark text
      } else {
        // Translucent dark box with Orange border & number for Set Loser
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(xPos, t1Y, boxW, boxH)
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)'
        ctx.lineWidth = 1.5
        ctx.strokeRect(xPos, t1Y, boxW, boxH)
        ctx.fillStyle = '#f97316' // Orange number
      }
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(set.team1_score.toString(), xPos + boxW / 2, t1Y + boxH / 2 + 12)

      // Draw Team 2 Box (Bottom Row)
      const t2Y = containerY + 164
      if (team2WonSet) {
        // Solid Green fill for Set Winner
        ctx.fillStyle = '#22c55e'
        ctx.fillRect(xPos, t2Y, boxW, boxH)
        ctx.fillStyle = '#111827' // Dark text
      } else {
        // Translucent dark box with Green border & number for Set Loser
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(xPos, t2Y, boxW, boxH)
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'
        ctx.lineWidth = 1.5
        ctx.strokeRect(xPos, t2Y, boxW, boxH)
        ctx.fillStyle = '#22c55e' // Green number
      }
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(set.team2_score.toString(), xPos + boxW / 2, t2Y + boxH / 2 + 12)
    })

    // 8. Footer
    ctx.fillStyle = '#475569'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(new Date(match.match_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase(), 40, 440)

    ctx.textAlign = 'right'
    ctx.fillText('WWW.KELABSUKAN.COM', 760, 440)

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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

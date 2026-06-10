import { useEffect, useRef, useState } from 'react'
import { Download, Share2, X, Check } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

interface RivalryShareModalProps {
  rivalName: string
  wins: number
  losses: number
  matchesPlayed: number
  userName: string
  onClose: () => void
  mode?: 'rival' | 'partner'
}

export default function RivalryShareModal({
  rivalName,
  wins,
  losses,
  matchesPlayed,
  userName,
  onClose,
  mode = 'rival',
}: RivalryShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [copied, setCopied] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string>('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set dimensions
    canvas.width = 800
    canvas.height = 500

    // 1. Dark Neon Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 800, 500)
    gradient.addColorStop(0, '#0f172a') // Dark slate
    gradient.addColorStop(0.5, '#020617') // Near black
    gradient.addColorStop(1, '#0f172a') // Dark slate
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 800, 500)

    // 2. Neon accents (split color lines)
    // Left accent (Emerald)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)'
    ctx.lineWidth = 40
    ctx.beginPath()
    ctx.moveTo(-50, 0)
    ctx.lineTo(350, 500)
    ctx.stroke()

    // Right accent (Amber/Gold depending on mode)
    ctx.strokeStyle = mode === 'partner' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'
    ctx.lineWidth = 40
    ctx.beginPath()
    ctx.moveTo(850, 500)
    ctx.lineTo(450, 0)
    ctx.stroke()

    // 3. Grid line overlays
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
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

    // 4. Gold frame borders
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.5
    ctx.strokeRect(20, 20, 760, 460)

    ctx.strokeStyle = '#fbbf24' // Gold accent border
    ctx.lineWidth = 3
    ctx.strokeRect(25, 25, 750, 450)

    // 5. Header branding
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    if (mode === 'partner') {
      ctx.fillText('DOUBLES PARTNERSHIP RECORD', 400, 75)
    } else {
      ctx.fillText('HEAD-TO-HEAD RIVALRY', 400, 75)
    }

    ctx.fillStyle = '#64748b'
    ctx.font = 'semibold 13px sans-serif'
    ctx.fillText(`TOTAL MATCHES PLAYED: ${matchesPlayed}`, 400, 100)

    // 6. Draw Split Layout
    // Left side: User (Emerald)
    ctx.fillStyle = '#10b981' // Emerald
    ctx.beginPath()
    ctx.arc(200, 180, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(userName.toUpperCase(), 200, 220)

    ctx.fillStyle = '#10b981'
    ctx.font = 'bold 80px sans-serif'
    ctx.fillText(wins.toString(), 200, 310)

    ctx.fillStyle = '#64748b'
    ctx.font = '14px sans-serif'
    ctx.fillText(mode === 'partner' ? 'WINS TOGETHER' : 'WINS', 200, 345)

    // Center divider
    ctx.fillStyle = mode === 'partner' ? '#10b981' : '#ef4444'
    ctx.font = 'italic bold 32px sans-serif'
    ctx.fillText(mode === 'partner' ? '&' : 'VS', 400, 260)

    // Right side: Rival (Amber/Emerald depending on mode)
    ctx.fillStyle = mode === 'partner' ? '#10b981' : '#f59e0b' // Partner is also green, Rival is gold/amber
    ctx.beginPath()
    ctx.arc(600, 180, 5, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(rivalName.toUpperCase(), 600, 220)

    ctx.fillStyle = mode === 'partner' ? '#f87171' : '#f59e0b' // Red for losses together, amber for rival wins
    ctx.font = 'bold 80px sans-serif'
    ctx.fillText(losses.toString(), 600, 310)

    ctx.fillStyle = '#64748b'
    ctx.font = '14px sans-serif'
    ctx.fillText(mode === 'partner' ? 'LOSSES TOGETHER' : 'WINS', 600, 345)

    // 7. Status Banner
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(150, 380, 500, 45)
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)'
    ctx.strokeRect(150, 380, 500, 45)

    let statusText: string
    if (mode === 'partner') {
      const total = wins + losses
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
      if (winRate >= 65) {
        statusText = 'A dominant partnership! 🏆'
        ctx.fillStyle = '#10b981'
      } else if (winRate >= 45) {
        statusText = 'A solid, competitive pair! 🤝'
        ctx.fillStyle = '#fbbf24'
      } else {
        statusText = 'Playing and improving together! 🎾'
        ctx.fillStyle = '#64748b'
      }
    } else {
      if (wins > losses) {
        statusText = `${userName.split(' ')[0]} holds the lead! 👑`
        ctx.fillStyle = '#10b981'
      } else if (losses > wins) {
        statusText = `${rivalName.split(' ')[0]} holds the lead! 👑`
        ctx.fillStyle = '#f59e0b'
      } else {
        statusText = "The rivalry is currently tied! ⚔️"
        ctx.fillStyle = '#fbbf24'
      }
    }

    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(statusText.toUpperCase(), 400, 408)

    // 8. Footer branding
    ctx.fillStyle = '#475569'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`REPORT GENERATED ON ${new Date().toLocaleDateString().toUpperCase()}`, 50, 455)

    ctx.textAlign = 'right'
    ctx.fillText('KELABSUKAN.COM', 750, 455)

    // Generate url
    setDownloadUrl(canvas.toDataURL('image/png'))
  }, [rivalName, wins, losses, matchesPlayed, userName, mode])

  const handleDownload = () => {
    if (!downloadUrl) return
    const link = document.createElement('a')
    link.download = mode === 'partner'
      ? `partnership-${userName.split(' ')[0]}-and-${rivalName.split(' ')[0]}.png`
      : `rivalry-${userName.split(' ')[0]}-vs-${rivalName.split(' ')[0]}.png`
    link.href = downloadUrl
    link.click()
  }

  const handleShare = async () => {
    const shareText = mode === 'partner'
      ? `Check out our doubles partnership stats on kelabsukan.com!\nRecord: ${userName.split(' ')[0]} & ${rivalName.split(' ')[0]} - ${wins} Wins / ${losses} Losses`
      : `Check out my Head-to-Head rivalry stats against ${rivalName} on kelabsukan.com!\nRecord: ${userName.split(' ')[0]} ${wins} - ${losses} ${rivalName.split(' ')[0]}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: mode === 'partner' ? 'Doubles Partnership Stats' : 'H2H Rivalry Comparison',
          text: shareText,
          url: window.location.href,
        })
      } catch (err) {
        console.error('Share failed:', err)
      }
    } else {
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
              <h2 className="text-xl font-bold text-white">{mode === 'partner' ? 'Share Partnership Card' : 'Share Rivalry Card'}</h2>
              <p className="text-sm text-slate-400">Download or copy a premium {mode === 'partner' ? 'partnership' : 'rivalry'} summary card.</p>
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
              {copied ? 'Copied Details' : 'Share Card'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

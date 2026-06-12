import { useRef, useCallback } from 'react'
import { Trophy, Share2, Download } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import type { Friendly, FriendlyMatchup } from '../../types/friendly'
import type { FriendlyStoryMoment } from '../../lib/friendlyStoryMoments'

interface FriendlyShareCardProps {
  friendly: Friendly
  matchups: FriendlyMatchup[]
  story?: FriendlyStoryMoment
  variant?: 'square' | 'vertical' | 'compact'
}

export function FriendlyShareCard({
  friendly,
  matchups,
  story,
  variant = 'square',
}: FriendlyShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const invitingClubWins = matchups.filter(
    (m) => m.status === 'completed' && m.winner_club_id === friendly.inviting_club_id
  ).length
  const invitedClubWins = matchups.filter(
    (m) => m.status === 'completed' && m.winner_club_id === friendly.invited_club_id
  ).length

  const isComplete = friendly.status === 'completed'
  const isLive = friendly.status === 'live'

  const generateCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set dimensions based on variant
    const width = variant === 'vertical' ? 1080 : 1080
    const height = variant === 'vertical' ? 1920 : 1080
    canvas.width = width
    canvas.height = height

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#040d0f')
    gradient.addColorStop(1, '#0a1f1a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Border
    ctx.strokeStyle = '#ccff0040'
    ctx.lineWidth = 8
    ctx.strokeRect(20, 20, width - 40, height - 40)

    // Title
    ctx.fillStyle = '#ccff00'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      isComplete ? 'FRIENDLY RESULT' : isLive ? 'LIVE FRIENDLY' : 'FRIENDLY CHALLENGE',
      width / 2,
      100
    )

    // Clubs and Score
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 72px sans-serif'
    ctx.fillText(friendly.inviting_club?.name || '', width / 2 - 200, 250)
    ctx.fillText(
      friendly.invited_club?.name || friendly.invited_club_name,
      width / 2 - 200,
      340
    )

    // Score
    ctx.fillStyle = isComplete
      ? invitingClubWins > invitedClubWins
        ? '#ccff00'
        : '#64748b'
      : '#ffffff'
    ctx.font = 'bold 120px sans-serif'
    ctx.fillText(`${invitingClubWins}`, width / 2 + 100, 300)
    ctx.fillStyle = isComplete
      ? invitedClubWins > invitingClubWins
        ? '#ccff00'
        : '#64748b'
      : '#ffffff'
    ctx.fillText(`${invitedClubWins}`, width / 2 + 100, 400)

    // VS
    ctx.fillStyle = '#64748b'
    ctx.font = 'bold 48px sans-serif'
    ctx.fillText('-', width / 2 + 100, 350)

    // Story quote
    if (story) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = 'italic 36px sans-serif'
      ctx.fillText(`"${story.body.substring(0, 60)}..."`, width / 2, 550)
    }

    // Match results (compact)
    if (variant !== 'compact') {
      let y = 650
      matchups.slice(0, 5).forEach((matchup) => {
        if (matchup.status === 'completed') {
          const scoreA = matchup.match?.score_sets?.filter((s) => s.team1_score > s.team2_score).length || 0
          const scoreB = matchup.match?.score_sets?.filter((s) => s.team2_score > s.team1_score).length || 0

          ctx.fillStyle = '#64748b'
          ctx.font = '28px sans-serif'
          ctx.textAlign = 'left'
          ctx.fillText(`${matchup.pair_a?.pair_name || ''} ${scoreA}-${scoreB} ${matchup.pair_b?.pair_name || ''}`, 100, y)
          y += 50
        }
      })
    }

    // Footer
    ctx.fillStyle = '#ccff00'
    ctx.font = 'bold 36px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('KelabSukan', width / 2, height - 80)

    // URL
    ctx.fillStyle = '#64748b'
    ctx.font = '24px sans-serif'
    ctx.fillText(`${window.location.origin}/friendly/${friendly.id}`, width / 2, height - 40)
  }, [friendly, matchups, story, variant, invitedClubWins, invitingClubWins, isComplete, isLive])

  const handleDownload = () => {
    generateCanvas()
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `friendly-${friendly.id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleShare = async () => {
    generateCanvas()
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob(async (blob) => {
      if (!blob) return

      const file = new File([blob], `friendly-${friendly.id}.png`, { type: 'image/png' })

      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `${friendly.inviting_club?.name} vs ${friendly.invited_club?.name || friendly.invited_club_name}`,
            text: buildShareText(),
            files: [file],
          })
        } catch {
          // User cancelled
        }
      } else {
        // Fallback: download
        handleDownload()
      }
    })
  }

  const buildShareText = () => {
    let text: string

    if (isComplete) {
      const winner =
        friendly.winning_club_id === friendly.inviting_club_id
          ? friendly.inviting_club?.name
          : friendly.invited_club?.name || friendly.invited_club_name
      text = `${friendly.inviting_club?.name} ${invitingClubWins}-${invitedClubWins} ${friendly.invited_club?.name || friendly.invited_club_name}\n\n${winner} takes the friendly!`
    } else if (isLive) {
      text = `${friendly.inviting_club?.name} ${invitingClubWins}-${invitedClubWins} ${friendly.invited_club?.name || friendly.invited_club_name} — LIVE!\n\n${friendly.pair_count - invitingClubWins - invitedClubWins} matches remain.`
    } else {
      text = `${friendly.inviting_club?.name} challenges ${friendly.invited_club?.name || friendly.invited_club_name} to a Friendly!`
    }

    if (story) {
      text += `\n\n${story.title}: ${story.body}`
    }

    return text
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      <Card className="overflow-hidden border-white/10">
        <CardContent className="p-0">
          <div className="aspect-square bg-gradient-to-b from-[var(--arena-bg)] to-[var(--arena-surface)] p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <Badge variant={isLive ? 'live' : isComplete ? 'blue' : 'muted'}>
                {isComplete ? (
                  <>
                    <Trophy size={12} className="mr-1" />
                    Result
                  </>
                ) : isLive ? (
                  <>
                    <span className="mr-1">●</span>
                    Live
                  </>
                ) : (
                  'Challenge'
                )}
              </Badge>
              <span className="text-xs text-slate-400">KelabSukan</span>
            </div>

            {/* Score */}
            <div className="mb-6 flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-sm text-slate-400">{friendly.inviting_club?.name}</p>
                <p
                  className={`text-6xl font-black ${
                    isComplete && invitingClubWins > invitedClubWins ? 'text-[var(--arena-lime)]' : 'text-white'
                  }`}
                >
                  {invitingClubWins}
                </p>
              </div>
              <div className="text-3xl font-bold text-slate-500">-</div>
              <div className="text-center">
                <p className="text-sm text-slate-400">
                  {friendly.invited_club?.name || friendly.invited_club_name}
                </p>
                <p
                  className={`text-6xl font-black ${
                    isComplete && invitedClubWins > invitingClubWins ? 'text-[var(--arena-lime)]' : 'text-white'
                  }`}
                >
                  {invitedClubWins}
                </p>
              </div>
            </div>

            {/* Story */}
            {story && (
              <div className="mb-6 text-center">
                <p className="text-lg font-bold text-white">{story.title}</p>
                <p className="text-sm italic text-slate-400">
                  "{story.body.substring(0, 80)}..."
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-slate-500">
              {window.location.origin}/friendly/{friendly.id}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleShare} className="flex-1 gap-2 bg-[var(--arena-lime)] text-black">
          <Share2 size={16} />
          Share
        </Button>
        <Button onClick={handleDownload} variant="secondary" className="gap-2 border-white/10">
          <Download size={16} />
          Download
        </Button>
      </div>

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

interface FriendlyShareButtonProps {
  friendly: Friendly
  matchups: FriendlyMatchup[]
  story?: FriendlyStoryMoment
}

export function FriendlyShareButton({ friendly, matchups, story }: FriendlyShareButtonProps) {
  const handleShareNative = async () => {
    const invitingClubWins = matchups.filter(
      (m) => m.status === 'completed' && m.winner_club_id === friendly.inviting_club_id
    ).length
    const invitedClubWins = matchups.filter(
      (m) => m.status === 'completed' && m.winner_club_id === friendly.invited_club_id
    ).length

    const isComplete = friendly.status === 'completed'
    const isLive = friendly.status === 'live'

    let text: string

    if (isComplete) {
      const winner =
        friendly.winning_club_id === friendly.inviting_club_id
          ? friendly.inviting_club?.name
          : friendly.invited_club?.name || friendly.invited_club_name
      text = `${friendly.inviting_club?.name} ${invitingClubWins}-${invitedClubWins} ${friendly.invited_club?.name || friendly.invited_club_name}\n\n${winner} takes the friendly!`
    } else if (isLive) {
      text = `${friendly.inviting_club?.name} ${invitingClubWins}-${invitedClubWins} ${friendly.invited_club?.name || friendly.invited_club_name} — LIVE!\n\n${friendly.pair_count - invitingClubWins - invitedClubWins} matches remain.`
    } else {
      text = `${friendly.inviting_club?.name} challenges ${friendly.invited_club?.name || friendly.invited_club_name} to a Friendly!`
    }

    if (story) {
      text += `\n\n${story.title}: ${story.body}`
    }

    text += `\n\n${window.location.origin}/friendly/${friendly.id}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${friendly.inviting_club?.name} vs ${friendly.invited_club?.name || friendly.invited_club_name}`,
          text,
        })
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(text)
    }
  }

  return (
    <Button
      onClick={handleShareNative}
      variant="secondary"
      className="gap-2 border-white/10"
    >
      <Share2 size={16} />
      Share
    </Button>
  )
}

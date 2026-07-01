import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'
import { sharePayload, copyToClipboard, buildStoryShareText } from '../lib/share'

interface StoryShareGroupProps {
  title: string
  body: string
  proofLabel: string
  clubName: string
  url?: string
  size?: 'sm' | 'md'
}

export function StoryShareGroup({
  title,
  body,
  proofLabel,
  clubName,
  url,
  size = 'md',
}: StoryShareGroupProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = url || window.location.origin
  const shareText = buildStoryShareText({ title, body, proofLabel, clubName, url: shareUrl })

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await sharePayload({ title, text: shareText, url: shareUrl })
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await copyToClipboard(shareText)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const btnSize = size === 'sm' ? 'w-7 h-7 rounded' : 'w-8 h-8 rounded-lg'
  const iconSize = size === 'sm' ? 11 : 13

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      {/* Share (native sheet → any app) */}
      <button
        type="button"
        onClick={handleShare}
        className={`${btnSize} border transition-all flex items-center justify-center cursor-pointer bg-[var(--arena-surface-muted)] hover:bg-[var(--arena-accent-soft)] border-[var(--arena-border)] hover:border-[var(--arena-accent)]/30 text-[var(--arena-text-muted)] hover:text-[var(--arena-accent)]`}
        title="Share"
        aria-label="Share"
      >
        <Share2 size={iconSize} />
      </button>

      {/* Copy summary */}
      <button
        type="button"
        onClick={handleCopy}
        className={`${btnSize} border transition-all flex items-center justify-center cursor-pointer ${
          copied
            ? 'bg-[var(--arena-accent-soft)] border-[var(--arena-accent)] text-[var(--arena-accent)]'
            : 'bg-[var(--arena-surface-muted)] hover:bg-[var(--arena-accent-soft)] border-[var(--arena-border)] hover:border-[var(--arena-accent)]/30 text-[var(--arena-text-muted)] hover:text-[var(--arena-accent)]'
        }`}
        title="Copy summary"
        aria-label="Copy summary"
      >
        {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      </button>
    </div>
  )
}

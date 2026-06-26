import React, { useState } from 'react'
import { Share2, Check, Copy, MessageCircle } from 'lucide-react'

const FacebookIcon = ({ size }: { size: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

const TwitterIcon = ({ size }: { size: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
)

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
  size = 'md'
}: StoryShareGroupProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = url || window.location.origin
  const shareText = `🔥 *${title}*\n🏆 ${body}\n\n📊 *The Proof:* ${proofLabel}\n📍 ${clubName} | ${new Date().toLocaleDateString()}\n\nRead match reports on KelabSukan:\n🔗 ${shareUrl}`

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('Failed native share: ', err)
      }
    }
  }

  const btnSize = size === 'sm' ? 'w-7 h-7 rounded' : 'w-8 h-8 rounded-lg'
  const iconSize = size === 'sm' ? 11 : 13

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      {/* WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnSize} bg-[var(--arena-surface-muted)] hover:bg-emerald-950/80 border border-[var(--arena-border)] hover:border-emerald-800 text-[var(--arena-text-muted)] hover:text-emerald-400 transition-all flex items-center justify-center cursor-pointer`}
        title="Share on WhatsApp"
      >
        <MessageCircle size={iconSize} />
      </a>

      {/* X / Twitter */}
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnSize} bg-[var(--arena-surface-muted)] hover:bg-white/10 border border-[var(--arena-border)] hover:border-slate-700 text-[var(--arena-text-muted)] hover:text-white transition-all flex items-center justify-center cursor-pointer`}
        title="Share on X (Twitter)"
      >
        <TwitterIcon size={iconSize} />
      </a>

      {/* Facebook */}
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnSize} bg-[var(--arena-surface-muted)] hover:bg-blue-950/80 border border-[var(--arena-border)] hover:border-blue-800 text-[var(--arena-text-muted)] hover:text-blue-400 transition-all flex items-center justify-center cursor-pointer`}
        title="Share on Facebook"
      >
        <FacebookIcon size={iconSize} />
      </a>

      {/* Native Share (only if supported) */}
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
        <button
          type="button"
          onClick={handleNativeShare}
          className={`${btnSize} bg-[var(--arena-surface-muted)] hover:bg-violet-950/80 border border-[var(--arena-border)] hover:border-violet-800 text-[var(--arena-text-muted)] hover:text-violet-400 transition-all flex items-center justify-center cursor-pointer`}
          title="Share via device options"
        >
          <Share2 size={iconSize} />
        </button>
      )}

      {/* Copy Text */}
      <button
        type="button"
        onClick={handleCopy}
        className={`${btnSize} border transition-all flex items-center justify-center cursor-pointer ${
          copied
            ? 'bg-[var(--arena-accent-soft)] border-[var(--arena-accent)] text-[var(--arena-accent)]'
            : 'bg-[var(--arena-surface-muted)] hover:bg-[var(--arena-accent-soft)] border-[var(--arena-border)] hover:border-[var(--arena-accent)]/30 text-[var(--arena-text-muted)] hover:text-[var(--arena-accent)]'
        }`}
        title="Copy text report"
      >
        {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      </button>
    </div>
  )
}

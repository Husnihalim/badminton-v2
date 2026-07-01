/**
 * Channel-agnostic sharing helpers.
 *
 * The platform's differentiator is the *payload* (proof-backed, emoji-formatted
 * summaries + shareable images), not the pipe. Every modern device already
 * knows how to route a share to whatever app the user has installed, so we
 * lean on the native Web Share API and fall back to clipboard copy.
 */

export interface SharePayload {
  /** Title shown in the native share sheet. */
  title?: string
  /** Rich text body. Pastes cleanly into any messenger. */
  text?: string
  /** Canonical URL to attach. */
  url?: string
  /** Optional image (PNG blob/File) to share as a file. */
  image?: Blob | File | null
  /** Optional mime type hint for the image; defaults to image/png. */
  imageType?: string
  /** Optional filename for the shared image. */
  imageName?: string
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unsupported' | 'error'

function hasNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

function hasClipboard(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.clipboard === 'object'
}

/**
 * Share a payload using the best available mechanism.
 *
 * - Native Web Share API (with image when supported) → opens OS sheet.
 * - Fallback: copy text + url to clipboard.
 *
 * Returns the outcome so callers can show appropriate feedback.
 */
export async function sharePayload(payload: SharePayload): Promise<ShareResult> {
  const { title, text, url, image, imageType, imageName } = payload

  // Try native share first (with image if provided and supported).
  if (hasNativeShare()) {
    try {
      const shareData: ShareData = {
        title: title || undefined,
        text: text || undefined,
        url: url || undefined,
      }

      // Attach image as a file when the API supports it (most mobile browsers).
      if (image) {
        const type = imageType || (image.type) || 'image/png'
        const name = imageName || `kelabsukan-${Date.now()}.png`
        try {
          const file = image instanceof File ? image : new File([image], name, { type })
          // navigator.share supports files on capable browsers; cast to any to satisfy TS.
          const withFiles = shareData as ShareData & { files?: File[] }
          withFiles.files = [file]
        } catch {
          // File construction failed (e.g. Safari quirk) — proceed with text/url only.
        }
      }

      await navigator.share(shareData)
      return 'shared'
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('Abort'))) {
        return 'cancelled'
      }
      // Fall through to clipboard fallback on any other error.
    }
  }

  // Fallback: copy a combined text + url string to clipboard.
  if (hasClipboard()) {
    try {
      const combined = [text, url].filter(Boolean).join('\n\n')
      await navigator.clipboard.writeText(combined || url || title || '')
      return 'copied'
    } catch {
      return 'error'
    }
  }

  return 'unsupported'
}

/**
 * Convenience wrapper that copies a URL (or text) to the clipboard.
 * Use for the secondary "copy link" affordance.
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  if (!hasClipboard()) return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

/**
 * Builds a rich, proof-backed story summary string that pastes cleanly into any messenger.
 */
export function buildStoryShareText(opts: {
  title: string
  body: string
  proofLabel: string
  clubName: string
  url?: string
}): string {
  const { title, body, proofLabel, clubName, url } = opts
  const shareUrl = url || window.location.origin
  return [
    `🔥 *${title}*`,
    `🏆 ${body}`,
    ``,
    `📊 *The Proof:* ${proofLabel}`,
    `📍 ${clubName} | ${new Date().toLocaleDateString()}`,
    ``,
    `Read the full match report & view stats:`,
    `🔗 ${shareUrl}`,
  ].join('\n')
}

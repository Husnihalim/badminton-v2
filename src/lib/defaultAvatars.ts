export interface DefaultAvatar {
  id: string
  label: string
  url: string
}

const rawAvatars = {
  smash_master: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg1)" />
  <path d="M30 65 L50 25 L70 65 Z" fill="#ffffff" opacity="0.9" />
  <path d="M38 65 L50 35 L62 65 Z" fill="#e2e8f0" />
  <path d="M30 65 Q50 72 70 65" stroke="#ef4444" stroke-width="6" fill="none" stroke-linecap="round" />
  <path d="M42 25 H58 V28 H42 Z" fill="#ef4444" />
  <rect x="35" y="42" width="14" height="10" rx="3" fill="#1e293b" />
  <rect x="51" y="42" width="14" height="10" rx="3" fill="#1e293b" />
  <path d="M49 47 H51" stroke="#1e293b" stroke-width="2" />
  <path d="M45 58 Q50 63 55 58" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" />
</svg>`,

  spin_king: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#f43f5e" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg2)" />
  <circle cx="50" cy="52" r="28" fill="#ffedd5" />
  <path d="M28 35 Q22 20 35 25 Z" fill="#f97316" />
  <path d="M72 35 Q78 20 65 25 Z" fill="#f97316" />
  <path d="M50 24 L50 32" stroke="#475569" stroke-width="3" stroke-linecap="round" />
  <path d="M24 50 H32" stroke="#475569" stroke-width="3" stroke-linecap="round" />
  <path d="M76 50 H68" stroke="#475569" stroke-width="3" stroke-linecap="round" />
  <rect x="23" y="36" width="54" height="8" rx="2" fill="#3b82f6" />
  <rect x="42" y="36" width="16" height="8" fill="#ffffff" />
  <path d="M46 40 L54 40" stroke="#ef4444" stroke-width="2" />
  <circle cx="40" cy="52" r="3" fill="#1e293b" />
  <circle cx="60" cy="52" r="3" fill="#1e293b" />
  <circle cx="34" cy="58" r="3" fill="#fda4af" />
  <circle cx="66" cy="58" r="3" fill="#fda4af" />
  <path d="M47 58 Q50 56 53 58" stroke="#1e293b" stroke-width="2" fill="none" />
  <path d="M50 58 Q50 63 50 63" stroke="#1e293b" stroke-width="2" />
</svg>`,

  court_fox: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg3)" />
  <polygon points="25,25 40,48 20,48" fill="#ea580c" />
  <polygon points="75,25 60,48 80,48" fill="#ea580c" />
  <polygon points="28,30 37,45 24,45" fill="#ffedd5" />
  <polygon points="72,30 63,45 76,45" fill="#ffedd5" />
  <polygon points="20,48 80,48 50,80" fill="#f97316" />
  <polygon points="32,48 68,48 50,80" fill="#ffffff" />
  <circle cx="50" cy="78" r="4" fill="#1e293b" />
  <rect x="23" y="44" width="54" height="7" rx="1" fill="#ccff00" />
  <path d="M35 55 Q40 50 45 55" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" />
  <path d="M65 55 Q60 50 55 55" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" />
</svg>`,

  golden_champion: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#db2777" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg4)" />
  <path d="M25 35 Q15 45 25 55" stroke="#fbbf24" stroke-width="6" fill="none" stroke-linecap="round" />
  <path d="M75 35 Q85 45 75 55" stroke="#fbbf24" stroke-width="6" fill="none" stroke-linecap="round" />
  <path d="M30 30 H70 V52 C70 62 60 70 50 70 C40 70 30 62 30 52 Z" fill="#f59e0b" />
  <path d="M50 70 V82" stroke="#f59e0b" stroke-width="8" stroke-linecap="round" />
  <path d="M35 82 H65" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" />
  <rect x="30" y="36" width="40" height="7" fill="#10b981" />
  <path d="M40 48 C40 48 42 45 44 48" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round" />
  <path d="M56 46 L62 50 M62 46 L56 50" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" />
  <path d="M47 57 Q50 61 53 57" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round" />
  <polygon points="50,18 52,23 57,23 53,26 55,31 50,28 45,31 47,26 43,23 48,23" fill="#ffffff" />
</svg>`,

  lightning_shuttle: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg5" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg5)" />
  <circle cx="50" cy="50" r="32" fill="#ccff00" opacity="0.15" filter="blur(8px)" />
  <path d="M32 70 L50 25 L68 70 Z" fill="#ccff00" opacity="0.8" />
  <path d="M40 70 L50 35 L60 70 Z" fill="#ffffff" />
  <path d="M32 70 Q50 76 68 70" stroke="#3b82f6" stroke-width="5" fill="none" stroke-linecap="round" />
  <path d="M44 24 H56 V27 H44 Z" fill="#3b82f6" />
  <polygon points="40,40 44,45 39,45 42,51 38,47 41,47" fill="#3b82f6" />
  <polygon points="60,40 64,45 59,45 62,51 58,47 61,47" fill="#3b82f6" />
  <path d="M46 58 Q50 63 54 58" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" />
</svg>`,

  cyber_smash: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg6" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg6)" />
  <rect x="28" y="28" width="44" height="44" rx="14" fill="#0f172a" />
  <circle cx="50" cy="42" r="22" fill="#1e293b" />
  <path d="M28 42 H72 V54 C72 58 68 62 62 62 H38 C32 62 28 58 28 54 Z" fill="#ccff00" opacity="0.9" />
  <line x1="34" y1="42" x2="44" y2="62" stroke="#0f172a" stroke-width="1.5" opacity="0.6" />
  <line x1="42" y1="42" x2="52" y2="62" stroke="#0f172a" stroke-width="1.5" opacity="0.6" />
  <line x1="50" y1="42" x2="60" y2="62" stroke="#0f172a" stroke-width="1.5" opacity="0.6" />
  <line x1="58" y1="42" x2="68" y2="62" stroke="#0f172a" stroke-width="1.5" opacity="0.6" />
  <line x1="28" y1="50" x2="72" y2="50" stroke="#0f172a" stroke-width="1.5" opacity="0.6" />
  <line x1="28" y1="56" x2="72" y2="56" stroke="#0f172a" stroke-width="1.5" opacity="0.6" />
  <rect x="23" y="42" width="6" height="16" rx="2" fill="#334155" />
  <rect x="71" y="42" width="6" height="16" rx="2" fill="#334155" />
</svg>`
}

const encodeSvg = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, ' '))}`

export const DEFAULT_AVATARS: DefaultAvatar[] = [
  { id: 'smash_master', label: 'Smash Master', url: encodeSvg(rawAvatars.smash_master) },
  { id: 'spin_king', label: 'Spin King', url: encodeSvg(rawAvatars.spin_king) },
  { id: 'court_fox', label: 'Court Fox', url: encodeSvg(rawAvatars.court_fox) },
  { id: 'golden_champion', label: 'Golden Champion', url: encodeSvg(rawAvatars.golden_champion) },
  { id: 'lightning_shuttle', label: 'Lightning Shuttle', url: encodeSvg(rawAvatars.lightning_shuttle) },
  { id: 'cyber_smash', label: 'Cyber Smash', url: encodeSvg(rawAvatars.cyber_smash) }
]

export function getDefaultAvatar(identifier?: string | null): string {
  if (!identifier) {
    return DEFAULT_AVATARS[0].url
  }
  
  // Simple deterministic hash function
  let hash = 0
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % DEFAULT_AVATARS.length
  return DEFAULT_AVATARS[index].url
}

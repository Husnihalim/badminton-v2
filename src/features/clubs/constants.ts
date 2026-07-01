export const BANNER_PRESETS = [
  { id: 'court_green', name: 'Court Green', gradient: 'bg-gradient-to-r from-[var(--arena-accent)] to-[var(--arena-surface-elevated)]' },
  { id: 'court_blue', name: 'Court Blue', gradient: 'bg-gradient-to-r from-[var(--arena-info)] to-[var(--arena-surface-elevated)]' },
  { id: 'dark_elite', name: 'Dark Elite', gradient: 'bg-gradient-to-r from-[var(--arena-surface-elevated)] to-[var(--arena-bg)]' },
  { id: 'neon_arena', name: 'Neon Arena', gradient: 'bg-gradient-to-r from-[var(--arena-accent)] to-[var(--arena-info)]' },
]

export const THEME_MAP: Record<string, {
  bg: string
  bgHover: string
  bgLight: string
  text: string
  textDark: string
  textLight: string
  border: string
  borderLight: string
  ring: string
  ringFocus: string
}> = {
  emerald: {
    bg: 'bg-[var(--arena-accent)]',
    bgHover: 'hover:brightness-110',
    bgLight: 'bg-[var(--arena-accent-soft)]',
    text: 'text-[var(--arena-accent)]',
    textDark: 'text-[var(--arena-accent)]',
    textLight: 'text-[var(--arena-accent)]',
    border: 'border-[var(--arena-accent)]',
    borderLight: 'border-[var(--arena-accent-soft)]',
    ring: 'ring-[var(--arena-accent)] focus-visible:ring-[var(--arena-accent)]',
    ringFocus: 'focus:ring-[var(--arena-accent)] focus:border-[var(--arena-accent)]',
  },
  indigo: {
    bg: 'bg-info',
    bgHover: 'hover:brightness-110',
    bgLight: 'bg-info-soft',
    text: 'text-info',
    textDark: 'text-info',
    textLight: 'text-info',
    border: 'border-info',
    borderLight: 'border-info-soft',
    ring: 'ring-info focus-visible:ring-info',
    ringFocus: 'focus:ring-info focus:border-info',
  },
  violet: {
    bg: 'bg-info',
    bgHover: 'hover:brightness-110',
    bgLight: 'bg-info-soft',
    text: 'text-info',
    textDark: 'text-info',
    textLight: 'text-info',
    border: 'border-info',
    borderLight: 'border-info-soft',
    ring: 'ring-info focus-visible:ring-info',
    ringFocus: 'focus:ring-info focus:border-info',
  },
  amber: {
    bg: 'bg-warning',
    bgHover: 'hover:brightness-110',
    bgLight: 'bg-warning-soft',
    text: 'text-warning',
    textDark: 'text-warning',
    textLight: 'text-warning',
    border: 'border-warning',
    borderLight: 'border-warning-soft',
    ring: 'ring-warning focus-visible:ring-warning',
    ringFocus: 'focus:ring-warning focus:border-warning',
  },
  rose: {
    bg: 'bg-danger',
    bgHover: 'hover:brightness-110',
    bgLight: 'bg-danger-soft',
    text: 'text-danger',
    textDark: 'text-danger',
    textLight: 'text-danger',
    border: 'border-danger',
    borderLight: 'border-danger-soft',
    ring: 'ring-danger focus-visible:ring-danger',
    ringFocus: 'focus:ring-danger focus:border-danger',
  },
  sky: {
    bg: 'bg-info',
    bgHover: 'hover:brightness-110',
    bgLight: 'bg-info-soft',
    text: 'text-info',
    textDark: 'text-info',
    textLight: 'text-info',
    border: 'border-info',
    borderLight: 'border-info-soft',
    ring: 'ring-info focus-visible:ring-info',
    ringFocus: 'focus:ring-info focus:border-info',
  },
}

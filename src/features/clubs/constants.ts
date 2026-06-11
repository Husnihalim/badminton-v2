export const BANNER_PRESETS = [
  { id: 'court_green', name: 'Court Green', gradient: 'bg-gradient-to-r from-[var(--arena-accent)] to-emerald-800' },
  { id: 'court_blue', name: 'Court Blue', gradient: 'bg-gradient-to-r from-sky-600 to-indigo-800' },
  { id: 'dark_elite', name: 'Dark Elite', gradient: 'bg-gradient-to-r from-slate-800 to-slate-950' },
  { id: 'neon_arena', name: 'Neon Arena', gradient: 'bg-gradient-to-r from-fuchsia-700 to-violet-900' },
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
    bg: 'bg-indigo-600',
    bgHover: 'hover:bg-indigo-700',
    bgLight: 'bg-indigo-50',
    text: 'text-indigo-700',
    textDark: 'text-indigo-800',
    textLight: 'text-indigo-400',
    border: 'border-indigo-500',
    borderLight: 'border-indigo-200',
    ring: 'ring-indigo-600 focus-visible:ring-indigo-500',
    ringFocus: 'focus:ring-indigo-600 focus:border-indigo-600',
  },
  violet: {
    bg: 'bg-violet-600',
    bgHover: 'hover:bg-violet-700',
    bgLight: 'bg-violet-50',
    text: 'text-violet-700',
    textDark: 'text-violet-800',
    textLight: 'text-violet-400',
    border: 'border-violet-500',
    borderLight: 'border-violet-200',
    ring: 'ring-violet-600 focus-visible:ring-violet-500',
    ringFocus: 'focus:ring-violet-600 focus:border-violet-600',
  },
  amber: {
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-700',
    bgLight: 'bg-amber-50',
    text: 'text-amber-700',
    textDark: 'text-amber-800',
    textLight: 'text-amber-400',
    border: 'border-amber-500',
    borderLight: 'border-amber-200',
    ring: 'ring-amber-600 focus-visible:ring-amber-500',
    ringFocus: 'focus:ring-amber-600 focus:border-amber-600',
  },
  rose: {
    bg: 'bg-rose-600',
    bgHover: 'hover:bg-rose-700',
    bgLight: 'bg-rose-50',
    text: 'text-rose-700',
    textDark: 'text-rose-800',
    textLight: 'text-rose-400',
    border: 'border-rose-500',
    borderLight: 'border-rose-200',
    ring: 'ring-rose-600 focus-visible:ring-rose-500',
    ringFocus: 'focus:ring-rose-600 focus:border-rose-600',
  },
  sky: {
    bg: 'bg-sky-600',
    bgHover: 'hover:bg-sky-700',
    bgLight: 'bg-sky-50',
    text: 'text-sky-700',
    textDark: 'text-sky-800',
    textLight: 'text-sky-400',
    border: 'border-sky-500',
    borderLight: 'border-sky-200',
    ring: 'ring-sky-600 focus-visible:ring-sky-500',
    ringFocus: 'focus:ring-sky-600 focus:border-sky-600',
  },
}

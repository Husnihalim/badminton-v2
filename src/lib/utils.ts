import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred') {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>
    if (typeof errorObj.message === 'string' && errorObj.message.length) return errorObj.message
    if (typeof errorObj.error === 'string' && errorObj.error.length) return errorObj.error
    if (typeof errorObj.msg === 'string' && errorObj.msg.length) return errorObj.msg
    if (typeof errorObj.details === 'string' && errorObj.details.length) return errorObj.details
    if (typeof errorObj.hint === 'string' && errorObj.hint.length) return errorObj.hint
    if (typeof errorObj.code === 'string' && errorObj.code.length) return errorObj.code
  }
  return fallback
}

export function isMissingRpcFunctionError(err: unknown, functionName: string): boolean {
  if (typeof err !== 'object' || err === null) return false
  const errorObj = err as Record<string, unknown>
  const messageParts = [
    typeof errorObj.message === 'string' ? errorObj.message : '',
    typeof errorObj.error === 'string' ? errorObj.error : '',
    typeof errorObj.details === 'string' ? errorObj.details : '',
    typeof errorObj.hint === 'string' ? errorObj.hint : '',
  ]
  const message = messageParts.filter(Boolean).join(' ').trim()

  if (errorObj.code === 'PGRST202') return true
  if (!message.length) return false

  return message.toLowerCase().includes(functionName.toLowerCase())
    && /does not exist|not found|undefined|missing|cannot call/i.test(message.toLowerCase())
}

export type EloRank = {
  name: string
  className: string
  badgeColor: string
}

export function getEloRank(elo: number): EloRank {
  if (elo < 1100) {
    return {
      name: 'Social Suka-Suka',
      className: 'bg-amber-950/40 text-amber-500 border border-amber-500/25 dark:bg-amber-950/40 dark:text-amber-500 dark:border-amber-500/25',
      badgeColor: '#b45309'
    }
  }
  if (elo < 1400) {
    return {
      name: 'Bakat Baru',
      className: 'bg-sky-950/40 text-sky-400 border border-sky-500/25 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-500/25',
      badgeColor: '#0284c7'
    }
  }
  if (elo < 1700) {
    return {
      name: 'Bakat Pertengahan',
      className: 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/25',
      badgeColor: '#10b981'
    }
  }
  return {
    name: 'Bakat Utama',
    className: 'bg-[var(--arena-accent-soft)] text-[var(--arena-accent)] border border-[var(--arena-accent)]/30 animate-pulse shadow-[0_0_8px_rgba(204,255,0,0.15)] dark:bg-[var(--arena-accent-soft)] dark:text-[var(--arena-accent)] dark:border-[var(--arena-accent)]/30',
    badgeColor: 'var(--arena-accent)'
  }
}


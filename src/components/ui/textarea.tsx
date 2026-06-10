import type { TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] px-3 py-2 text-base text-[var(--arena-text)] outline-none transition focus:border-[var(--arena-accent)] focus:ring-2 focus:ring-[var(--arena-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
        className
      )}
      {...props}
    />
  )
}

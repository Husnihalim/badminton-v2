import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--arena-text-muted)]',
        className
      )}
      {...props}
    />
  )
}

import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-slate-600 bg-[#0b1322] px-2 py-1 text-xs font-semibold text-slate-300 dark:border-white/10 dark:bg-[#0b1322]/5 dark:text-slate-300',
        className
      )}
      {...props}
    />
  )
}

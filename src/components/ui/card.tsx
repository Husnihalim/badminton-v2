import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-600 bg-[#0b1322] shadow-sm transition-colors duration-150 dark:border-white/10 dark:bg-[#0b1322]/70 dark:shadow-black/20',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-2 p-4 pb-3 sm:p-5 sm:pb-3', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 sm:p-5 [&:not(:first-child)]:pt-0', className)} {...props} />
}

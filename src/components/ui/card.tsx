import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/65 dark:backdrop-blur-xl dark:shadow-black/20 dark:hover:border-[#ccff00]/25 dark:hover:shadow-[#ccff00]/5',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-2 p-5 pb-3 sm:p-6 sm:pb-3', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
}

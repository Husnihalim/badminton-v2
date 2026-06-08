import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const cardVariants = cva(
  'rounded-lg border shadow-sm transition-colors duration-150',
  {
    variants: {
      variant: {
        default: 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20',
        arena: 'arena-panel',
        live: 'arena-panel arena-court-lines',
        admin: 'arena-admin-panel',
        score: 'border-[var(--arena-line)] bg-[rgba(4,13,15,0.9)] text-[var(--arena-text)] shadow-[0_12px_32px_rgba(0,0,0,0.26)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

type CardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>

export function Card({ className, variant, ...props }: CardProps) {
  return (
    <div
      className={cn(cardVariants({ variant }), className)}
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

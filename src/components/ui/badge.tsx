import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
        live: 'border-[rgba(204,255,0,0.42)] bg-[rgba(204,255,0,0.12)] text-[var(--arena-lime)]',
        blue: 'border-[rgba(56,189,248,0.38)] bg-[rgba(56,189,248,0.1)] text-[var(--arena-blue)]',
        heat: 'border-amber-400/35 bg-amber-400/10 text-amber-200',
        danger: 'border-red-400/35 bg-red-400/10 text-red-200',
        muted: 'border-white/10 bg-white/[0.05] text-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--arena-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--arena-bg)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'border border-[var(--arena-lime)] bg-[var(--arena-lime)] text-[#040d0f] font-bold shadow-[0_0_12px_color-mix(in_srgb,var(--arena-lime)_30%,transparent)] hover:brightness-110 hover:shadow-[0_0_20px_color-mix(in_srgb,var(--arena-lime)_40%,transparent)]',
        live: 'border border-[var(--arena-lime)] bg-[var(--arena-lime)] text-slate-950 shadow-[0_0_24px_color-mix(in_srgb,var(--arena-lime)_35%,transparent)] hover:brightness-110',
        panel: 'border border-white/10 bg-white/[0.06] text-slate-100 shadow-sm hover:bg-white/[0.1]',
        secondary: 'border border-[var(--arena-border)] bg-[var(--arena-surface-elevated)] text-[var(--arena-text)] shadow-sm hover:bg-[var(--arena-accent-soft)] hover:text-[var(--arena-accent)] hover:border-[var(--arena-accent)]',
        outline: 'border border-[var(--arena-border)] bg-transparent text-[var(--arena-text)] hover:bg-[var(--arena-surface-muted)]',
        ghost: 'text-[var(--arena-text-muted)] hover:bg-[var(--arena-surface-muted)] hover:text-[var(--arena-text)]',
        danger: 'border border-[var(--arena-danger)]/40 bg-[var(--arena-danger-soft)] text-[var(--arena-danger)] hover:bg-[var(--arena-danger)]/20 hover:border-[var(--arena-danger)]/60',
        success: 'border border-[var(--arena-success)]/40 bg-[var(--arena-success-soft)] text-[var(--arena-success)] hover:bg-[var(--arena-success)]/20 hover:border-[var(--arena-success)]/60',
        info: 'border border-[var(--arena-info)]/40 bg-[var(--arena-info-soft)] text-[var(--arena-info)] hover:bg-[var(--arena-info)]/20 hover:border-[var(--arena-info)]/60',
      },
      size: {
        sm: 'min-h-9 px-3 text-xs',
        md: 'min-h-10 px-4 text-sm',
        lg: 'min-h-11 px-5 text-base',
        icon: 'h-10 w-10 px-0',
        'icon-sm': 'h-8 w-8 px-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, fullWidth, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  )
}
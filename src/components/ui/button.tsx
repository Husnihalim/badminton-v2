import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-emerald-700 text-slate-50 hover:bg-emerald-800',
        secondary: 'border border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200 hover:text-slate-950',
        ghost: 'text-slate-700 hover:bg-slate-200 hover:text-slate-950',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'min-h-10 px-3 text-sm',
        md: 'min-h-11 px-4 text-sm',
        lg: 'min-h-12 px-5 text-base',
        icon: 'h-11 w-11 px-0',
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

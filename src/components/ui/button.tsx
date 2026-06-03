import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 dark:bg-[#ccff00] dark:text-[#0b0f19] dark:shadow-md dark:shadow-[#ccff00]/10 dark:hover:bg-[#ddff33] dark:hover:shadow-[#ccff00]/25',
        secondary: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-950 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-white',
        ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/10 hover:shadow-red-600/20',
      },
      size: {
        sm: 'min-h-10 px-3.5 text-xs rounded-lg',
        md: 'min-h-11 px-5 text-sm',
        lg: 'min-h-12 px-6 text-base rounded-2xl',
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

import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]',
  {
    variants: {
      variant: {
        primary: 'border border-blue-700 bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:border-blue-400 dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-300',
        secondary: 'border border-slate-300 bg-[#0b1322] text-slate-300 shadow-sm hover:bg-slate-700 hover:text-slate-300 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-white',
        ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100',
        danger: 'border border-red-700 bg-red-600 text-white shadow-sm hover:bg-red-700',
      },
      size: {
        sm: 'min-h-9 px-3 text-xs',
        md: 'min-h-10 px-4 text-sm',
        lg: 'min-h-11 px-5 text-base',
        icon: 'h-10 w-10 px-0',
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

import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-base text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:text-sm',
        className
      )}
      {...props}
    />
  )
}

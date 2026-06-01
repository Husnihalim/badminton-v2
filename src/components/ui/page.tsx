import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function Page({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-5 sm:space-y-6', className)} {...props} />
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="space-y-4 sm:flex sm:items-start sm:justify-between sm:gap-6 sm:space-y-0">
      <div className="min-w-0 space-y-2">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

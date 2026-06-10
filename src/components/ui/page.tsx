import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function Page({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-6 sm:space-y-7', className)} {...props} />
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="space-y-4 sm:flex sm:items-start sm:justify-between sm:gap-6 sm:space-y-0">
      <div className="min-w-0 space-y-2">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-[var(--arena-accent)]">{eyebrow}</p> : null}
        <h1 className="text-2xl font-extrabold leading-tight text-[var(--arena-text)] sm:text-[1.9rem]">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-6 text-[var(--arena-text-muted)] sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

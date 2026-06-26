import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  tone?: 'default' | 'arena'
}

export function Page({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-4 sm:space-y-7', className)} {...props} />
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap sm:items-center sm:gap-4">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-accent)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-xl font-extrabold leading-tight text-[var(--arena-text)] sm:text-[1.8rem]">
            {title}
          </h1>
        </div>
        {actions ? <div className="flex flex-wrap justify-end gap-1.5 sm:shrink-0">{actions}</div> : null}
      </div>
      {description ? (
        <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-[var(--arena-text-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  )
}

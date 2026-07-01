import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

type PageHeaderProps = HTMLAttributes<HTMLDivElement> & {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  tone?: 'default' | 'arena'
}

export function Page({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-4 sm:space-y-7', className)} {...props} />
}

export function PageHeader({ eyebrow, title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap sm:items-center sm:gap-4">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--arena-accent)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-xl font-black uppercase leading-tight tracking-tight text-[var(--arena-text)] sm:text-2xl">
            {title}
          </h1>
        </div>
        {actions ? <div className="flex flex-wrap justify-end gap-1.5 sm:shrink-0">{actions}</div> : null}
      </div>
      {description ? (
        <p className="max-w-2xl text-xs leading-relaxed text-[var(--arena-text-muted)] sm:text-sm">
          {description}
        </p>
      ) : null}
    </div>
  )
}

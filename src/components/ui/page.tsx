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
  return <div className={cn('space-y-6 sm:space-y-7', className)} {...props} />
}

export function PageHeader({ eyebrow, title, description, actions, tone = 'default' }: PageHeaderProps) {
  const isArena = tone === 'arena'

  return (
    <div className="space-y-4 sm:flex sm:items-start sm:justify-between sm:gap-6 sm:space-y-0">
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className={cn(
            'text-xs font-semibold uppercase tracking-wide',
            isArena ? 'text-[var(--arena-lime)]' : 'text-blue-700 dark:text-blue-300'
          )}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className={cn(
          'text-2xl leading-tight sm:text-[1.9rem]',
          isArena ? 'arena-heading' : 'font-semibold text-slate-950'
        )}>
          {title}
        </h1>
        {description ? (
          <p className={cn(
            'max-w-2xl text-sm leading-6 sm:text-base',
            isArena ? 'text-slate-300' : 'text-slate-600'
          )}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

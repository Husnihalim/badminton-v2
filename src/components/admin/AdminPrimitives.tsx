import type { ReactNode } from 'react'
import { Copy, ShieldCheck, Trash2 } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'

type AdminPanelProps = {
  title: string
  description?: string
  children: ReactNode
}

export function AdminPanel({ title, description, children }: AdminPanelProps) {
  return (
    <Card variant="admin">
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="text-base font-black text-[var(--arena-text)]">{title}</h3>
          {description ? <p className="arena-meta mt-1">{description}</p> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

type ApprovalRowProps = {
  name: string
  requestedAt: string
}

export function ApprovalRow({ name, requestedAt }: ApprovalRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--arena-text)]">{name}</p>
        <p className="arena-meta text-xs">{requestedAt}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" size="sm" variant="live">
          <ShieldCheck size={14} aria-hidden="true" />
          Approve
        </Button>
        <Button type="button" size="sm" variant="panel">Reject</Button>
      </div>
    </div>
  )
}

type InviteLinkCardProps = {
  code: string
  activeLinks: number
}

export function InviteLinkCard({ code, activeLinks }: InviteLinkCardProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="arena-label">Club invite link</p>
          <p className="mt-1 truncate text-sm font-bold text-[var(--arena-text)]">{code}</p>
        </div>
        <Button type="button" size="sm" variant="panel">
          <Copy size={14} aria-hidden="true" />
          Copy
        </Button>
      </div>
      <p className="arena-meta mt-2">{activeLinks} active invite links</p>
    </div>
  )
}

type SettingRowProps = {
  label: string
  value: string
}

export function SettingRow({ label, value }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      <Badge variant="muted">{value}</Badge>
    </div>
  )
}

export function DangerZonePanel() {
  return (
    <div className="rounded-lg border border-red-400/25 bg-red-400/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-red-100">Danger zone</p>
          <p className="mt-1 text-xs leading-5 text-red-100/70">Keep destructive actions isolated from normal admin work.</p>
        </div>
        <Button type="button" size="icon" variant="danger" aria-label="Delete">
          <Trash2 size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

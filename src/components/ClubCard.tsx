import { Link } from 'react-router-dom'
import { MapPin, Users } from 'lucide-react'
import type { Club } from '../types'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'

interface ClubCardProps {
  club: Club
}

export default function ClubCard({ club }: ClubCardProps) {
  return (
    <Link to={`/club/${club.id}`} className="block">
      <Card className="transition hover:border-[var(--arena-accent)]/40 hover:shadow-md">
        <CardContent className="space-y-3 pt-4 sm:pt-5">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--arena-text)]">{club.name}</h3>
            <p className="line-clamp-2 text-sm leading-6 text-[var(--arena-text-muted)]">{club.description}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-[var(--arena-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <MapPin size={15} aria-hidden="true" />
              {club.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users size={15} aria-hidden="true" />
              {club.membersCount} members
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {club.sport_focus?.map((sport: string) => (
            <Badge key={sport}>
              {sport}
            </Badge>
          ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

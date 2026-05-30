export type UserRole = 'superadmin' | 'owner' | 'admin' | 'member'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export type SportType =
  | 'badminton'
  | 'tennis'
  | 'squash'
  | 'pickleball'
  | 'table tennis'
  | 'racquetball'

export interface Club {
  id: string
  name: string
  description: string
  location: string
  city: string
  sportFocus: SportType[]
  openJoin: boolean
  approvalRequired: boolean
  membersCount: number
}

export interface Member {
  id: string
  name: string
  role: UserRole
  joinedAt: string
}

export interface ClubEvent {
  id: string
  clubId: string
  title: string
  date: string
  location: string
  signupOpen: boolean
}

export interface MatchSummary {
  id: string
  clubId: string
  title: string
  sport: SportType
  result: string
  recordedBy: string
  date: string
  participants: string[]
}

export interface AnalyticsCard {
  title: string
  value: string
  description: string
}

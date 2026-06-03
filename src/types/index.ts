export type UserRole = 'superadmin' | 'owner' | 'admin' | 'member'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  display_name?: string | null
  phone?: string | null
  city?: string | null
  bio?: string | null
  preferred_sport?: string | null
  avatar_url?: string | null
  is_private?: boolean | null
}

// Extended User with metadata
export interface UserProfile extends User {
  createdAt?: string
  avatarUrl?: string
}

export type SportType =
  | 'badminton'
  | 'tennis'
  | 'squash'
  | 'pickleball'
  | 'table tennis'
  | 'racquetball'

// Database Club type (snake_case from Supabase)
export interface Club {
  id: string
  name: string
  description: string | null
  location: string | null
  city: string | null
  sport_focus: string[]
  open_join: boolean
  approval_required: boolean
  invite_code: string | null
  owner_id: string
  created_at: string
  updated_at: string
  // Computed/joined fields
  membersCount?: number
  role?: string
}

// Database Membership type
export interface Membership {
  id: string
  club_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'inactive' | 'banned'
  joined_at: string
  approved_by: string | null
  // Joined fields
  name?: string
  email?: string
  avatar_url?: string | null
}

// Database ClubEvent type
export interface ClubEvent {
  id: string
  club_id: string
  title: string
  event_date: string
  location: string | null
  cost_amount?: number | null
  cost_note?: string | null
  max_participants: number | null
  signup_open: boolean
  created_by: string
  created_at: string
  updated_at: string
  // Joined fields
  clubName?: string
}

// Database Match type
export interface Match {
  id: string
  club_id: string
  title: string | null
  sport: string
  match_type: 'singles' | 'doubles'
  recorded_by: string
  match_date: string
  event_id?: string | null
  created_at: string
}

export interface MatchParticipant {
  id: string
  match_id: string
  user_id: string | null
  team: 1 | 2
  is_guest: boolean
  guest_name: string | null
  // Joined fields
  name?: string
}

export interface ScoreSet {
  id: string
  match_id: string
  set_number: number
  team1_score: number
  team2_score: number
}

export interface MatchWithDetails extends Match {
  participants: MatchParticipant[]
  score_sets: ScoreSet[]
  // Joined fields
  clubName?: string
}

export interface AnalyticsCard {
  title: string
  value: string
  description: string
}

// Additional types for Supabase integration
export interface JoinRequest {
  id: string
  club_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  // Joined fields
  name?: string
  email?: string
}

export interface EventRsvp {
  id: string
  event_id: string
  user_id: string
  status: 'going' | 'maybe' | 'not_going'
  created_at: string
  updated_at: string
  // Joined fields
  name?: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'join_request' | 'join_approved' | 'event_reminder' | 'event_created' | 'rsvp_update' | 'score_recorded' | 'announcement'
  title: string
  message: string
  data?: Record<string, unknown>
  read: boolean
  created_at: string
}

export interface ClubActivity {
  id: string
  club_id: string
  type: 'match_recorded' | 'member_joined' | 'event_created' | 'rsvp_update' | 'announcement'
  title: string
  description: string
  actor_name: string
  created_at: string
}

export interface ClubMessage {
  id: string
  club_id: string
  title: string
  message: string
  created_by: string
  created_at: string
  updated_at: string
  // Joined fields
  authorName?: string
}

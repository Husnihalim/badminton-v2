// Types for Cross-Club Friendly feature

export type FriendlyStatus = 'pending' | 'accepted' | 'matchmaking' | 'live' | 'completed' | 'declined' | 'cancelled'
export type MatchupStatus = 'pending' | 'live' | 'completed'
export type InviteMethod = 'whatsapp' | 'link' | 'platform'
export type InviteStatus = 'sent' | 'clicked' | 'converted'

export interface Friendly {
  id: string
  inviting_club_id: string
  invited_club_id: string | null
  invited_club_name: string
  invited_contact: string | null
  status: FriendlyStatus
  pair_count: number
  winning_club_id: string | null
  created_by: string
  created_at: string
  accepted_at: string | null
  matchmaking_locked_at: string | null
  completed_at: string | null
  invite_code: string
  // Joined fields
  inviting_club?: {
    id: string
    name: string
    city: string
    logo_url?: string | null
  }
  invited_club?: {
    id: string
    name: string
    city: string
    logo_url?: string | null
  } | null
}

export interface FriendlyPair {
  id: string
  friendly_id: string
  club_id: string
  pair_name: string
  player_1_id: string
  player_2_id: string | null
  order_index: number
  created_at: string
  // Joined fields
  player_1?: {
    id: string
    name: string
    display_name: string | null
    avatar_url: string | null
  }
  player_2?: {
    id: string
    name: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

export interface FriendlyMatchup {
  id: string
  friendly_id: string
  pair_a_id: string
  pair_b_id: string
  match_id: string | null
  order_index: number
  status: MatchupStatus
  winner_club_id: string | null
  created_at: string
  // Joined fields
  pair_a?: FriendlyPair
  pair_b?: FriendlyPair
  match?: {
    id: string
    score_sets: {
      team1_score: number
      team2_score: number
    }[]
  }
}

export interface FriendlyInvite {
  id: string
  friendly_id: string
  invite_method: InviteMethod
  invited_contact: string | null
  status: InviteStatus
  sent_at: string
  clicked_at: string | null
  converted_at: string | null
}

export interface FriendlyWithDetails extends Friendly {
  pairs?: FriendlyPair[]
  matchups?: FriendlyMatchup[]
  inviting_club_pairs?: FriendlyPair[]
  invited_club_pairs?: FriendlyPair[]
}

export interface ClubFriendlyStats {
  total: number
  wins: number
  losses: number
  winRate: number
}

export interface CreateFriendlyInput {
  invitingClubId: string
  invitedClubName: string
  pairCount: number
  invitedContact?: string
  invitedClubId?: string
}

export interface RegisterPairsInput {
  pair_name: string
  player_1_id: string
  player_2_id?: string
}

export interface LockMatchmakingInput {
  pair_a_id: string
  pair_b_id: string
}

export interface RecordMatchInput {
  club_id: string
  sport: string
  match_type: 'doubles'
  participants: {
    user_id: string
    team: number
  }[]
  score_sets: {
    set_number: number
    team1_score: number
    team2_score: number
  }[]
}

// Story types for friendly
export type FriendlyStoryType =
  | 'friendly_invited'
  | 'friendly_accepted'
  | 'matchmaking_complete'
  | 'upset_alert'
  | 'clutch_moment'
  | 'comeback_in_progress'
  | 'friendly_completed'
  | 'sweep_victory'
  | 'narrow_escape'

export interface FriendlyStory {
  id: string
  type: FriendlyStoryType
  friendly_id: string
  title: string
  body: string
  proof?: string
  created_at: string
}

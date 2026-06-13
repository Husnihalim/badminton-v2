// Types for Unified Competitions Engine (Friendlies & Tournaments)

export type CompetitionStatus =
  | 'draft'
  | 'registration'
  | 'pending'
  | 'accepted'
  | 'matchmaking'
  | 'live'
  | 'completed'
  | 'declined'
  | 'cancelled'

export type CompetitionFormat =
  | 'team_friendly'
  | 'round_robin'
  | 'single_elimination'
  | 'pool_playoffs'

export type CompetitionMatchupStatus = 'pending' | 'live' | 'completed'

export interface Competition {
  id: string
  club_id: string
  opponent_club_id: string | null
  opponent_club_name: string | null
  title: string
  sport: string
  format: CompetitionFormat
  status: CompetitionStatus
  rules: string | null
  start_date: string | null
  pair_count: number | null
  winning_club_id: string | null
  winner_participant_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  invite_code: string
  
  // Joined fields
  club?: {
    id: string
    name: string
    city: string
    logo_url?: string | null
  }
  opponent_club?: {
    id: string
    name: string
    city: string
    logo_url?: string | null
  } | null
}

export interface CompetitionPool {
  id: string
  competition_id: string
  name: string
  created_at: string
}

export interface CompetitionParticipant {
  id: string
  competition_id: string
  pool_id: string | null
  club_id: string | null
  name: string
  user_1_id: string | null
  user_2_id: string | null
  seed: number | null
  created_at: string
  
  // Joined fields
  player_1?: {
    id: string
    name: string
    display_name: string | null
    avatar_url: string | null
  } | null
  player_2?: {
    id: string
    name: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

export interface CompetitionMatchup {
  id: string
  competition_id: string
  pool_id: string | null
  participant_a_id: string
  participant_b_id: string
  match_id: string | null
  order_index: number
  status: CompetitionMatchupStatus
  winner_participant_id: string | null
  bracket_round: number | null
  bracket_position: number | null
  created_at: string
  
  // Joined fields
  participant_a?: CompetitionParticipant
  participant_b?: CompetitionParticipant
  match?: {
    id: string
    score_sets: {
      team1_score: number
      team2_score: number
    }[]
  } | null
}

export interface CompetitionWithDetails extends Competition {
  pools?: CompetitionPool[]
  participants?: CompetitionParticipant[]
  matchups?: CompetitionMatchup[]
}

export interface CreateCompetitionInput {
  clubId: string
  title: string
  sport: string
  format: CompetitionFormat
  opponentClubName?: string | null
  opponentClubId?: string | null
  pairCount?: number | null
  rules?: string | null
  startDate?: string | null
}

// ============================================
// BACKWARD COMPATIBILITY ALIASES FOR WEEK 1
// ============================================
export type FriendlyStatus = CompetitionStatus
export type MatchupStatus = CompetitionMatchupStatus

export interface Friendly extends Competition {
  inviting_club_id: string
  invited_club_id: string | null
  invited_club_name: string
  pair_count: number
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

export interface FriendlyPair extends CompetitionParticipant {
  friendly_id: string
  pair_name: string
  player_1_id: string
  player_2_id: string | null
  order_index: number
  player_1?: {
    id: string
    name: string
    display_name: string | null
    avatar_url: string | null
  } | null
  player_2?: {
    id: string
    name: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

export interface FriendlyMatchup extends CompetitionMatchup {
  friendly_id?: string
  pair_a_id?: string
  pair_b_id?: string
  winner_club_id?: string | null
  pair_a?: FriendlyPair
  pair_b?: FriendlyPair
}

export interface FriendlyWithDetails extends Friendly {
  pairs?: FriendlyPair[]
  matchups?: FriendlyMatchup[]
}

export type CreateFriendlyInput = CreateCompetitionInput

export interface RegisterPairsInput {
  pair_name: string;
  player_1_id: string;
  player_2_id?: string | null;
}

export interface LockMatchmakingInput {
  pair_a_id: string;
  pair_b_id: string;
}

export interface RecordMatchInput {
  club_id: string;
  sport: string;
  match_type: 'singles' | 'doubles';
  participants: { user_id: string; team: number }[];
  score_sets: { set_number: number; team1_score: number; team2_score: number }[];
}


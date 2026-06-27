// Competition Types

export type CompetitionStatus =
  | 'draft'
  | 'registration'
  | 'matchmaking'
  | 'live'
  | 'completed'
  | 'cancelled'

export type CompetitionFormat = 'friendly' | 'league'

export type CompetitionMatchupStatus = 'pending' | 'live' | 'completed'

export type RosterMode = 'admin' | 'open'

export interface Competition {
  id: string
  club_id: string
  title: string
  sport: string
  format: CompetitionFormat
  status: CompetitionStatus
  rules: string | null
  start_date: string | null
  pairs_count: number | null
  sets_count: number | null
  points_per_set: number | null
  location: string | null
  roster_mode: RosterMode
  winning_club_id: string | null
  winner_participant_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  invite_code: string
  invitationStatus?: string

  // Joined fields
  club?: {
    id: string
    name: string
    city: string
    logo_url?: string | null
  }
}

export interface CompetitionClub {
  id: string
  competition_id: string
  club_id: string
  status: 'invited' | 'confirmed' | 'declined'
  lineup_confirmed: boolean
  lineup_confirmed_at: string | null
  created_at: string

  // Joined fields
  club?: {
    id: string
    name: string
    city: string
    logo_url?: string | null
  }
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
  user_1_status?: 'pending' | 'accepted' | 'declined'
  user_2_status?: 'pending' | 'accepted' | 'declined'
  seed: number | null
  rank: number | null
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
  club_a_id: string | null
  club_b_id: string | null
  participant_a_id: string
  participant_b_id: string
  match_id: string | null
  order_index: number
  status: CompetitionMatchupStatus
  winner_participant_id: string | null
  winner_club_id: string | null
  bracket_round: number | null
  bracket_position: number | null
  round_index: number | null
  locked: boolean
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
  clubs?: CompetitionClub[]
  pools?: CompetitionPool[]
  participants?: CompetitionParticipant[]
  matchups?: CompetitionMatchup[]
}

export interface CreateCompetitionInput {
  clubId: string
  myClubName?: string
  title: string
  sport: string
  format: CompetitionFormat
  opponentClubIds?: string[]
  opponentClubNames?: string[]
  pairsCount?: number
  setsCount?: number
  pointsPerSet?: number
  location?: string
  rosterMode?: RosterMode
  rules?: string
  startDate?: string
}

export interface RecordMatchInput {
  club_id: string
  sport: string
  match_type: 'singles' | 'doubles'
  participants: { user_id: string; team: number }[]
  score_sets: { set_number: number; team1_score: number; team2_score: number }[]
}

export interface RosterInvite {
  id: string
  competition_id: string
  club_id: string | null
  name: string
  user_1_id: string | null
  user_2_id: string | null
  user_1_status?: 'pending' | 'accepted' | 'declined'
  user_2_status?: 'pending' | 'accepted' | 'declined'
  competition: {
    title: string
    start_date: string
    club: {
      name: string
    } | null
  } | null
}

// ============================================
// BACKWARD COMPATIBILITY ALIASES (deprecated)
// ============================================
/** @deprecated Use CompetitionStatus instead */
export type FriendlyStatus = CompetitionStatus
/** @deprecated Use CompetitionMatchupStatus instead */
export type MatchupStatus = CompetitionMatchupStatus
/** @deprecated Use CompetitionWithDetails instead */
export interface Friendly extends Competition {
  inviting_club_id: string
  invited_club_id: string | null
  invited_club_name: string
  pair_count: number
  inviting_club?: Competition['club']
  invited_club?: Competition['club'] | null
}
/** @deprecated Use CompetitionParticipant instead */
export interface FriendlyPair extends CompetitionParticipant {
  friendly_id: string
  pair_name: string
  player_1_id: string
  player_2_id: string | null
  user_1_status?: 'pending' | 'accepted' | 'declined'
  user_2_status?: 'pending' | 'accepted' | 'declined'
  order_index: number
}
/** @deprecated Use CompetitionMatchup instead */
export interface FriendlyMatchup extends Omit<CompetitionMatchup, 'winner_club_id'> {
  friendly_id?: string
  pair_a_id?: string
  pair_b_id?: string
  winner_club_id?: string | null
  pair_a?: FriendlyPair
  pair_b?: FriendlyPair
}
/** @deprecated */
export interface FriendlyWithDetails extends Friendly {
  pairs?: FriendlyPair[]
  matchups?: FriendlyMatchup[]
}
/** @deprecated */
export type CreateFriendlyInput = CreateCompetitionInput
/** @deprecated */
export interface RegisterPairsInput {
  pair_name: string;
  player_1_id: string;
  player_2_id?: string | null;
}
/** @deprecated */
export interface LockMatchmakingInput {
  pair_a_id: string;
  pair_b_id: string;
}

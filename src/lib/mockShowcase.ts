/* eslint-disable @typescript-eslint/no-explicit-any */
import type { 
  Club, 
  User
} from '../types'
import type { StoryMoment } from './storyMoments'

type Membership = any
type ClubEvent = any
type EventRsvp = any
type EloHistory = any
type ClubActivity = any
type ClubLeaderboardRow = any

// ============================================
// MOCK USERS (SOCIAL ATHLETES)
// ============================================
export const mockUsers: Record<string, User> = {
  'mock-husni': {
    id: 'mock-husni',
    name: 'Husni Halim',
    display_name: 'Husni Halim',
    email: 'husni@kelabsukan.com',
    role: 'owner',
    city: 'Puchong, Selangor',
    bio: 'Founder of LEP BC. High energy, smash-happy, but knees complain after three sets. Always down for post-match teh tarik.',
    preferred_sport: 'badminton',
    avatar_url: null,
    singles_elo: 1200,
    doubles_elo: 1540,
    singles_games: 0,
    doubles_games: 24,
    gear: {
      racket: 'Yonex Astrox 88D Pro',
      racket_weight: '4U',
      racket_balance: 'head_heavy',
      racket_stiffness: 'stiff',
      strings: 'Yonex BG66 Ultimax',
      tension: '27 lbs',
      grip: 'Yonex Overgrip (Yellow)',
      grip_type: 'overgrip',
      shoes: 'Yonex Power Cushion 65Z3',
      play_style: 'baseline_smasher',
      dominant_hand: 'right',
      player_type: 'doubles'
    }
  },
  'mock-troma': {
    id: 'mock-troma',
    name: 'Troma',
    display_name: 'Troma',
    email: 'troma@kelabsukan.com',
    role: 'member',
    city: 'Puchong, Selangor',
    bio: 'The defense specialist. Can retrieve almost anything. Will run all night. Enjoys net control and tactical doubles.',
    preferred_sport: 'badminton',
    avatar_url: null,
    singles_elo: 1200,
    doubles_elo: 1490,
    singles_games: 0,
    doubles_games: 24,
    gear: {
      racket: 'Victor Thruster Ryuga',
      racket_weight: '3U',
      racket_balance: 'head_heavy',
      racket_stiffness: 'stiff',
      strings: 'Kizuna D61',
      tension: '28 lbs',
      grip: 'Towel Grip (Black)',
      grip_type: 'towel_grip',
      shoes: 'Victor P9200TY',
      play_style: 'defensive_wall',
      dominant_hand: 'right',
      player_type: 'doubles'
    }
  },
  'mock-amir': {
    id: 'mock-amir',
    name: 'Amir',
    display_name: 'Amir',
    email: 'amir@kelabsukan.com',
    role: 'member',
    city: 'Puchong, Selangor',
    bio: 'Aggressive net player. Prefers fast-paced flat drives. Still searching for the ultimate doubles partnership.',
    preferred_sport: 'badminton',
    avatar_url: null,
    singles_elo: 1200,
    doubles_elo: 1610,
    singles_games: 0,
    doubles_games: 24,
    gear: {
      racket: 'Li-Ning Aeronaut 9000',
      racket_weight: '4U',
      racket_balance: 'even_balance',
      racket_stiffness: 'medium',
      strings: 'Yonex Nanogy 98',
      tension: '26 lbs',
      grip: 'Li-Ning Overgrip',
      grip_type: 'overgrip',
      shoes: 'Mizuno Wave Claw 2',
      play_style: 'net_interceptor',
      dominant_hand: 'right',
      player_type: 'doubles'
    }
  },
  'mock-ziyad': {
    id: 'mock-ziyad',
    name: 'Ziyad',
    display_name: 'Ziyad',
    email: 'ziyad@kelabsukan.com',
    role: 'member',
    city: 'Puchong, Selangor',
    bio: 'Social badminton enthusiast. Loves a good drop shot and casual banter. Never takes losses too seriously.',
    preferred_sport: 'badminton',
    avatar_url: null,
    singles_elo: 1200,
    doubles_elo: 1380,
    singles_games: 0,
    doubles_games: 24,
    gear: {
      racket: 'Yonex Nanoflare 800',
      racket_weight: '4U',
      racket_balance: 'head_light',
      racket_stiffness: 'stiff',
      strings: 'Yonex BG66 Ultimax',
      tension: '25 lbs',
      grip: 'Yonex Super Grap',
      grip_type: 'overgrip',
      shoes: 'Yonex Aerus Z2',
      play_style: 'all_rounder',
      dominant_hand: 'right',
      player_type: 'doubles'
    }
  },
  'mock-jin': {
    id: 'mock-jin',
    name: 'Jin',
    display_name: 'Jin',
    email: 'jin@kelabsukan.com',
    role: 'owner',
    city: 'Petaling Jaya, Selangor',
    bio: 'Strategic singles player and founder of Smashers PJ. Focuses on deep rallies, court coverage, and out-positioning opponents.',
    preferred_sport: 'badminton',
    avatar_url: null,
    singles_elo: 1580,
    doubles_elo: 1200,
    singles_games: 20,
    doubles_games: 0,
    gear: {
      racket: 'Yonex Astrox 99 Pro',
      racket_weight: '3U',
      racket_balance: 'head_heavy',
      racket_stiffness: 'stiff',
      strings: 'Yonex BG80',
      tension: '29 lbs',
      grip: 'Replacement Grip',
      grip_type: 'replacement_grip',
      shoes: 'Yonex Eclipsion Z3',
      play_style: 'tactical_singles',
      dominant_hand: 'left',
      player_type: 'singles_and_doubles'
    }
  },
  'mock-ken': {
    id: 'mock-ken',
    name: 'Ken',
    display_name: 'Ken',
    email: 'ken@kelabsukan.com',
    role: 'member',
    city: 'Petaling Jaya, Selangor',
    bio: 'Double specialist who values safety and placement over pure smash speed. A reliable partner who covers the gaps.',
    preferred_sport: 'badminton',
    avatar_url: null,
    singles_elo: 1200,
    doubles_elo: 1420,
    singles_games: 0,
    doubles_games: 20,
    gear: {
      racket: 'Victor Jetspeed 12 II',
      racket_weight: '4U',
      racket_balance: 'even_balance',
      racket_stiffness: 'stiff',
      strings: 'Victor VBS-66N',
      tension: '26 lbs',
      grip: 'Overgrip',
      grip_type: 'overgrip',
      shoes: 'Victor A970TD',
      play_style: 'defensive_cover',
      dominant_hand: 'right',
      player_type: 'doubles'
    }
  },
  'mock-sarah': {
    id: 'mock-sarah',
    name: 'Sarah',
    display_name: 'Sarah',
    email: 'sarah@kelabsukan.com',
    role: 'member',
    city: 'Petaling Jaya, Selangor',
    bio: 'Fierce mixed-doubles net controller. Quick reflexes, intercept-heavy style, and a deadly backhand drive.',
    preferred_sport: 'badminton',
    avatar_url: null,
    singles_elo: 1200,
    doubles_elo: 1460,
    singles_games: 0,
    doubles_games: 20,
    gear: {
      racket: 'Li-Ning Windstorm 72',
      racket_weight: '5U',
      racket_balance: 'head_heavy',
      racket_stiffness: 'flexible',
      strings: 'Yonex BG66 Ultimax',
      tension: '26 lbs',
      grip: 'Super Grap',
      grip_type: 'overgrip',
      shoes: 'Yonex Aerus Z2 Ladies',
      play_style: 'net_interceptor',
      dominant_hand: 'right',
      player_type: 'doubles'
    }
  },
  'mock-dave': {
    id: 'mock-dave',
    name: 'Dave',
    display_name: 'Dave',
    email: 'dave@kelabsukan.com',
    role: 'member',
    city: 'Petaling Jaya, Selangor',
    bio: 'Heavy smasher who lives for backcourt kills. High power, but prone to service errors when under pressure.',
    preferred_sport: 'badminton',
    avatar_url: null,
    singles_elo: 1200,
    doubles_elo: 1350,
    singles_games: 0,
    doubles_games: 20,
    gear: {
      racket: 'Yonex Duora 10',
      racket_weight: '3U',
      racket_balance: 'even_balance',
      racket_stiffness: 'stiff',
      strings: 'Yonex BG80 Power',
      tension: '28 lbs',
      grip: 'Replacement Grip',
      grip_type: 'replacement_grip',
      shoes: 'Asics Gel-Blade 8',
      play_style: 'baseline_smasher',
      dominant_hand: 'right',
      player_type: 'doubles'
    }
  }
}

// ============================================
// MOCK CLUBS
// ============================================
export const mockClubs: Record<string, Club> = {
  'mock-lep-bc': {
    id: 'mock-lep-bc',
    name: 'LEP BC',
    description: 'Lestari Puchong Badminton Club (LEP BC) is Puchong\'s premier social racket community. We meet weekly for game days, friendly team challenges, and deep rivalry tracking.',
    location: 'Puchong Sports Arena',
    city: 'Puchong, Selangor',
    sport_focus: ['badminton'],
    open_join: true,
    approval_required: true,
    invite_code: 'lep-join',
    owner_id: 'mock-husni',
    created_at: '2025-01-15T20:00:00Z',
    updated_at: '2026-06-14T20:00:00Z',
    logo_url: null,
    banner_url: null,
    banner_preset: 'preset_badminton_blue',
    accent_color: '#ccff00',
    announcement: '📢 Next session scheduled for Thursday! Make sure to RSVP early. We have two guest pairs joining from Kepong.',
    announcement_updated_at: '2026-06-14T10:00:00Z',
    membersCount: 4
  },
  'mock-smashers-pj': {
    id: 'mock-smashers-pj',
    name: 'Smashers PJ',
    description: 'Petaling Jaya Smashers is a vibrant community of social badminton and tennis athletes. We gather weekly for high-energy sessions, friendly league banter, and post-match F&B.',
    location: 'PJ Star Arena',
    city: 'Petaling Jaya, Selangor',
    sport_focus: ['badminton', 'tennis', 'pickleball'],
    open_join: true,
    approval_required: false,
    invite_code: 'smash-pj',
    owner_id: 'mock-jin',
    created_at: '2025-03-10T19:00:00Z',
    updated_at: '2026-06-14T19:00:00Z',
    logo_url: null,
    banner_url: null,
    banner_preset: 'preset_badminton_lime',
    accent_color: '#38bdf8',
    announcement: '🏸 Friendly league matches kickoff next Wednesday against LEP BC! Player rosters are being finalized. Check details in the events tab.',
    announcement_updated_at: '2026-06-13T12:00:00Z',
    membersCount: 4
  }
}

// ============================================
// MOCK MEMBERSHIPS
// ============================================
export const mockMemberships: Record<string, Membership[]> = {
  'mock-lep-bc': [
    { id: 'mem-h1', club_id: 'mock-lep-bc', user_id: 'mock-husni', role: 'owner', created_at: '2025-01-15T20:00:00Z', updated_at: '2025-01-15T20:00:00Z', name: 'Husni Halim', profile: mockUsers['mock-husni'] },
    { id: 'mem-t1', club_id: 'mock-lep-bc', user_id: 'mock-troma', role: 'member', created_at: '2025-01-17T18:00:00Z', updated_at: '2025-01-17T18:00:00Z', name: 'Troma', profile: mockUsers['mock-troma'] },
    { id: 'mem-a1', club_id: 'mock-lep-bc', user_id: 'mock-amir', role: 'member', created_at: '2025-01-20T10:00:00Z', updated_at: '2025-01-20T10:00:00Z', name: 'Amir', profile: mockUsers['mock-amir'] },
    { id: 'mem-z1', club_id: 'mock-lep-bc', user_id: 'mock-ziyad', role: 'member', created_at: '2025-02-01T14:00:00Z', updated_at: '2025-02-01T14:00:00Z', name: 'Ziyad', profile: mockUsers['mock-ziyad'] }
  ],
  'mock-smashers-pj': [
    { id: 'mem-j2', club_id: 'mock-smashers-pj', user_id: 'mock-jin', role: 'owner', created_at: '2025-03-10T19:00:00Z', updated_at: '2025-03-10T19:00:00Z', name: 'Jin', profile: mockUsers['mock-jin'] },
    { id: 'mem-k2', club_id: 'mock-smashers-pj', user_id: 'mock-ken', role: 'member', created_at: '2025-03-12T15:00:00Z', updated_at: '2025-03-12T15:00:00Z', name: 'Ken', profile: mockUsers['mock-ken'] },
    { id: 'mem-s2', club_id: 'mock-smashers-pj', user_id: 'mock-sarah', role: 'member', created_at: '2025-03-15T09:00:00Z', updated_at: '2025-03-15T09:00:00Z', name: 'Sarah', profile: mockUsers['mock-sarah'] },
    { id: 'mem-d2', club_id: 'mock-smashers-pj', user_id: 'mock-dave', role: 'member', created_at: '2025-03-20T11:00:00Z', updated_at: '2025-03-20T11:00:00Z', name: 'Dave', profile: mockUsers['mock-dave'] }
  ]
}

// ============================================
// MOCK LEADERBOARD
// ============================================
export const mockLeaderboards: Record<string, ClubLeaderboardRow[]> = {
  'mock-lep-bc': [
    { name: 'Amir', games: 24, wins: 18, losses: 6, winPercentage: 75.0, pointsFor: 492, pointsAgainst: 382, points: 18, elo: 1610 },
    { name: 'Husni Halim', games: 24, wins: 16, losses: 8, winPercentage: 66.7, pointsFor: 478, pointsAgainst: 410, points: 16, elo: 1540 },
    { name: 'Troma', games: 24, wins: 13, losses: 11, winPercentage: 54.2, pointsFor: 440, pointsAgainst: 422, points: 13, elo: 1490 },
    { name: 'Ziyad', games: 24, wins: 9, losses: 15, winPercentage: 37.5, pointsFor: 388, pointsAgainst: 462, points: 9, elo: 1380 }
  ],
  'mock-smashers-pj': [
    { name: 'Jin', games: 20, wins: 14, losses: 6, winPercentage: 70.0, pointsFor: 412, pointsAgainst: 345, points: 14, elo: 1580 },
    { name: 'Sarah', games: 20, wins: 11, losses: 9, winPercentage: 55.0, pointsFor: 390, pointsAgainst: 375, points: 11, elo: 1460 },
    { name: 'Ken', games: 20, wins: 10, losses: 10, winPercentage: 50.0, pointsFor: 368, pointsAgainst: 366, points: 10, elo: 1420 },
    { name: 'Dave', games: 20, wins: 8, losses: 12, winPercentage: 40.0, pointsFor: 340, pointsAgainst: 390, points: 8, elo: 1350 }
  ]
}

// ============================================
// MOCK MATCHES
// ============================================
export const mockMatches: Record<string, any[]> = {
  'mock-lep-bc': [
    {
      id: 'match-lep-1',
      club_id: 'mock-lep-bc',
      event_id: 'event-lep-1',
      match_type: 'doubles',
      title: 'Game Day Doubles Decider',
      status: 'completed',
      recorded_by: 'mock-husni',
      created_at: '2026-06-11T21:30:00Z',
      updated_at: '2026-06-11T21:30:00Z',
      match_date: '2026-06-11T20:00:00Z',
      game_mode: 'best_of_three',
      clubName: 'LEP BC',
      participants: [
        { id: 'part-lep-1-1', match_id: 'match-lep-1', user_id: 'mock-husni', team: 1, is_guest: false, guest_name: null, name: 'Husni Halim', profile: mockUsers['mock-husni'] },
        { id: 'part-lep-1-2', match_id: 'match-lep-1', user_id: 'mock-amir', team: 1, is_guest: false, guest_name: null, name: 'Amir', profile: mockUsers['mock-amir'] },
        { id: 'part-lep-1-3', match_id: 'match-lep-1', user_id: 'mock-troma', team: 2, is_guest: false, guest_name: null, name: 'Troma', profile: mockUsers['mock-troma'] },
        { id: 'part-lep-1-4', match_id: 'match-lep-1', user_id: 'mock-ziyad', team: 2, is_guest: false, guest_name: null, name: 'Ziyad', profile: mockUsers['mock-ziyad'] }
      ],
      score_sets: [
        { id: 'set-lep-1-1', match_id: 'match-lep-1', set_number: 1, team1_score: 18, team2_score: 21 },
        { id: 'set-lep-1-2', match_id: 'match-lep-1', set_number: 2, team1_score: 21, team2_score: 15 },
        { id: 'set-lep-1-3', match_id: 'match-lep-1', set_number: 3, team1_score: 22, team2_score: 20 }
      ],
      recorded_by_profile: { name: 'Husni Halim', display_name: 'Husni Halim' }
    },
    {
      id: 'match-lep-2',
      club_id: 'mock-lep-bc',
      event_id: 'event-lep-1',
      match_type: 'doubles',
      title: 'Power Drive Clash',
      status: 'completed',
      recorded_by: 'mock-husni',
      created_at: '2026-06-11T20:45:00Z',
      updated_at: '2026-06-11T20:45:00Z',
      match_date: '2026-06-11T20:00:00Z',
      game_mode: 'best_of_three',
      clubName: 'LEP BC',
      participants: [
        { id: 'part-lep-2-1', match_id: 'match-lep-2', user_id: 'mock-amir', team: 1, is_guest: false, guest_name: null, name: 'Amir', profile: mockUsers['mock-amir'] },
        { id: 'part-lep-2-2', match_id: 'match-lep-2', user_id: 'mock-ziyad', team: 1, is_guest: false, guest_name: null, name: 'Ziyad', profile: mockUsers['mock-ziyad'] },
        { id: 'part-lep-2-3', match_id: 'match-lep-2', user_id: 'mock-husni', team: 2, is_guest: false, guest_name: null, name: 'Husni Halim', profile: mockUsers['mock-husni'] },
        { id: 'part-lep-2-4', match_id: 'match-lep-2', user_id: 'mock-troma', team: 2, is_guest: false, guest_name: null, name: 'Troma', profile: mockUsers['mock-troma'] }
      ],
      score_sets: [
        { id: 'set-lep-2-1', match_id: 'match-lep-2', set_number: 1, team1_score: 21, team2_score: 19 },
        { id: 'set-lep-2-2', match_id: 'match-lep-2', set_number: 2, team1_score: 21, team2_score: 14 }
      ],
      recorded_by_profile: { name: 'Husni Halim', display_name: 'Husni Halim' }
    }
  ],
  'mock-smashers-pj': [
    {
      id: 'match-smash-1',
      club_id: 'mock-smashers-pj',
      event_id: 'event-smash-1',
      match_type: 'doubles',
      title: 'Midweek Showdown',
      status: 'completed',
      recorded_by: 'mock-jin',
      created_at: '2026-06-10T21:40:00Z',
      updated_at: '2026-06-10T21:40:00Z',
      match_date: '2026-06-10T19:30:00Z',
      game_mode: 'best_of_three',
      clubName: 'Smashers PJ',
      participants: [
        { id: 'part-smash-1-1', match_id: 'match-smash-1', user_id: 'mock-jin', team: 1, is_guest: false, guest_name: null, name: 'Jin', profile: mockUsers['mock-jin'] },
        { id: 'part-smash-1-2', match_id: 'match-smash-1', user_id: 'mock-sarah', team: 1, is_guest: false, guest_name: null, name: 'Sarah', profile: mockUsers['mock-sarah'] },
        { id: 'part-smash-1-3', match_id: 'match-smash-1', user_id: 'mock-ken', team: 2, is_guest: false, guest_name: null, name: 'Ken', profile: mockUsers['mock-ken'] },
        { id: 'part-smash-1-4', match_id: 'match-smash-1', user_id: 'mock-dave', team: 2, is_guest: false, guest_name: null, name: 'Dave', profile: mockUsers['mock-dave'] }
      ],
      score_sets: [
        { id: 'set-smash-1-1', match_id: 'match-smash-1', set_number: 1, team1_score: 21, team2_score: 17 },
        { id: 'set-smash-1-2', match_id: 'match-smash-1', set_number: 2, team1_score: 18, team2_score: 21 },
        { id: 'set-smash-1-3', match_id: 'match-smash-1', set_number: 3, team1_score: 21, team2_score: 19 }
      ],
      recorded_by_profile: { name: 'Jin', display_name: 'Jin' }
    }
  ]
}

// ============================================
// MOCK STORIES
// ============================================
export const mockStories: Record<string, StoryMoment[]> = {
  'mock-lep-bc': [
    {
      id: 'story-lep-1',
      type: 'comeback_win',
      title: 'The Great Escape',
      body: 'Husni Halim & Amir looked down and out after losing Game 1 to Troma & Ziyad. However, they mounted an incredible comeback, surviving a grueling third-set decider to win 22-20.',
      proofLabel: 'Won 18-21, 21-15, 22-20',
      matchId: 'match-lep-1',
      clubId: 'mock-lep-bc',
      clubName: 'LEP BC',
      matchDate: '2026-06-11T20:00:00Z',
      priority: 95
    },
    {
      id: 'story-lep-2',
      type: 'clean_sweep',
      title: 'Statement Night for Amir',
      body: 'Amir put on a masterclass at Puchong Sports Arena, powering through his doubles matchup alongside Ziyad to secure a flawless straight-sets win over Husni & Troma.',
      proofLabel: 'Won 21-19, 21-14',
      matchId: 'match-lep-2',
      clubId: 'mock-lep-bc',
      clubName: 'LEP BC',
      matchDate: '2026-06-11T20:00:00Z',
      priority: 85
    },
    {
      id: 'story-lep-3',
      type: 'win_streak',
      title: 'Amir is On Fire!',
      body: 'Amir continues his reign of dominance, racking up a 4-match winning streak across the last two sessions. The club is scrambling to find a pair that can halt his rise.',
      proofLabel: '4 Match win streak',
      clubId: 'mock-lep-bc',
      clubName: 'LEP BC',
      priority: 80
    }
  ],
  'mock-smashers-pj': [
    {
      id: 'story-smash-1',
      type: 'close_match',
      title: 'Edge of the Seat Finish',
      body: 'Jin & Sarah held their nerve in a classic doubles thriller at PJ Star Arena. Ken & Dave pushed them to the absolute limit, but Jin\'s drop shots sealed the final points.',
      proofLabel: 'Won 21-17, 18-21, 21-19',
      matchId: 'match-smash-1',
      clubId: 'mock-smashers-pj',
      clubName: 'Smashers PJ',
      matchDate: '2026-06-10T19:30:00Z',
      priority: 90
    }
  ]
}

// ============================================
// MOCK EVENTS
// ============================================
export const mockEvents: Record<string, ClubEvent[]> = {
  'mock-lep-bc': [
    {
      id: 'event-lep-1',
      club_id: 'mock-lep-bc',
      title: 'Weekly Session: Court 3 & 4',
      description: 'Regular Thursday social matches. Shuttlecocks provided. Session fees will be split equally among attendees.',
      event_date: '2026-06-18',
      start_time: '20:00',
      end_time: '22:00',
      location: 'Puchong Sports Arena',
      max_slots: 16,
      created_at: '2026-06-12T00:00:00Z',
      updated_at: '2026-06-12T00:00:00Z',
      status: 'scheduled',
      payment_required: true,
      price_amount: 15.00
    }
  ],
  'mock-smashers-pj': [
    {
      id: 'event-smash-1',
      club_id: 'mock-smashers-pj',
      title: 'Friendly Warmups & Social Play',
      description: 'Prepare for our upcoming friendly challenge matches. Bring your best form!',
      event_date: '2026-06-17',
      start_time: '19:30',
      end_time: '21:30',
      location: 'PJ Star Arena',
      max_slots: 12,
      created_at: '2026-06-11T00:00:00Z',
      updated_at: '2026-06-11T00:00:00Z',
      status: 'scheduled',
      payment_required: false
    }
  ]
}

// ============================================
// MOCK RSVPS
// ============================================
export const mockRsvps: Record<string, EventRsvp[]> = {
  'event-lep-1': [
    { id: 'rsvp-l1', event_id: 'event-lep-1', user_id: 'mock-husni', status: 'going', created_at: '2026-06-12T08:00:00Z', updated_at: '2026-06-12T08:00:00Z', attended: true, paid: true, profiles: { name: 'Husni Halim', email: 'husni@kelabsukan.com', display_name: 'Husni Halim', avatar_url: null } },
    { id: 'rsvp-l2', event_id: 'event-lep-1', user_id: 'mock-troma', status: 'going', created_at: '2026-06-12T09:00:00Z', updated_at: '2026-06-12T09:00:00Z', attended: true, paid: true, profiles: { name: 'Troma', email: 'troma@kelabsukan.com', display_name: 'Troma', avatar_url: null } },
    { id: 'rsvp-l3', event_id: 'event-lep-1', user_id: 'mock-amir', status: 'going', created_at: '2026-06-12T10:00:00Z', updated_at: '2026-06-12T10:00:00Z', attended: true, paid: true, profiles: { name: 'Amir', email: 'amir@kelabsukan.com', display_name: 'Amir', avatar_url: null } },
    { id: 'rsvp-l4', event_id: 'event-lep-1', user_id: 'mock-ziyad', status: 'maybe', created_at: '2026-06-12T11:00:00Z', updated_at: '2026-06-12T11:00:00Z', attended: false, paid: false, profiles: { name: 'Ziyad', email: 'ziyad@kelabsukan.com', display_name: 'Ziyad', avatar_url: null } }
  ],
  'event-smash-1': [
    { id: 'rsvp-s1', event_id: 'event-smash-1', user_id: 'mock-jin', status: 'going', created_at: '2026-06-12T08:00:00Z', updated_at: '2026-06-12T08:00:00Z', profiles: { name: 'Jin', email: 'jin@kelabsukan.com', display_name: 'Jin', avatar_url: null } },
    { id: 'rsvp-s2', event_id: 'event-smash-1', user_id: 'mock-ken', status: 'going', created_at: '2026-06-12T08:30:00Z', updated_at: '2026-06-12T08:30:00Z', profiles: { name: 'Ken', email: 'ken@kelabsukan.com', display_name: 'Ken', avatar_url: null } },
    { id: 'rsvp-s3', event_id: 'event-smash-1', user_id: 'mock-sarah', status: 'going', created_at: '2026-06-12T09:00:00Z', updated_at: '2026-06-12T09:00:00Z', profiles: { name: 'Sarah', email: 'sarah@kelabsukan.com', display_name: 'Sarah', avatar_url: null } },
    { id: 'rsvp-s4', event_id: 'event-smash-1', user_id: 'mock-dave', status: 'maybe', created_at: '2026-06-12T10:00:00Z', updated_at: '2026-06-12T10:00:00Z', profiles: { name: 'Dave', email: 'dave@kelabsukan.com', display_name: 'Dave', avatar_url: null } }
  ]
}

// ============================================
// MOCK ELO HISTORY (global format)
// ============================================
export const mockEloHistories: Record<string, EloHistory[]> = {
  'mock-husni': [
    { id: 'elo-h1', profile_id: 'mock-husni', match_id: 'match-lep-2', match_type: 'doubles', elo_before: 1200, elo_after: 1230, delta: 30, k_factor: 40, opponent_rating_avg: 1200, partner_rating: 1200, created_at: '2026-06-11T20:45:00Z', match_title: 'Power Drive Clash', match_date: '2026-06-11T20:00:00Z' },
    { id: 'elo-h2', profile_id: 'mock-husni', match_id: 'match-lep-1', match_type: 'doubles', elo_before: 1230, elo_after: 1260, delta: 30, k_factor: 40, opponent_rating_avg: 1180, partner_rating: 1200, created_at: '2026-06-11T21:30:00Z', match_title: 'Game Day Doubles Decider', match_date: '2026-06-11T20:00:00Z' },
  ],
  'mock-troma': [
    { id: 'elo-t1', profile_id: 'mock-troma', match_id: 'match-lep-2', match_type: 'doubles', elo_before: 1200, elo_after: 1180, delta: -20, k_factor: 40, opponent_rating_avg: 1200, partner_rating: 1200, created_at: '2026-06-11T20:45:00Z', match_title: 'Power Drive Clash', match_date: '2026-06-11T20:00:00Z' },
    { id: 'elo-t2', profile_id: 'mock-troma', match_id: 'match-lep-1', match_type: 'doubles', elo_before: 1180, elo_after: 1150, delta: -30, k_factor: 40, opponent_rating_avg: 1250, partner_rating: 1200, created_at: '2026-06-11T21:30:00Z', match_title: 'Game Day Doubles Decider', match_date: '2026-06-11T20:00:00Z' },
  ],
  'mock-amir': [
    { id: 'elo-a1', profile_id: 'mock-amir', match_id: 'match-lep-2', match_type: 'doubles', elo_before: 1200, elo_after: 1240, delta: 40, k_factor: 40, opponent_rating_avg: 1200, partner_rating: 1200, created_at: '2026-06-11T20:45:00Z', match_title: 'Power Drive Clash', match_date: '2026-06-11T20:00:00Z' },
    { id: 'elo-a2', profile_id: 'mock-amir', match_id: 'match-lep-1', match_type: 'doubles', elo_before: 1240, elo_after: 1280, delta: 40, k_factor: 40, opponent_rating_avg: 1180, partner_rating: 1200, created_at: '2026-06-11T21:30:00Z', match_title: 'Game Day Doubles Decider', match_date: '2026-06-11T20:00:00Z' },
  ]
}

// ============================================
// MOCK ACTIVITIES
// ============================================
export const mockActivities: Record<string, ClubActivity[]> = {
  'mock-lep-bc': [
    { id: 'act-lep-1', club_id: 'mock-lep-bc', user_id: 'mock-husni', activity_type: 'announcement', description: 'Husni Halim updated the club announcement.', created_at: '2026-06-14T10:00:00Z' },
    { id: 'act-lep-2', club_id: 'mock-lep-bc', user_id: 'mock-husni', activity_type: 'match', description: 'Husni Halim recorded a doubles match win (Husni & Amir vs Troma & Ziyad).', created_at: '2026-06-11T21:30:00Z' },
    { id: 'act-lep-3', club_id: 'mock-lep-bc', user_id: 'mock-husni', activity_type: 'match', description: 'Husni Halim recorded a doubles match win (Amir & Ziyad vs Husni & Troma).', created_at: '2026-06-11T20:45:00Z' }
  ],
  'mock-smashers-pj': [
    { id: 'act-smash-1', club_id: 'mock-smashers-pj', user_id: 'mock-jin', activity_type: 'match', description: 'Jin recorded a doubles match win (Jin & Sarah vs Ken & Dave).', created_at: '2026-06-10T21:40:00Z' }
  ]
}

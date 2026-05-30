import type { AnalyticsCard, Club, ClubEvent, MatchSummary, Member } from '../types'

export const sampleClubs: Club[] = [
  {
    id: 'club-1',
    name: 'Ace Smash Badminton Club',
    description: 'A local racket sport community focused on singles and doubles play.',
    location: 'Downtown Sports Center',
    city: 'Los Angeles',
    sportFocus: ['badminton', 'pickleball'],
    openJoin: true,
    approvalRequired: false,
    membersCount: 28,
  },
  {
    id: 'club-2',
    name: 'Baseline Racquet House',
    description: 'Club for tennis and squash players who love casual match days.',
    location: 'Maple Street Courts',
    city: 'Seattle',
    sportFocus: ['tennis', 'squash'],
    openJoin: false,
    approvalRequired: true,
    membersCount: 18,
  },
]

export const sampleMembers: Member[] = [
  { id: 'member-1', name: 'Aisha K.', role: 'owner', joinedAt: '2026-01-06' },
  { id: 'member-2', name: 'Leo T.', role: 'admin', joinedAt: '2026-02-11' },
  { id: 'member-3', name: 'Nina R.', role: 'member', joinedAt: '2026-03-22' },
]

export const sampleEvents: ClubEvent[] = [
  {
    id: 'event-1',
    clubId: 'club-1',
    title: 'Wednesday Singles Night',
    date: '2026-06-03 18:30',
    location: 'Court 2',
    signupOpen: true,
  },
  {
    id: 'event-2',
    clubId: 'club-1',
    title: 'Weekend Doubles Ladder',
    date: '2026-06-06 10:00',
    location: 'Court 1',
    signupOpen: false,
  },
]

export const sampleMatches: MatchSummary[] = [
  {
    id: 'match-1',
    clubId: 'club-1',
    title: 'Aisha vs Leo',
    sport: 'badminton',
    result: '21-17',
    recordedBy: 'Nina R.',
    date: '2026-05-29',
    participants: ['Aisha K.', 'Leo T.'],
  },
  {
    id: 'match-2',
    clubId: 'club-1',
    title: 'Team Smash vs Team Rally',
    sport: 'pickleball',
    result: '11-9, 11-7',
    recordedBy: 'Aisha K.',
    date: '2026-05-27',
    participants: ['Aisha K.', 'Leo T.', 'Nina R.', 'Guest'],
  },
]

export const sampleAnalytics: AnalyticsCard[] = [
  { title: 'Matches logged', value: '32', description: 'Played this month' },
  { title: 'Upcoming events', value: '4', description: 'Open for members' },
  { title: 'Club growth', value: '+12%', description: 'Members added in 30 days' },
]

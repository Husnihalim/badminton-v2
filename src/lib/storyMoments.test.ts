import { describe, expect, it } from 'vitest'
import {
  buildStoryMomentShareText,
  generateStoryMoments,
  winStreakTemplates,
  responseNeededTemplates,
  comebackWinTemplates,
  cleanSweepTemplates,
  closeMatchTemplates,
  rivalryWatchTemplates,
  bestPartnerTemplates,
  latestResultWinTemplates,
  latestResultLossTemplates,
} from './storyMoments'
import type { MatchWithDetails, User } from '../types'

const user: Pick<User, 'id' | 'name' | 'display_name'> = {
  id: 'user-1',
  name: 'Amir Rahman',
  display_name: 'Amir',
}

function match(overrides: Partial<MatchWithDetails>): MatchWithDetails {
  return {
    id: 'match-1',
    club_id: 'club-1',
    title: 'Friday Singles',
    sport: 'badminton',
    match_type: 'singles',
    recorded_by: 'recorder-1',
    match_date: '2026-06-05T12:00:00Z',
    created_at: '2026-06-05T12:00:00Z',
    participants: [
      { id: 'p1', match_id: 'match-1', user_id: 'user-1', team: 1, is_guest: false, guest_name: null, name: 'Amir' },
      { id: 'p2', match_id: 'match-1', user_id: 'user-2', team: 2, is_guest: false, guest_name: null, name: 'Ben' },
    ],
    score_sets: [
      { id: 's1', match_id: 'match-1', set_number: 1, team1_score: 21, team2_score: 18 },
      { id: 's2', match_id: 'match-1', set_number: 2, team1_score: 21, team2_score: 16 },
    ],
    ...overrides,
  }
}

describe('generateStoryMoments', () => {
  it('detects a current win streak from scored user matches', () => {
    const moments = generateStoryMoments({
      user,
      matches: [
        match({ id: 'latest', match_date: '2026-06-05T12:00:00Z', created_at: '2026-06-05T12:00:00Z' }),
        match({ id: 'previous', match_date: '2026-06-04T12:00:00Z', created_at: '2026-06-04T12:00:00Z' }),
      ],
    })

    expect(moments[0]).toMatchObject({
      type: 'win_streak',
      title: '2-match winning run',
    })
  })

  it('detects a comeback win when the player loses the first set and wins the match', () => {
    const moments = generateStoryMoments({
      user,
      matches: [
        match({
          id: 'comeback',
          score_sets: [
            { id: 's1', match_id: 'comeback', set_number: 1, team1_score: 17, team2_score: 21 },
            { id: 's2', match_id: 'comeback', set_number: 2, team1_score: 21, team2_score: 15 },
            { id: 's3', match_id: 'comeback', set_number: 3, team1_score: 21, team2_score: 18 },
          ],
        }),
      ],
    })

    expect(moments.some((moment) => moment.type === 'comeback_win')).toBe(true)
    expect(moments.find((moment) => moment.type === 'comeback_win')?.proofLabel).toBe('Proof: 17-21, 21-15, 21-18')
  })

  it('detects repeat rivalries and strong doubles partnerships', () => {
    const doublesParticipants = [
      { id: 'p1', match_id: 'm1', user_id: 'user-1', team: 1 as const, is_guest: false, guest_name: null, name: 'Amir' },
      { id: 'p2', match_id: 'm1', user_id: 'user-2', team: 1 as const, is_guest: false, guest_name: null, name: 'Chong' },
      { id: 'p3', match_id: 'm1', user_id: 'user-3', team: 2 as const, is_guest: false, guest_name: null, name: 'Ben' },
      { id: 'p4', match_id: 'm1', user_id: 'user-4', team: 2 as const, is_guest: false, guest_name: null, name: 'Dina' },
    ]
    const moments = generateStoryMoments({
      user,
      matches: [
        match({ id: 'm1', match_type: 'doubles', participants: doublesParticipants, match_date: '2026-06-05T12:00:00Z' }),
        match({ id: 'm2', match_type: 'doubles', participants: doublesParticipants.map((p) => ({ ...p, match_id: 'm2' })), match_date: '2026-06-04T12:00:00Z' }),
      ],
    })

    expect(moments.some((moment) => moment.type === 'rivalry_watch')).toBe(true)
    expect(moments.some((moment) => moment.type === 'best_partner')).toBe(true)
  })

  it('builds share-ready text with attached proof', () => {
    const [moment] = generateStoryMoments({ user, matches: [match({ id: 'shareable' })] })

    expect(buildStoryMomentShareText(moment, 'Amir')).toContain(moment.proofLabel)
    expect(buildStoryMomentShareText(moment, 'Amir')).toContain('Amir on KelabSukan')
  })

  it('contains at least 20 unique template options for each player story type', () => {
    const listSizes = [
      winStreakTemplates.length,
      responseNeededTemplates.length,
      comebackWinTemplates.length,
      cleanSweepTemplates.length,
      closeMatchTemplates.length,
      rivalryWatchTemplates.length,
      bestPartnerTemplates.length,
      latestResultWinTemplates.length,
      latestResultLossTemplates.length,
    ]
    listSizes.forEach((size) => {
      expect(size).toBeGreaterThanOrEqual(20)
    })
  })

  it('correctly uses the excludeTemplates parameter to avoid duplicate templates', () => {
    const usedTemplates = new Set<string>()

    // Generate win streak story for two players who both have a 3-match win streak
    const matchesList = [
      match({ id: 'm-latest', match_date: '2026-06-05T12:00:00Z', created_at: '2026-06-05T12:00:00Z' }),
      match({ id: 'm-prev', match_date: '2026-06-04T12:00:00Z', created_at: '2026-06-04T12:00:00Z' }),
      match({ id: 'm-prev2', match_date: '2026-06-03T12:00:00Z', created_at: '2026-06-03T12:00:00Z' }),
    ]

    const player1Moments = generateStoryMoments({
      user: { id: 'user-1', name: 'Amir', display_name: 'Amir' },
      matches: matchesList,
      excludeTemplates: usedTemplates,
    })

    const player2Moments = generateStoryMoments({
      user: { id: 'user-2', name: 'Ben', display_name: 'Ben' },
      matches: matchesList.map((m) => ({
        ...m,
        participants: [
          { id: 'p1_b', match_id: m.id, user_id: 'user-2', team: 1, is_guest: false, guest_name: null, name: 'Ben' },
          { id: 'p2_b', match_id: m.id, user_id: 'user-3', team: 2, is_guest: false, guest_name: null, name: 'Chong' },
        ],
      })),
      excludeTemplates: usedTemplates,
    })

    const p1Streak = player1Moments.find((m) => m.type === 'win_streak')
    const p2Streak = player2Moments.find((m) => m.type === 'win_streak')

    expect(p1Streak).toBeDefined()
    expect(p2Streak).toBeDefined()
    expect(usedTemplates.size).toBeGreaterThanOrEqual(2)
  })
})

import { describe, expect, it } from 'vitest'
import { getMatchStats, calculatePlayerStats, calculateRivalryStats, calculateRecommendedInsights } from './matchStats'
import type { MatchWithDetails, ScoreSet, MatchParticipant } from '../types'

function createMockMatch(overrides: Partial<MatchWithDetails>): MatchWithDetails {
  return {
    id: 'match-1',
    club_id: 'club-1',
    title: 'Match',
    sport: 'badminton',
    match_type: 'singles',
    recorded_by: 'user-1',
    match_date: '2026-06-05',
    created_at: '2026-06-05T12:00:00Z',
    participants: [
      { id: 'p1', match_id: 'match-1', user_id: 'user-1', team: 1, is_guest: false, guest_name: null, name: 'User One' },
      { id: 'p2', match_id: 'match-1', user_id: 'user-2', team: 2, is_guest: false, guest_name: null, name: 'User Two' },
    ],
    score_sets: [
      { id: 's1', match_id: 'match-1', set_number: 1, team1_score: 21, team2_score: 18 },
      { id: 's2', match_id: 'match-1', set_number: 2, team1_score: 21, team2_score: 15 },
    ],
    ...overrides,
  }
}

describe('matchStats utility library', () => {
  describe('getMatchStats', () => {
    it('calculates sets won and points correctly for a decided match', () => {
      const scoreSets: ScoreSet[] = [
        { id: 's1', match_id: 'match-1', set_number: 1, team1_score: 21, team2_score: 18 },
        { id: 's2', match_id: 'match-1', set_number: 2, team1_score: 19, team2_score: 21 },
        { id: 's3', match_id: 'match-1', set_number: 3, team1_score: 21, team2_score: 15 },
      ]
      
      const stats = getMatchStats(scoreSets)
      expect(stats.team1Sets).toBe(2)
      expect(stats.team2Sets).toBe(1)
      expect(stats.team1Points).toBe(61)
      expect(stats.team2Points).toBe(54)
      expect(stats.winningTeam).toBe(1)
    })

    it('returns null winningTeam for draws', () => {
      const scoreSets: ScoreSet[] = [
        { id: 's1', match_id: 'match-1', set_number: 1, team1_score: 21, team2_score: 18 },
        { id: 's2', match_id: 'match-1', set_number: 2, team1_score: 18, team2_score: 21 },
      ]
      const stats = getMatchStats(scoreSets)
      expect(stats.winningTeam).toBeNull()
    })
  })

  describe('calculatePlayerStats', () => {
    it('aggregates player wins, losses, winRate, streak and form', () => {
      const matches = [
        createMockMatch({
          id: 'm1',
          created_at: '2026-06-05T12:00:00Z',
          score_sets: [{ id: 's1', match_id: 'm1', set_number: 1, team1_score: 21, team2_score: 18 }], // Win for user-1 (Team 1)
        }),
        createMockMatch({
          id: 'm2',
          created_at: '2026-06-04T12:00:00Z',
          score_sets: [{ id: 's2', match_id: 'm2', set_number: 1, team1_score: 21, team2_score: 15 }], // Win for user-1 (Team 1)
        }),
        createMockMatch({
          id: 'm3',
          created_at: '2026-06-03T12:00:00Z',
          score_sets: [{ id: 's3', match_id: 'm3', set_number: 1, team1_score: 12, team2_score: 21 }], // Loss for user-1 (Team 1)
        }),
      ]

      const stats = calculatePlayerStats(matches, 'user-1')
      expect(stats.matchesPlayed).toBe(3)
      expect(stats.wins).toBe(2)
      expect(stats.losses).toBe(1)
      expect(stats.winRate).toBe(67)
      expect(stats.streak).toBe(2)
      expect(stats.streakType).toBe('win')
      expect(stats.form).toHaveLength(3)
      expect(stats.form[0].won).toBe(true) // latest
      expect(stats.form[2].won).toBe(false) // oldest
    })
  })

  describe('calculateRivalryStats', () => {
    it('computes head-to-head metrics against a specific opponent', () => {
      const matches = [
        createMockMatch({
          id: 'm1',
          created_at: '2026-06-05T12:00:00Z',
          participants: [
            { id: '1', match_id: 'm1', user_id: 'user-1', team: 1, is_guest: false, guest_name: null, name: 'User One' },
            { id: '2', match_id: 'm1', user_id: 'user-2', team: 2, is_guest: false, guest_name: null, name: 'User Two' },
          ],
          score_sets: [{ id: 's1', match_id: 'm1', set_number: 1, team1_score: 21, team2_score: 19 }], // Win for user-1
        }),
        createMockMatch({
          id: 'm2',
          created_at: '2026-06-04T12:00:00Z',
          participants: [
            { id: '3', match_id: 'm2', user_id: 'user-1', team: 1, is_guest: false, guest_name: null, name: 'User One' },
            { id: '4', match_id: 'm2', user_id: 'user-2', team: 2, is_guest: false, guest_name: null, name: 'User Two' },
          ],
          score_sets: [{ id: 's2', match_id: 'm2', set_number: 1, team1_score: 15, team2_score: 21 }], // Loss for user-1
        }),
      ]

      const stats = calculateRivalryStats(matches, 'user-1', 'user-2', 'rival')
      expect(stats.matchesPlayed).toBe(2)
      expect(stats.wins).toBe(1)
      expect(stats.losses).toBe(1)
      expect(stats.winRate).toBe(50)
      expect(stats.streak).toBe(1)
      expect(stats.streakType).toBe('win')
    })
  })

  describe('calculateRecommendedInsights', () => {
    it('recommends top doubles partners and rivals based on gameplay history', () => {
      const matches = [
        createMockMatch({
          id: 'm1',
          match_type: 'doubles',
          participants: [
            { id: '1', match_id: 'm1', user_id: 'user-1', team: 1, is_guest: false, guest_name: null, name: 'User One' },
            { id: '2', match_id: 'm1', user_id: 'partner-1', team: 1, is_guest: false, guest_name: null, name: 'Partner One' },
            { id: '3', match_id: 'm1', user_id: 'rival-1', team: 2, is_guest: false, guest_name: null, name: 'Rival One' },
            { id: '4', match_id: 'm1', user_id: 'rival-2', team: 2, is_guest: false, guest_name: null, name: 'Rival Two' },
          ],
          score_sets: [{ id: 's1', match_id: 'm1', set_number: 1, team1_score: 21, team2_score: 18 }], // Win for User One & Partner One
        }),
        createMockMatch({
          id: 'm2',
          match_type: 'doubles',
          participants: [
            { id: '5', match_id: 'm2', user_id: 'user-1', team: 1, is_guest: false, guest_name: null, name: 'User One' },
            { id: '6', match_id: 'm2', user_id: 'partner-1', team: 1, is_guest: false, guest_name: null, name: 'Partner One' },
            { id: '7', match_id: 'm2', user_id: 'rival-1', team: 2, is_guest: false, guest_name: null, name: 'Rival One' },
            { id: '8', match_id: 'm2', user_id: 'rival-2', team: 2, is_guest: false, guest_name: null, name: 'Rival Two' },
          ],
          score_sets: [{ id: 's2', match_id: 'm2', set_number: 1, team1_score: 21, team2_score: 19 }], // Win for User One & Partner One
        }),
      ]

      const insights = calculateRecommendedInsights(matches, 'user-1', 'User One')
      expect(insights.bestPartner).toMatchObject({ name: 'Partner One', matches: 2, wins: 2 })
      expect(insights.topRival).toMatchObject({ name: 'Rival One', matches: 2, wins: 2 })
    })
  })
})

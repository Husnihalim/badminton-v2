import { describe, expect, it } from 'vitest'
import {
  competitionParticipantsShareUser,
  getDuplicateCompetitionUserMessage,
  getMatchupParticipantOverlapMessage,
} from './competitionIntegrity'

describe('competition integrity helpers', () => {
  const pairA = {
    id: 'pair-a',
    name: 'Afiq / Ben',
    user_1_id: 'afiq',
    user_2_id: 'ben',
  }

  it('detects matchup pairs that share a player', () => {
    const pairB = {
      id: 'pair-b',
      name: 'Ben / Chong',
      user_1_id: 'ben',
      user_2_id: 'chong',
    }

    expect(competitionParticipantsShareUser(pairA, pairB)).toBe(true)
    expect(getMatchupParticipantOverlapMessage(pairA, pairB)).toContain('share a player')
  })

  it('allows matchup pairs with four unique players', () => {
    const pairB = {
      id: 'pair-b',
      name: 'Chong / Dev',
      user_1_id: 'chong',
      user_2_id: 'dev',
    }

    expect(competitionParticipantsShareUser(pairA, pairB)).toBe(false)
    expect(getMatchupParticipantOverlapMessage(pairA, pairB)).toBeNull()
  })

  it('detects a duplicate player across the competition roster', () => {
    const duplicateMessage = getDuplicateCompetitionUserMessage([
      pairA,
      {
        id: 'pair-b',
        name: 'Club Admin / Dev',
        user_1_id: 'afiq',
        user_2_id: 'dev',
      },
    ])

    expect(duplicateMessage).toContain('Each player can only appear once')
  })

  it('detects the same player in both slots of one pair', () => {
    const duplicateMessage = getDuplicateCompetitionUserMessage([
      {
        id: 'pair-a',
        name: 'Club Admin / Club Admin',
        user_1_id: 'admin',
        user_2_id: 'admin',
      },
    ])

    expect(duplicateMessage).toContain('uses the same player twice')
  })
})


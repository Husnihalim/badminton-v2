import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getClubMatches, deleteClub, createClub } from './api'
import { supabase } from './supabase'

// Mock Supabase client
vi.mock('./supabase', () => {
  const mockFrom = vi.fn()
  const mockRpc = vi.fn(() => Promise.resolve({ data: 'MOCK_INVITE_CODE', error: null }))
  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })),
      }
    }
  }
})

describe('api.ts - Critical Database Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getClubMatches', () => {
    it('returns matches with correctly resolved participant names and scores', async () => {
      const mockMatches = [
        {
          id: 'match-1',
          club_id: 'club-1',
          sport: 'badminton',
          match_type: 'singles',
          recorded_by: 'user-1',
          match_date: '2026-06-03',
          created_at: '2026-06-03T12:00:00Z',
          match_participants: [
            {
              id: 'mp-1',
              match_id: 'match-1',
              user_id: 'user-1',
              team: 1,
              is_guest: false,
              guest_name: null,
              profiles: {
                name: 'Ahmad Ali',
                display_name: 'Ahmad'
              }
            },
            {
              id: 'mp-2',
              match_id: 'match-1',
              user_id: null,
              team: 2,
              is_guest: true,
              guest_name: 'Guest Player 1',
              profiles: null
            }
          ],
          score_sets: [
            {
              id: 'ss-1',
              match_id: 'match-1',
              set_number: 1,
              team1_score: 21,
              team2_score: 19
            }
          ]
        }
      ]

      // Setup the supabase chain mock
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockImplementation(() => Promise.resolve({ data: mockMatches, error: null }))
      
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: mockEq,
        order: mockOrder,
      } as any)

      const result = await getClubMatches('club-1')

      // Assertions
      expect(mockFrom).toHaveBeenCalledWith('matches')
      expect(mockEq).toHaveBeenCalledWith('club_id', 'club-1')
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('match-1')
      
      // Mapped participant checks
      expect(result[0].participants.length).toBe(2)
      expect(result[0].participants[0].name).toBe('Ahmad') // display_name fallback
      expect(result[0].participants[1].name).toBe('Guest Player 1') // guest name fallback
      
      // Score sets checks
      expect(result[0].score_sets.length).toBe(1)
      expect(result[0].score_sets[0].team1_score).toBe(21)
    })
  })

  describe('deleteClub', () => {
    it('deletes a club from the database by ID', async () => {
      const mockEq = vi.fn().mockImplementation(() => Promise.resolve({ error: null }))
      const mockDelete = vi.fn().mockReturnThis()
      
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      } as any)

      await deleteClub('club-to-delete')

      expect(mockFrom).toHaveBeenCalledWith('clubs')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'club-to-delete')
    })
  })

  describe('createClub', () => {
    it('inserts a new club with correct defaults matching LEP BC settings', async () => {
      const mockSingle = vi.fn().mockImplementation(() => Promise.resolve({
        data: { id: 'new-club-id', name: 'Ace Smash Club', invite_code: null },
        error: null
      }))
      const mockSelect = vi.fn().mockReturnThis()
      const mockInsert = vi.fn().mockReturnThis()
      
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as any)

      const result = await createClub({
        name: 'Ace Smash Club',
        city: 'Kuala Lumpur',
      })

      expect(mockFrom).toHaveBeenCalledWith('clubs')
      expect(mockInsert).toHaveBeenCalledWith({
        sport_focus: ['badminton'],
        open_join: true,
        approval_required: true,
        name: 'Ace Smash Club',
        city: 'Kuala Lumpur',
        owner_id: 'test-user-id',
      })
      expect(result?.id).toBe('new-club-id')
      expect(result?.invite_code).toBe('MOCK_INVITE_CODE')
    })
  })
})

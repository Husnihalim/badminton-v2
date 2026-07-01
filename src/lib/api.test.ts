import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getClubMatches, deleteClub, createClub, updateMemberRole, getPlayerMatches } from './api'
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
    vi.mocked(supabase.from).mockReset()
    vi.mocked(supabase.rpc).mockReset()
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'MOCK_INVITE_CODE', error: null } as never)
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null } as never)
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
      const mockOrder = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        then: vi.fn().mockImplementation((onfulfilled) => {
          return Promise.resolve({ data: mockMatches, error: null }).then(onfulfilled)
        })
      }
      
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue(mockChain as never)

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
      } as never)

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
      } as never)

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

  describe('updateMemberRole', () => {
    it('uses the hardened update_member_role RPC for admin and member role changes', async () => {
      const mockRpc = vi.mocked(supabase.rpc)
      mockRpc.mockResolvedValue({ data: null, error: null } as never)

      await updateMemberRole('club-1', 'user-2', 'admin')

      expect(mockRpc).toHaveBeenCalledWith('update_member_role', {
        target_club_id: 'club-1',
        target_user_id: 'user-2',
        new_role: 'admin',
      })
      expect(supabase.from).not.toHaveBeenCalledWith('memberships')
    })

    it('blocks ownership transfers from the browser role update path', async () => {
      await expect(updateMemberRole('club-1', 'user-2', 'owner')).rejects.toThrow('Ownership transfers are not supported here.')
      expect(supabase.rpc).not.toHaveBeenCalledWith('update_member_role', expect.any(Object))
    })
  })

  describe('createMatch and automated announcement', () => {
    it('creates a match and posts an automated completion announcement to the club message board', async () => {
      const mockRpcMatch = {
        id: 'match-123',
        club_id: 'club-1',
        title: 'Sunday Doubles',
        sport: 'badminton',
        match_type: 'doubles',
        recorded_by: 'test-user-id',
        match_date: '2026-06-04',
      }

      const mockRpc = vi.mocked(supabase.rpc)
      mockRpc.mockResolvedValue({ data: mockRpcMatch, error: null } as never)

      const mockProfiles = [
        { id: 'user-1', name: 'Alice' },
        { id: 'user-2', name: 'Bob' },
        { id: 'user-3', name: 'Charlie' },
      ]

      const mockMaybeSingle = vi.fn().mockImplementation(() => Promise.resolve({ data: { name: 'Test User' }, error: null }))
      const mockInsert = vi.fn().mockImplementation(() => Promise.resolve({ error: null }))
      const mockIn = vi.fn().mockImplementation(() => Promise.resolve({ data: mockProfiles, error: null }))
      const mockEq = vi.fn().mockImplementation(() => ({
        maybeSingle: mockMaybeSingle
      }))

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockImplementation(() => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          in: mockIn,
          eq: mockEq,
          insert: mockInsert,
          single: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: mockMaybeSingle
        } as never
        return chain
      })


      const matchData = {
        club_id: 'club-1',
        title: 'Sunday Doubles',
        sport: 'badminton',
        match_type: 'doubles' as const,
        participants: [
          { team: 1 as const, user_id: 'user-1', is_guest: false },
          { team: 1 as const, user_id: 'user-2', is_guest: false },
          { team: 2 as const, user_id: 'user-3', is_guest: false },
          { team: 2 as const, guest_name: 'Guest Dave', is_guest: true },
        ],
        score_sets: [
          { set_number: 1, team1_score: 21, team2_score: 18 },
          { set_number: 2, team1_score: 21, team2_score: 19 },
        ]
      }

      const { createMatch } = await import('./api')
      const result = await createMatch(matchData)

      expect(result?.id).toBe('match-123')
      expect(mockRpc).toHaveBeenCalledWith('create_match_with_details', expect.any(Object))
      
      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockIn).toHaveBeenCalledWith('id', ['user-1', 'user-2', 'user-3'])

      expect(mockFrom).toHaveBeenCalledWith('club_messages')
      expect(mockInsert).toHaveBeenCalledWith({
        club_id: 'club-1',
        title: '🎉 Match Completed',
        message: 'Alice & Bob beat Charlie & Guest Dave (21-18, 21-19)',
        created_by: 'test-user-id',
      })
    })
  })

  describe('getPlayerMatches', () => {
    it('calls get_player_matches RPC with user ID and limit', async () => {
      const mockRpc = vi.mocked(supabase.rpc)
      mockRpc.mockResolvedValue({ data: [{ id: 'match-1' }], error: null } as never)

      const result = await getPlayerMatches('user-123', 10)

      expect(mockRpc).toHaveBeenCalledWith('get_player_matches', {
        p_user_id: 'user-123',
        p_limit: 10,
      })
      expect(result).toEqual([{ id: 'match-1' }])
    })
  })
})


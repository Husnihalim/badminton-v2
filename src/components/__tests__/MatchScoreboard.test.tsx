import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MatchScoreboard } from '../MatchScoreboard';

// Mock the API calls in MatchScoreboard
vi.mock('../../lib/api', () => ({
  toggleMatchReaction: vi.fn().mockResolvedValue([]),
  addMatchComment: vi.fn().mockResolvedValue({}),
  deleteMatchComment: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'alice', display_name: 'Alice' },
    isLoading: false,
  }),
}));

const mockDoublesMatch = {
  id: 'match-doubles-1',
  club_id: 'club-1',
  title: 'Friendly Doubles',
  sport: 'badminton',
  match_type: 'doubles',
  match_date: '2026-06-10',
  recorded_by: 'u1',
  created_at: '2026-06-10T00:00:00Z',
  clubName: 'Elite Club',
  participants: [
    {
      id: 'p1',
      match_id: 'match-doubles-1',
      user_id: 'u1',
      team: 1 as const,
      created_at: '',
      guest_name: null,
      name: 'Alice',
      profile: {
        id: 'u1',
        name: 'alice',
        display_name: 'Alice',
        gear: { racket: 'Astrox 88D', racket_weight: '4U' },
        is_private: false,
      },
    },
    {
      id: 'p2',
      match_id: 'match-doubles-1',
      user_id: 'u2',
      team: 1 as const,
      created_at: '',
      guest_name: null,
      name: 'Bob',
      profile: {
        id: 'u2',
        name: 'bob',
        display_name: 'Bob',
        gear: { racket: 'Nanoflare 800' },
        is_private: false,
      },
    },
    {
      id: 'p3',
      match_id: 'match-doubles-1',
      user_id: null,
      team: 2 as const,
      created_at: '',
      guest_name: 'Charlie (Guest)',
      name: 'Charlie (Guest)',
      profile: null,
    },
    {
      id: 'p4',
      match_id: 'match-doubles-1',
      user_id: 'u4',
      team: 2 as const,
      created_at: '',
      guest_name: null,
      name: 'David',
      profile: {
        id: 'u4',
        name: 'david',
        display_name: 'David',
        gear: { racket: 'Duora 10' },
        is_private: false,
      },
    },
  ],
  score_sets: [
    { id: 's1', match_id: 'match-doubles-1', set_number: 1, team1_score: 21, team2_score: 18, created_at: '' },
    { id: 's2', match_id: 'match-doubles-1', set_number: 2, team1_score: 19, team2_score: 21, created_at: '' },
    { id: 's3', match_id: 'match-doubles-1', set_number: 3, team1_score: 21, team2_score: 15, created_at: '' },
  ],
};

const mockSinglesMatch = {
  id: 'match-singles-1',
  club_id: 'club-1',
  title: 'Singles Showdown',
  sport: 'badminton',
  match_type: 'singles',
  match_date: '2026-06-10',
  recorded_by: 'u1',
  created_at: '2026-06-10T00:00:00Z',
  clubName: 'Elite Club',
  participants: [
    {
      id: 'p1',
      match_id: 'match-singles-1',
      user_id: 'u1',
      team: 1 as const,
      created_at: '',
      guest_name: null,
      name: 'Alice',
      profile: {
        id: 'u1',
        name: 'alice',
        display_name: 'Alice',
        gear: { racket: 'Astrox 88D' },
        is_private: false,
      },
    },
    {
      id: 'p3',
      match_id: 'match-singles-1',
      user_id: null,
      team: 2 as const,
      created_at: '',
      guest_name: 'Charlie (Guest)',
      name: 'Charlie (Guest)',
      profile: null,
    },
  ],
  score_sets: [
    { id: 's1', match_id: 'match-singles-1', set_number: 1, team1_score: 21, team2_score: 18, created_at: '' },
    { id: 's2', match_id: 'match-singles-1', set_number: 2, team1_score: 21, team2_score: 15, created_at: '' },
  ],
};

describe('MatchScoreboard Lineup specs integration', () => {
  it('renders doubles match and toggles lineup panel correctly without crashing', () => {
    render(
      <MemoryRouter>
        <MatchScoreboard match={mockDoublesMatch} />
      </MemoryRouter>
    );

    // Verify main match metadata and participants
    expect(screen.getByText('Friendly Doubles')).toBeInTheDocument();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Charlie (Guest)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('David').length).toBeGreaterThan(0);

    // Verify lineup panel is hidden initially
    expect(screen.queryByText('Team 1 Lineup')).not.toBeInTheDocument();

    // Toggle lineup panel
    const toggleBtn = screen.getByTitle('Lineup specs');
    fireEvent.click(toggleBtn);

    // Verify lineup headers are visible now
    expect(screen.getByText('Team 1 Lineup')).toBeInTheDocument();
    expect(screen.getByText('Team 2 Lineup')).toBeInTheDocument();

    // Verify gear specs for profiles inside comparison cards
    expect(screen.getAllByText(/Astrox 88D/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nanoflare 800/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Duora 10/).length).toBeGreaterThan(0);

    // Verify guest player is styled as a guest
    expect(screen.getAllByText(/Guest Player/).length).toBeGreaterThan(0);
  });

  it('renders singles match and toggles lineup specs correctly without crashing', () => {
    render(
      <MemoryRouter>
        <MatchScoreboard match={mockSinglesMatch} />
      </MemoryRouter>
    );

    expect(screen.getByText('Singles Showdown')).toBeInTheDocument();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Charlie \(Guest\)/).length).toBeGreaterThan(0);

    // Verify Bob & David are NOT present
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    expect(screen.queryByText('David')).not.toBeInTheDocument();

    // Toggle lineup panel
    const toggleBtn = screen.getByTitle('Lineup specs');
    fireEvent.click(toggleBtn);

    // Lineup shows up
    expect(screen.getByText('Team 1 Lineup')).toBeInTheDocument();
    expect(screen.getByText('Team 2 Lineup')).toBeInTheDocument();

    // Guest player and Astrox 88D visible
    expect(screen.getAllByText(/Astrox 88D/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Guest Player/).length).toBeGreaterThan(0);
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerCard } from '../PlayerCard';
import type { User } from '../../types';

describe('PlayerCard', () => {
  const mockProfile: Partial<User> = {
    id: 'user-123',
    name: 'johndoe',
    display_name: 'John Doe',
    city: 'Kuala Lumpur',
    preferred_sport: 'badminton',
    bio: 'Professional badminton enthusiast.',
    gear: {
      racket: 'Yonex Astrox 88D',
      racket_weight: '4U',
      racket_balance: 'head_heavy',
      racket_stiffness: 'stiff',
      strings: 'BG80',
      tension: '26 lbs',
      grip: 'towel',
      grip_type: 'towel_grip',
      shoes: 'Yonex Power Cushion',
      play_style: 'offensive',
      dominant_hand: 'right',
      player_type: 'doubles_back',
    },
    social_links: {
      instagram: 'john_badminton',
    },
    is_private: false,
  };

  const mockStats = {
    matchesPlayed: 10,
    wins: 7,
    losses: 3,
    winRate: 70,
    streak: 3,
    streakType: 'win' as const,
    form: [
      { won: true, setScores: '21-15, 21-18' },
      { won: true, setScores: '21-19, 21-14' },
      { won: true, setScores: '21-10, 21-12' },
    ],
  };

  it('renders full Arena-style player card correctly', () => {
    render(
      <MemoryRouter>
        <PlayerCard
          profile={mockProfile}
          stats={mockStats}
          rank={{ rank: 5, total: 100 }}
          elo={1350}
          isOwner={false}
        />
      </MemoryRouter>
    );

    // Verify name, city, and bio
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
    expect(screen.getByText('Kuala Lumpur')).toBeInTheDocument();
    expect(screen.getByText('Professional badminton enthusiast.')).toBeInTheDocument();

    // Verify stats
    expect(screen.getByText('7W')).toBeInTheDocument();
    expect(screen.getByText('3L')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('#5/100')).toBeInTheDocument();

    // Verify gear & specs
    expect(screen.getByText('Yonex Astrox 88D')).toBeInTheDocument();
    expect(screen.getByText('BG80')).toBeInTheDocument();
    expect(screen.getByText('Tension: 26 lbs')).toBeInTheDocument();
    expect(screen.getByText('Yonex Power Cushion')).toBeInTheDocument();
  });

  it('renders simplified mode layout correctly', () => {
    render(
      <MemoryRouter>
        <PlayerCard
          profile={mockProfile}
          stats={mockStats}
          elo={1350}
          isSimplified={true}
        />
      </MemoryRouter>
    );

    // Verify key fields in simplified mode
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
    expect(screen.getByText('⚡ 1350')).toBeInTheDocument();

    // Racket, strings and stats
    expect(screen.getByText(/Yonex Astrox 88D/)).toBeInTheDocument();
    expect(screen.getByText(/BG80/)).toBeInTheDocument();
    expect(screen.getByText('Win Rate:')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('renders guest player fallback correctly in simplified mode', () => {
    const guestProfile: Partial<User> = {
      name: 'Guest Player Alpha',
      display_name: 'Guest Player Alpha',
    };

    render(
      <MemoryRouter>
        <PlayerCard
          profile={guestProfile}
          isSimplified={true}
        />
      </MemoryRouter>
    );

    // Verify guest fallback values
    expect(screen.getByText('Guest Player Alpha')).toBeInTheDocument();
    expect(screen.getByText('Guest Player')).toBeInTheDocument();
    expect(screen.queryByText('@')).not.toBeInTheDocument();
  });
});

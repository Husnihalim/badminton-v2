import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../Navbar'
import { getMyClubs } from '../../lib/api'

// Mock context hooks
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Faiz', email: 'faiz@example.com', role: 'member' },
    logout: vi.fn(),
  })),
}))

vi.mock('../../context/NotificationsContext', () => ({
  useNotifications: vi.fn(() => ({
    unreadCount: 3,
  })),
}))

vi.mock('../../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  })),
}))

// Mock API
vi.mock('../../lib/api', () => ({
  getMyClubs: vi.fn(),
}))

describe('Navbar Component - Responsive & Theme Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders navbar with brand logo and theme toggle button', async () => {
    vi.mocked(getMyClubs).mockResolvedValue([])

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )

    // Wait for async state updates to finish and brand text to show
    await waitFor(() => {
      expect(screen.getByText('kelabsukan.com')).toBeInTheDocument()
    })

    // Theme toggle button should be present with new theme-toggle-btn class
    const themeBtn = screen.getByRole('button', { name: /toggle theme/i })
    expect(themeBtn).toBeInTheDocument()
    expect(themeBtn.className).toContain('theme-toggle-btn')
  })

  it('renders multiple clubs separated for desktop and mobile layouts', async () => {
    const mockClubs = [
      { id: 'club-1', name: 'Club Alpha', role: 'member' },
      { id: 'club-2', name: 'Club Beta', role: 'member' },
    ]
    vi.mocked(getMyClubs).mockResolvedValue(mockClubs as any)

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )

    // Wait for clubs to resolve
    await waitFor(() => {
      // Desktop dropdown trigger for Clubs
      expect(screen.getByRole('button', { name: /clubs/i })).toBeInTheDocument()
    })

    // Mobile-only inline links should also be rendered
    const mobileClub1 = screen.getByRole('link', { name: /go to club alpha/i })
    const mobileClub2 = screen.getByRole('link', { name: /go to club beta/i })
    expect(mobileClub1).toBeInTheDocument()
    expect(mobileClub2).toBeInTheDocument()
    
    // They should have the mobile-only class
    expect(mobileClub1.className).toContain('mobile-only')
    expect(mobileClub2.className).toContain('mobile-only')

    // Find Clubs link should be rendered on mobile
    const findClubsMobile = screen.getByRole('link', { name: /find clubs/i })
    expect(findClubsMobile).toBeInTheDocument()
    expect(findClubsMobile.className).toContain('mobile-only')
  })
})

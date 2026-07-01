import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../../App'

// Reuse the mock-supabase pattern from App.test.tsx so the RPC calls (which are
// stubbed nonexistent) gracefully fall back to mock data and the homepage
// renders its new ESPN-style sections.

type MockResult = { data: unknown[]; error: null }
type MockCallback = (value: MockResult) => unknown
type MockChain = Record<string, unknown>

const createMockChain = (returnValue: MockResult = { data: [], error: null }): MockChain => {
  const chain = {} as MockChain
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => Promise.resolve(returnValue))
  chain.single = vi.fn(() => Promise.resolve(returnValue))
  chain.then = vi.fn((cb: MockCallback) => Promise.resolve(cb(returnValue)))
  return chain
}

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => createMockChain()),
    storage: { from: vi.fn(() => ({ upload: vi.fn(() => Promise.resolve({})), getPublicUrl: vi.fn() })) },
  },
}))

const renderHome = () => {
  window.history.pushState({}, '', '/')
  return render(<App />)
}

describe('Landing Page — ESPN-style newsroom sections (Phase 1–3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Live Score ticker with a LIVE label', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /live scores across all clubs/i })).toBeInTheDocument()
    }, { timeout: 8000 })

    // Ticker items are mockMatches — LEP BC & Smashers PJ should be mentioned
    const matches = screen.getAllByText(/LEP BC|Smashers PJ/)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('renders the Lead Story hero with a headline', async () => {
    renderHome()
    await waitFor(() => {
      // The lead story is "The Great Escape" (highest priority mock)
      expect(screen.getByRole('heading', { level: 1, name: /The Great Escape/i })).toBeInTheDocument()
    }, { timeout: 8000 })
  })

  it('renders the Find Your Scene location search module', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /find clubs near you/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /use my location/i })).toBeInTheDocument()
    }, { timeout: 8000 })
  })

  it('renders the Faces of the Community player rail', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /faces of the community/i })).toBeInTheDocument()
    }, { timeout: 8000 })
    // At least one mock athlete name should appear (mock fallback returns 10)
    await waitFor(() => {
      expect(screen.getByText('Husni Halim')).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('renders the Wins & Heartbreaks editorial split', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /wins and heartbreaks/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /^Wins$/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /^Heartbreaks$/i })).toBeInTheDocument()
    }, { timeout: 8000 })
  })

  it('renders the Marketplace deal rail (Phase 4)', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /marketplace deals near you/i })).toBeInTheDocument()
    }, { timeout: 8000 })
    // Mock fallback deals surface
    await waitFor(() => {
      expect(screen.getByText('Yonex Astrox 88D Pro')).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('keeps a single level-1 heading (lead story)', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    }, { timeout: 8000 })
  })
})
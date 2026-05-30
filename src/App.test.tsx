import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Create a mock chain that returns itself for chaining
const createMockChain = (returnValue: any = { data: [], error: null }) => {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(returnValue)),
    single: vi.fn(() => Promise.resolve(returnValue)),
    then: vi.fn((cb) => Promise.resolve(cb(returnValue))),
  }
  return chain
}

// Mock Supabase
vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => createMockChain()),
  },
}))

const renderApp = (path = '/') => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
})

describe('KelabSukan app flows', () => {
  it('renders the landing page with hero text and primary actions', () => {
    renderApp('/')

    expect(screen.getByRole('heading', { name: /run your racket sport club/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /log in/i })).toHaveLength(2)
  })

  it('navigates to the login page from the header', async () => {
    renderApp('/')

    const loginLinks = screen.getAllByRole('link', { name: /log in/i })
    await userEvent.click(loginLinks[0])
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
  })

  it('shows not found page for unknown routes', () => {
    renderApp('/unknown-route')
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()
  })
})

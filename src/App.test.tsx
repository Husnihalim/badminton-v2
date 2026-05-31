import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Create a mock chain that returns itself for chaining
const createMockChain = (returnValue: any = { data: [], error: null }): any => {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(returnValue)),
    single: vi.fn(() => Promise.resolve(returnValue)),
    then: vi.fn((cb: any) => Promise.resolve(cb(returnValue))),
  }
  return chain
}

// Mock Supabase
vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
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

describe('KelabSukan App - Core Features', () => {
  describe('Landing Page', () => {
    it('renders with hero text and CTA', async () => {
      renderApp('/')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /run your racket sport club/i })).toBeInTheDocument()
      })
      
      expect(screen.getAllByRole('link', { name: /get started/i }).length).toBeGreaterThan(0)
    })

    it('shows trust indicators', async () => {
      renderApp('/')

      await waitFor(() => {
        expect(screen.getByText(/trusted by clubs/i)).toBeInTheDocument()
      })
      
      expect(screen.getAllByText(/fast setup/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/mobile-first/i).length).toBeGreaterThan(0)
    })
  })

  describe('Navigation', () => {
    it('shows navbar with brand and links', async () => {
      renderApp('/')

      await waitFor(() => {
        expect(screen.getByText('KelabSukan')).toBeInTheDocument()
      })
      
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    })
  })

  describe('Auth Flow', () => {
    it('renders login page with form', async () => {
      renderApp('/login')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
      })
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    })

    it('renders register page with form', async () => {
      renderApp('/register')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
      })
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('renders forgot password page with reset form', async () => {
      renderApp('/forgot-password')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument()
      })
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
    })

    it('renders reset password page with new password form', async () => {
      renderApp('/reset-password')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument()
      })
      
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
    })

    it('navigates between pages', async () => {
      renderApp('/')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /run your racket sport club/i })).toBeInTheDocument()
      })

      const loginLinks = screen.getAllByRole('link', { name: /log in/i })
      await userEvent.click(loginLinks[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows 404 for unknown routes', async () => {
      renderApp('/unknown-route')

      await waitFor(() => {
        expect(screen.getByText(/page not found/i)).toBeInTheDocument()
      })
      
      expect(screen.getByRole('link', { name: /return home/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      renderApp('/')
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      })
    })

    it('form inputs have associated labels', async () => {
      renderApp('/login')

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toHaveAttribute('id')
        expect(screen.getByLabelText(/password/i)).toHaveAttribute('id')
      })
    })
  })
})

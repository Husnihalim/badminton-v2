import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

// Mock Supabase client
vi.mock('../lib/supabase', () => {
  const mockFrom = vi.fn()

  return {
    supabase: {
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      from: mockFrom
    }
  }
})

// Mock the API logs so it does not trigger actual database updates
vi.mock('../lib/api/profiles', () => ({
  ensureCurrentUserProfile: vi.fn(),
}))
vi.mock('../lib/api/superadmin', () => ({
  logPlatformEvent: vi.fn(),
}))

function TestComponent() {
  const { user, login } = useAuth()
  return (
    <div>
      <div data-testid="user-role">{user ? user.role : 'none'}</div>
      <div data-testid="user-email">{user ? user.email : 'none'}</div>
      <button data-testid="login-btn" onClick={() => login('admin@test.com', 'password')}>
        Login
      </button>
    </div>
  )
}

describe('AuthContext - Security & Role Assignment', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
  })

  it('assigns superadmin role when returned from the profiles table', async () => {
    // Setup supabase auth mock
    const mockAuthUser = {
      id: 'superadmin-id',
      email: 'admin@test.com',
      user_metadata: { name: 'Super Admin' }
    }
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockAuthUser, session: {} },
      error: null
    } as never)

    // Setup supabase database profile mock
    const mockProfileRow = {
      id: 'superadmin-id',
      email: 'admin@test.com',
      name: 'Super Admin',
      role: 'superadmin', // Securely defined in database profiles table
      display_name: 'Super Admin'
    }

    const mockSingle = vi.fn().mockResolvedValue({ data: mockProfileRow, error: null })
    const mockEq = vi.fn().mockReturnThis()
    const mockSelect = vi.fn().mockReturnThis()
    
    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle
    } as never)

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    )

    // Initially no user logged in
    expect(screen.getByTestId('user-role').textContent).toBe('none')

    // Click login
    const loginBtn = screen.getByTestId('login-btn')
    await act(async () => {
      loginBtn.click()
    })

    // Assert database profiles query was made for this user's details
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockEq).toHaveBeenCalledWith('id', 'superadmin-id')
    })

    // Securely assigned user role checks
    await waitFor(() => {
      expect(screen.getByTestId('user-role').textContent).toBe('superadmin')
      expect(screen.getByTestId('user-email').textContent).toBe('admin@test.com')
    })
  })

  it('assigns default member role if profile row is not found in database', async () => {
    // Setup supabase auth mock
    const mockAuthUser = {
      id: 'new-user-id',
      email: 'member@test.com',
      user_metadata: { name: 'New Member' }
    }
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockAuthUser, session: {} },
      error: null
    } as never)

    // Database lookup fails (e.g. not created yet or missing)
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Profile not found' } })
    const mockEq = vi.fn().mockReturnThis()
    const mockSelect = vi.fn().mockReturnThis()
    
    const mockFrom = vi.mocked(supabase.from)
    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle
    } as never)

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    )

    // Click login
    const loginBtn = screen.getByTestId('login-btn')
    await act(async () => {
      loginBtn.click()
    })

    // Should fall back to member role, not superadmin
    await waitFor(() => {
      expect(screen.getByTestId('user-role').textContent).toBe('member')
      expect(screen.getByTestId('user-email').textContent).toBe('member@test.com')
    })
  })
})

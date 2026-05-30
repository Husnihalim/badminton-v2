import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const renderApp = (path = '/') => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('KelabSukan app flows', () => {
  it('renders the landing page with hero text and primary actions', () => {
    renderApp('/')

    expect(screen.getByRole('heading', { name: /run your racket sport club/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /log in/i })).toHaveLength(2)
  })

  it('registers a new user and then logs in successfully', async () => {
    // First register
    renderApp('/register')
    await userEvent.type(screen.getByLabelText(/name/i), 'Test User')
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('kelabsukan_user')).toContain('Test User')

    // Log out
    await userEvent.click(screen.getByRole('button', { name: /log out/i }))
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()

    // Now log back in
    await userEvent.click(screen.getByRole('link', { name: /log in/i }))
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByText(/hello, test user/i)).toBeInTheDocument()
  })

  it('registers a new user and redirects to the dashboard', async () => {
    renderApp('/register')

    await userEvent.type(screen.getByLabelText(/name/i), 'New Member')
    await userEvent.type(screen.getByLabelText(/email/i), 'new@member.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('kelabsukan_user')).toContain('New Member')
  })

  it('registers Husni Halim as super admin automatically', async () => {
    renderApp('/register')

    await userEvent.type(screen.getByLabelText(/name/i), 'Husni Halim')
    await userEvent.type(screen.getByLabelText(/email/i), 'mohdhusni@gmail.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/super admin/i)).toBeInTheDocument()
    expect(window.localStorage.getItem('kelabsukan_user')).toContain('superadmin')
  })

  it('shows auth state in the navbar and logs out successfully', async () => {
    renderApp('/register')

    await userEvent.type(screen.getByLabelText(/name/i), 'Logout User')
    await userEvent.type(screen.getByLabelText(/email/i), 'logout@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/hello, logout user/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /log out/i }))

    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('kelabsukan_user')).toBeNull()
  })

  it('loads a club page and shows events and recent scores', () => {
    renderApp('/club/club-1')

    expect(screen.getByRole('heading', { name: /ace smash badminton club/i })).toBeInTheDocument()
    expect(screen.getByText(/upcoming game days/i)).toBeInTheDocument()
    expect(screen.getByText(/recent scores/i)).toBeInTheDocument()
    expect(screen.getByText(/wednesday singles night/i)).toBeInTheDocument()
    expect(screen.getByText(/aisha vs leo/i)).toBeInTheDocument()
  })

  it('retains dashboard action buttons even after authentication', async () => {
    renderApp('/register')

    await userEvent.type(screen.getByLabelText(/name/i), 'Action User')
    await userEvent.type(screen.getByLabelText(/email/i), 'actions@example.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'password123')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByRole('button', { name: /record score/i })).toBeInTheDocument()
  })

  it('shows not found page for unknown routes', () => {
    renderApp('/unknown-route')
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()
  })
})

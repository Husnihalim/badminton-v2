import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ClubSettingsPage from './ClubSettingsPage'

const authUser = {
  id: 'admin-user',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'user',
}

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: authUser,
  }),
}))

vi.mock('../lib/api', () => ({
  buildInviteUrl: vi.fn((token: string) => `https://kelabsukan.test/invite/${token}`),
  createSpecificInviteLink: vi.fn(),
  getClub: vi.fn(),
  getMyMembership: vi.fn(),
  getSpecificInviteLinks: vi.fn(),
  regenerateInviteLink: vi.fn(),
  revokeSpecificInviteLink: vi.fn(),
  updateClub: vi.fn(),
  uploadClubBanner: vi.fn(),
  uploadClubLogo: vi.fn(),
}))

const api = await import('../lib/api')

const club = {
  id: 'club-1',
  name: 'LEP BC',
  sport_focus: ['badminton'],
  owner_id: 'admin-user',
  open_join: true,
  approval_required: true,
  invite_code: 'INVITE123',
  created_at: '2026-06-01T00:00:00Z',
}

function renderSettingsPage() {
  window.history.pushState({}, '', '/club/club-1/settings')

  return render(
    <MemoryRouter initialEntries={['/club/club-1/settings']}>
      <Routes>
        <Route path="/club/:clubId/settings" element={<ClubSettingsPage />} />
        <Route path="/not-found" element={<h1>Page not found</h1>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ClubSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getClub).mockResolvedValue(club as never)
    vi.mocked(api.getMyMembership).mockResolvedValue({
      id: 'membership-1',
      club_id: 'club-1',
      user_id: 'admin-user',
      role: 'admin',
      status: 'active',
      created_at: '2026-06-01T00:00:00Z',
    } as never)
    vi.mocked(api.getSpecificInviteLinks).mockResolvedValue([])
  })

  it('shows a logo upload error without redirecting to the not-found page', async () => {
    vi.mocked(api.uploadClubLogo).mockRejectedValue(new Error('Storage bucket is not ready'))

    renderSettingsPage()

    await screen.findByRole('heading', { name: /club settings/i })

    const logoInput = document.querySelector<HTMLInputElement>('#logo-upload-input')
    expect(logoInput).not.toBeNull()

    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    await userEvent.upload(logoInput as HTMLInputElement, file)

    await waitFor(() => {
      expect(screen.getByText('Storage bucket is not ready')).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: /page not found/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /club settings/i })).toBeInTheDocument()
  })
})

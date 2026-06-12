import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ClubSettingsPage from '../ClubSettingsPage';
import * as api from '../../lib/api';

vi.mock('../../lib/api', () => ({
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
  deleteClub: vi.fn(),
  getClubMembers: vi.fn(),
}));

const mockUser = { id: 'user-1', role: 'superadmin' };
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    login: async () => ({ success: true }),
    register: async () => ({ success: true }),
    refreshUser: async () => null,
    logout: async () => {},
  }),
}));

const mockClub = {
  id: 'club-1',
  name: 'Test Club',
  description: '',
  location: '',
  city: '',
  open_join: true,
  approval_required: false,
  invite_code: 'invite123',
  logo_url: null,
  banner_url: null,
  banner_preset: 'court_green',
  accent_color: 'emerald',
  announcement: null,
  announcement_updated_at: null,
};

const mockMembership = { id: 'm-1', user_id: 'user-1', club_id: 'club-1', role: 'owner' };

describe('ClubSettingsPage tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getClub).mockResolvedValue(mockClub as never);
    vi.mocked(api.getMyMembership).mockResolvedValue(mockMembership as never);
    vi.mocked(api.getSpecificInviteLinks).mockResolvedValue([]);
    vi.mocked(api.getClubMembers).mockResolvedValue([]);
    vi.mocked(api.deleteClub).mockResolvedValue(undefined as never);
  });

  it('shows delete modal and deletes club when no members', async () => {
    render(
      <MemoryRouter initialEntries={['/club/club-1/settings']}> 
        <Routes>
          <Route path="/club/:clubId/settings" element={<ClubSettingsPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    // wait for club data to load
    await waitFor(() => expect(screen.getByDisplayValue('Test Club')).toBeInTheDocument());

    // open danger zone delete button
    fireEvent.click(screen.getByRole('button', { name: /delete club/i }));

    // modal appears
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    // confirm deletion
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /delete forever/i })));

    await waitFor(() => expect(api.deleteClub).toHaveBeenCalledWith('club-1'));
    // redirected to dashboard
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });

  it('prevents deletion when members exist', async () => {
    // mock members present
    vi.mocked(api.getClubMembers).mockResolvedValue([{ id: 'mem-1', role: 'member' }, { id: 'mem-2', role: 'member' }] as never);
    render(
      <MemoryRouter initialEntries={['/club/club-1/settings']}> 
        <Routes>
          <Route path="/club/:clubId/settings" element={<ClubSettingsPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue('Test Club')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /delete club/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /delete forever/i })));

    await waitFor(() =>
      expect(screen.getAllByText(/Cannot delete club: it still has 1 other member/)[0]).toBeInTheDocument()
    );
    expect(api.deleteClub).not.toHaveBeenCalled();
  });

  it('allows owner or superadmin deletion when they are the only member', async () => {
    render(
      <MemoryRouter initialEntries={['/club/club-1/settings']}> 
        <Routes>
          <Route path="/club/:clubId/settings" element={<ClubSettingsPage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue('Test Club')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /delete club/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /delete forever/i }));

    await waitFor(() => expect(api.deleteClub).toHaveBeenCalledWith('club-1'));
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });

  it('shows a logo upload error without redirecting to the not-found page', async () => {
    vi.mocked(api.uploadClubLogo).mockRejectedValue(new Error('Storage bucket is not ready'));

    render(
      <MemoryRouter initialEntries={['/club/club-1/settings']}>
        <Routes>
          <Route path="/club/:clubId/settings" element={<ClubSettingsPage />} />
          <Route path="/not-found" element={<h1>Page not found</h1>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue('Test Club')).toBeInTheDocument());

    const logoInput = document.querySelector<HTMLInputElement>('#logo-upload-input');
    expect(logoInput).not.toBeNull();

    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    await userEvent.upload(logoInput as HTMLInputElement, file);

    await waitFor(() => {
      expect(screen.getByText('Storage bucket is not ready')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: /page not found/i })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Club')).toBeInTheDocument();
  });
});

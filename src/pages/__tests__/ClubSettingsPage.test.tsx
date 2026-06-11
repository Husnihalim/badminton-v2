import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ClubSettingsPage from '../../pages/ClubSettingsPage';
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
  requestClubDeletion: vi.fn(),
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

const mockMembership = { id: 'm-1', user_id: 'user-1', club_id: 'club-1', role: 'owner' } as any;

describe('ClubSettingsPage delete club flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    api.getClub.mockResolvedValue(mockClub);
    // @ts-ignore
    api.getMyMembership.mockResolvedValue(mockMembership);
    // @ts-ignore
    api.getSpecificInviteLinks.mockResolvedValue([]);
    // @ts-ignore
    api.getClubMembers.mockResolvedValue([]);
    // @ts-ignore
    api.deleteClub.mockResolvedValue(undefined);
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
    // @ts-ignore
    api.getClubMembers.mockResolvedValue([{ id: 'mem-1', role: 'member' }, { id: 'mem-2', role: 'member' }]);
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
      expect(screen.getByText(/Cannot delete club: it still has 1 other member/)).toBeInTheDocument()
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
});

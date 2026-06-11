import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteClubModal from '../DeleteClubModal';

describe('DeleteClubModal', () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();

  it('renders correctly and calls callbacks', () => {
    render(
      <DeleteClubModal isOpen={true} onClose={onClose} onConfirm={onConfirm} isDeleting={false} />
    );

    // Title and description are present
    expect(screen.getByText(/Delete Club/i)).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();

    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /delete forever/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when deleting', () => {
    render(
      <DeleteClubModal isOpen={true} onClose={onClose} onConfirm={onConfirm} isDeleting={true} />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /deleting…/i })).toBeDisabled();
  });
});

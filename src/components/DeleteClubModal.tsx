import React from 'react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

interface DeleteClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  clubName?: string;
  error?: string;
}

/**
 * Premium styled modal for confirming club deletion.
 * Uses glassmorphism background with subtle blur and a gradient primary button.
 */
export default function DeleteClubModal({ isOpen, onClose, onConfirm, isDeleting = false, clubName, error }: DeleteClubModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Club</DialogTitle>
          <DialogDescription>
            This action cannot be undone. All club data, members and events will be permanently removed.
            {clubName && <span> ({clubName})</span>}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/50 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isDeleting} fullWidth className="sm:w-auto">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
            fullWidth
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white sm:w-auto"
          >
            {isDeleting ? 'Deleting…' : 'Delete Forever'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


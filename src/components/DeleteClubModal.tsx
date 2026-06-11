import React from 'react';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/Modal';
import { X } from 'lucide-react';

interface DeleteClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  clubName?: string;
}

/**
 * Premium styled modal for confirming club deletion.
 * Uses glassmorphism background with subtle blur and a gradient primary button.
 */
export default function DeleteClubModal({ isOpen, onClose, onConfirm, isDeleting = false, clubName }: DeleteClubModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Club"
      className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 max-w-md"
    >
      <p className="text-sm text-gray-300 mb-4">
        This action cannot be undone. All club data, members and events will be permanently removed.
        {clubName && <span> ({clubName})</span>}
      </p>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-4">
        <Button variant="secondary" onClick={onClose} disabled={isDeleting} fullWidth className="sm:w-auto">
          <X size={16} className="mr-2" /> Cancel
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
    </Modal>
  );
}


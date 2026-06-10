import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '../components/ui/dialog';
import { XCircle } from 'lucide-react';

interface DeleteClubModalProps {
  clubId: string;
  open: boolean;
  onClose: () => void;
  onDeleteSuccess: () => void;
}

export default function DeleteClubModal({ clubId, open, onClose, onDeleteSuccess }: DeleteClubModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-b from-slate-800 to-slate-900 text-slate-100 border border-red-600 rounded-lg shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-red-400">
            <XCircle className="text-red-500" /> Delete Club
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-300">
            This action cannot be undone. Deleting a club with members is currently blocked.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex space-x-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onDeleteSuccess}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

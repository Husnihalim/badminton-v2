import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={handleOverlayClick}
    >
      <div
        className={`relative max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-b-none rounded-t-xl border border-[var(--arena-border)] bg-[var(--arena-surface-elevated)] p-4 shadow-2xl transition-all sm:rounded-xl sm:p-6 ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </Button>

        {title && (
          <h2 id="modal-title" className="mb-4 text-lg font-bold text-[var(--arena-text)]">
            {title}
          </h2>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

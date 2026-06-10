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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className={`relative max-w-lg w-full mx-4 rounded-xl bg-[var(--arena-surface-elevated)] border border-[var(--arena-border)] p-6 shadow-2xl transition-all ${className}`}
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
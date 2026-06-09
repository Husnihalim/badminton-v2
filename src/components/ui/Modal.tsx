import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Optional title displayed at the top */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Optional CSS class for the dialog container */
  className?: string;
}

/**
 * A reusable, theme‑aware modal component.
 *
 * - Renders an overlay that darkens the page.
 * - Uses `fixed inset-0` to cover the viewport and centers the dialog.
 * - Supports light & dark mode via Tailwind `bg-white dark:bg-gray-800`.
 * - Provides a close button on the top‑right corner.
 * - Click on the overlay (outside the dialog) also triggers `onClose`.
 */
export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close when clicking directly on the overlay, not on the dialog content
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-slate-950/70"
      onClick={handleOverlayClick}
    >
      <div
        className={`relative max-w-lg w-full mx-4 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Close button */}
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
          <h2 id="modal-title" className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h2>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

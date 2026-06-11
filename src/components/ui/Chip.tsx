import { cn } from '../../lib/utils';

interface ChipProps {
  label: string;
  variant?: 'default' | 'primary' | 'accent';
  onClick?: () => void;
}

export const Chip = ({ label, variant = 'default', onClick }: ChipProps) => (
  <span
    onClick={onClick}
    className={cn(
      'inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium cursor-pointer',
      variant === 'default' && 'bg-surface-muted text-text-muted',
      variant === 'primary' && 'bg-accent text-accent-text',
      variant === 'accent' && 'bg-accent-soft text-accent'
    )}
  >
    {label}
  </span>
);
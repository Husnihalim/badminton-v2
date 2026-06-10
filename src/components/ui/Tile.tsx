import type { ReactNode } from 'react';

interface TileProps {
  title: string;
  children: ReactNode;
}

export const Tile = ({ title, children }: TileProps) => (
  <article className="rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface)] p-4 shadow-lg transition-colors duration-150">
    <h2 className="mb-2 text-lg font-bold text-[var(--arena-text)]">{title}</h2>
    {children}
  </article>
);
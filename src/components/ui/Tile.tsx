import React from 'react';

interface TileProps {
  title: string;
  children: React.ReactNode;
}

export const Tile = ({ title, children }: TileProps) => (
  <article className="bg-surface rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
    <h2 className="text-lg font-semibold mb-2">{title}</h2>
    {children}
  </article>
);

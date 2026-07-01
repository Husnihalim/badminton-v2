import type { TickerItem } from './formatMatch'

interface Props {
  items: TickerItem[]
}

export default function LiveScoreTicker({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="live-ticker" role="region" aria-label="Live scores across all clubs">
      <a href="#live-desk" className="live-ticker-label" title="Jump to the sports desk">
        <span className="live-ticker-dot" aria-hidden="true" />
        Live
      </a>
      <div className="live-ticker-track">
        {items.map((it, i) => (
          <div key={it.id} className="live-ticker-item">
            {i > 0 && <span className="tk-sep" aria-hidden="true">·</span>}
            <span className="tk-club">{it.clubName}</span>
            <span>{it.summary}</span>
            <span className="tk-ago">{it.scoredAt}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
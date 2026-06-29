import React from 'react'

interface EloHistoryPoint {
  id: string
  profile_id: string
  match_id: string
  match_type: 'singles' | 'doubles'
  elo_before: number
  elo_after: number
  delta: number
  k_factor: number
  opponent_rating_avg: number
  partner_rating?: number | null
  created_at: string
  matches?: {
    title?: string | null
    match_date?: string | null
  } | null
}

interface EloProgressionChartProps {
  history: EloHistoryPoint[]
}

export function EloProgressionChart({ history }: EloProgressionChartProps) {
  // Sort points chronologically (oldest first for left-to-right progression)
  const sortedPoints = [...history]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-10) // Limit to last 10 matches for readability

  if (sortedPoints.length === 0) return null

  // Dimensions
  const width = 600
  const height = 180
  const paddingX = 40
  const paddingY = 20

  const chartW = width - paddingX * 2
  const chartH = height - paddingY * 2

  // Extract Elo ratings
  const eloValues = sortedPoints.map(p => p.elo_after)
  const maxElo = Math.max(...eloValues)
  const minElo = Math.min(...eloValues)
  
  // Padding around bounds so line doesn't clip
  const boundsRange = maxElo - minElo
  const eloBuffer = boundsRange === 0 ? 50 : Math.max(20, boundsRange * 0.1)
  const yMax = maxElo + eloBuffer
  const yMin = Math.max(0, minElo - eloBuffer)
  const yRange = yMax - yMin

  // Map data to SVG points
  const points = sortedPoints.map((p, idx) => {
    const x = paddingX + (idx / (sortedPoints.length - 1 || 1)) * chartW
    const y = paddingY + chartH - ((p.elo_after - yMin) / yRange) * chartH
    return { x, y, data: p }
  })

  // Generate Path Data
  let pathD = ''
  let areaD = ''

  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y} `
    areaD = `M ${points[0].x} ${paddingY + chartH} L ${points[0].x} ${points[0].y} `
    
    for (let i = 1; i < points.length; i++) {
      pathD += `L ${points[i].x} ${points[i].y} `
      areaD += `L ${points[i].x} ${points[i].y} `
    }
    
    areaD += `L ${points[points.length - 1].x} ${paddingY + chartH} Z`
  }

  // Y-axis grid values (draw 4 gridlines)
  const gridLines = Array.from({ length: 4 }).map((_, idx) => {
    const eloVal = Math.round(yMin + (idx / 3) * yRange)
    const y = paddingY + chartH - ((eloVal - yMin) / yRange) * chartH
    return { y, value: eloVal }
  })

  return (
    <div className="rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface)] p-4 shadow-sm select-none">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--arena-text)] flex items-center gap-1.5">
            <span className="text-[var(--arena-accent)]">📈</span> Rating Chart
          </h3>
          <p className="text-[10px] text-[var(--arena-text-dim)] mt-0.5">Chronological Elo momentum</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-[var(--arena-text)]">
            Range: <span className="text-[var(--arena-accent)]">{minElo}</span> - <span className="text-[var(--arena-accent)]">{maxElo}</span>
          </span>
        </div>
      </div>

      <div className="relative w-full h-[180px]">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft background glow fill below the rating line */}
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--arena-accent)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--arena-accent)" stopOpacity="0.0" />
            </linearGradient>
            
            {/* Filter for a vibrant neon line glow */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {gridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1={paddingX}
                y1={line.y}
                x2={width - paddingX}
                y2={line.y}
                stroke="var(--arena-border)"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <text
                x={paddingX - 8}
                y={line.y + 4}
                fill="var(--arena-text-dim)"
                fontSize="9"
                fontFamily="var(--font-mono)"
                textAnchor="end"
                fontWeight="bold"
              >
                {line.value}
              </text>
            </g>
          ))}

          {/* X-axis base line */}
          <line
            x1={paddingX}
            y1={paddingY + chartH}
            x2={width - paddingX}
            y2={paddingY + chartH}
            stroke="var(--arena-border)"
            strokeWidth="1.5"
          />

          {/* Gradient area fill */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#chartAreaGradient)"
            />
          )}

          {/* Dynamic line path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--arena-accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonGlow)"
            />
          )}

          {/* Interactive Data Nodes */}
          {points.map((pt, idx) => {
            const isLast = idx === points.length - 1
            const isGain = pt.data.delta >= 0

            return (
              <g key={pt.data.id} className="group/node cursor-pointer">
                {/* Node outer glow rings on hover */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="7"
                  fill="var(--arena-accent)"
                  fillOpacity="0"
                  className="transition-all duration-150 group-hover/node:fill-opacity-25"
                />
                
                {/* Solid core indicator */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isLast ? "4.5" : "3.5"}
                  fill={isLast ? "var(--arena-accent)" : "var(--arena-surface)"}
                  stroke={isLast ? "var(--arena-surface)" : "var(--arena-accent)"}
                  strokeWidth="2"
                />

                {/* Micro tooltip details rendered natively inside SVG */}
                <g className="opacity-0 pointer-events-none transition-opacity duration-150 group-hover/node:opacity-100">
                  {/* Tooltip background card */}
                  <rect
                    x={pt.x - 65}
                    y={pt.y - 42}
                    width="130"
                    height="32"
                    rx="4"
                    fill="var(--arena-surface-elevated)"
                    stroke="var(--arena-border)"
                    strokeWidth="1"
                    className="shadow-lg"
                  />
                  {/* Match text */}
                  <text
                    x={pt.x}
                    y={pt.y - 30}
                    fill="var(--arena-text)"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="truncate"
                  >
                    {pt.data.matches?.title ? (pt.data.matches.title.length > 20 ? `${pt.data.matches.title.slice(0, 18)}...` : pt.data.matches.title) : 'Recorded Match'}
                  </text>
                  {/* Rating value change */}
                  <text
                    x={pt.x}
                    y={pt.y - 20}
                    fill={isGain ? "var(--arena-accent)" : "#f87171"}
                    fontSize="8.5"
                    fontFamily="var(--font-mono)"
                    fontWeight="black"
                    textAnchor="middle"
                  >
                    {pt.data.elo_after} ({isGain ? `+${pt.data.delta}` : pt.data.delta})
                  </text>
                </g>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

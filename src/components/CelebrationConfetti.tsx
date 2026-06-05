import { useMemo } from 'react'

export default function CelebrationConfetti() {
  const particles = useMemo(() => {
    const particleValue = (index: number, salt: number) => {
      const raw = (index * 9301 + salt * 49297 + 233280) % 1000
      return raw / 1000
    }
    const colors = ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#3b82f6', '#60a5fa', '#ec4899', '#f472b6', '#8b5cf6', '#a78bfa']

    return Array.from({ length: 120 }).map((_, i) => {
      const size = particleValue(i, 1) * 10 + 6
      const left = particleValue(i, 2) * 100
      const delay = particleValue(i, 3) * 2
      const duration = particleValue(i, 4) * 3 + 2
      const color = colors[Math.floor(particleValue(i, 5) * colors.length)]
      const rotation = particleValue(i, 6) * 360
      const shape = particleValue(i, 7) > 0.5 ? 'circle' : 'square'
      return {
        id: i,
        size,
        left,
        delay,
        duration,
        color,
        rotation,
        shape
      }
    })
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 100 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.left}%`,
            top: `-20px`,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            opacity: 0.8,
            animationName: 'fallAndRotate',
            animationDuration: `${p.duration}s`,
            animationTimingFunction: 'linear',
            animationDelay: `${p.delay}s`,
            animationIterationCount: 'infinite',
            transform: `rotate(${p.rotation}deg)`
          }}
        />
      ))}
      <style>{`
        @keyframes fallAndRotate {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

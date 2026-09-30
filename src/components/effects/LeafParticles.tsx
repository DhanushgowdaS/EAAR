import React, { useMemo } from 'react';

interface LeafParticle {
  id: number;
  left: number; // in %
  top: number; // in %
  size: number; // in px
  duration: number; // in seconds
  delay: number; // in seconds
  rotate: number; // initial rotation in deg
  opacity: number;
  driftX: number;
}

export const LeafParticles: React.FC = () => {
  // Generate random stable leaf particles
  const leaves = useMemo<LeafParticle[]>(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.floor((i * 5.5 + 3) % 96),
      top: 80 + (i * 7) % 40,
      size: 14 + (i % 5) * 4,
      duration: 16 + (i % 6) * 4,
      delay: -(i * 2.8),
      rotate: (i * 45) % 360,
      opacity: 0.15 + (i % 4) * 0.08,
      driftX: ((i % 2 === 0 ? 1 : -1) * (20 + (i % 4) * 15)),
    }));
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="absolute animate-leaf will-change-transform"
          style={{
            left: `${leaf.left}%`,
            bottom: `-${leaf.size + 10}px`,
            width: `${leaf.size}px`,
            height: `${leaf.size * 1.4}px`,
            animationDuration: `${leaf.duration}s`,
            animationDelay: `${leaf.delay}s`,
            opacity: leaf.opacity,
          }}
        >
          <svg
            viewBox="0 0 24 32"
            fill="none"
            className="w-full h-full text-emerald-500/40 drop-shadow-[0_0_8px_rgba(16,185,129,0.15)]"
          >
            {/* Elegant agricultural tea/crop leaf silhouette with central vein */}
            <path
              d="M12 2 C18 10 22 20 12 30 C2 20 6 10 12 2 Z"
              fill="currentColor"
              stroke="rgba(52, 211, 153, 0.4)"
              strokeWidth="0.8"
            />
            <path
              d="M12 4 L12 28"
              stroke="rgba(16, 185, 129, 0.6)"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
            <path
              d="M12 11 Q16 13 18 16"
              stroke="rgba(16, 185, 129, 0.4)"
              strokeWidth="0.6"
            />
            <path
              d="M12 18 Q7 20 5 23"
              stroke="rgba(16, 185, 129, 0.4)"
              strokeWidth="0.6"
            />
          </svg>
        </div>
      ))}

      {/* Atmospheric subtle radial glow gradients for depth */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-950/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-emerald-900/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-96 bg-[#0c2414]/30 rounded-full blur-[180px] pointer-events-none" />
    </div>
  );
};

import { useMemo } from 'react';

interface Particle {
  x: string;
  y: string;
  duration: string;
  delay: string;
  color: 'cyan' | 'magenta';
}

const PARTICLE_COUNT = 15;

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: `${Math.random() * 100}vw`,
    y: `${Math.random() * 100}vh`,
    duration: `${8 + Math.random() * 12}s`,
    delay: `${Math.random() * 8}s`,
    color: Math.random() > 0.6 ? 'magenta' : 'cyan',
  }));
}

export default function HolographicParticles() {
  const particles = useMemo(() => generateParticles(PARTICLE_COUNT), []);

  return (
    <div className="particle-layer" aria-hidden="true">
      {particles.map((p, i) => (
        <div
          key={i}
          className={`core-node ${p.color}`}
          style={{
            '--x': p.x,
            '--y': p.y,
            '--duration': p.duration,
            '--delay': p.delay,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

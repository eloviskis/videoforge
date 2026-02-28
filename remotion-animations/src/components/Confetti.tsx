import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

export interface ConfettiProps {
  count?: number;
  colors?: string[];
  startFrame?: number;
  endFrame?: number;
  speed?: number;
}

// Deterministic pseudo-random
const seeded = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const Confetti: React.FC<ConfettiProps> = ({
  count = 40,
  colors = ['#FF0000', '#FFD700', '#00CC00', '#0066FF', '#FF69B4', '#FF8C00', '#9933FF', '#00CED1'],
  startFrame = 0,
  endFrame = 9999,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame > endFrame) return null;

  const duration = endFrame - startFrame;
  const t = frame - startFrame;

  const particles = [];
  for (let i = 0; i < count; i++) {
    const r1 = seeded(i * 7 + 1);
    const r2 = seeded(i * 13 + 2);
    const r3 = seeded(i * 19 + 3);
    const r4 = seeded(i * 29 + 4);
    const r5 = seeded(i * 37 + 5);
    const r6 = seeded(i * 43 + 6);

    const px = r1 * 1920;
    const delay = r2 * 80;
    const fallSpeed = (1.5 + r3 * 3) * speed;
    const sway = (r4 - 0.5) * 80;
    const rotSpeed = (r5 - 0.5) * 8;
    const color = colors[Math.floor(r6 * colors.length)];
    const size = 6 + r3 * 10;
    const shape = i % 3; // 0=rect, 1=circle, 2=serpentine

    const py = interpolate(
      t,
      [delay, delay + duration * 0.8],
      [-60, 1200],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    ) * fallSpeed * 0.3;

    const swayX = Math.sin((t + delay) * 0.05 + r4 * 10) * sway;
    const rot = (t + delay) * rotSpeed;
    const opacity = interpolate(py, [0, 200, 1000, 1200], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });

    if (py < -60 || py > 1200) continue;

    particles.push(
      <g key={i} transform={`translate(${px + swayX}, ${py}) rotate(${rot})`} opacity={opacity}>
        {shape === 0 && (
          <rect x={-size / 2} y={-size / 4} width={size} height={size / 2} rx={1} fill={color} />
        )}
        {shape === 1 && (
          <circle cx={0} cy={0} r={size / 3} fill={color} />
        )}
        {shape === 2 && (
          <path
            d={`M 0 0 Q ${size / 2} ${size / 3} 0 ${size * 0.7} Q ${-size / 2} ${size} 0 ${size * 1.3}`}
            fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
          />
        )}
      </g>
    );
  }

  return <g>{particles}</g>;
};

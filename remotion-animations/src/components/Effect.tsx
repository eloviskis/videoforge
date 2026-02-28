import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

export interface EffectProps {
  type: 'speedLines' | 'impactStar' | 'dustCloud' | 'speechBubble' | 'thoughtBubble' | 'sweatDrop' | 'questionMark' | 'exclamation' | 'lightbulb' | 'heart' | 'musicNote' | 'star' | 'zzz' | 'anger';
  x: number;
  y: number;
  scale?: number;
  text?: string;
  direction?: 'left' | 'right';
  startFrame?: number;
  endFrame?: number;
}

const seeded = (seed: number) => {
  const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export const Effect: React.FC<EffectProps> = ({
  type,
  x,
  y,
  scale = 1,
  text,
  direction = 'left',
  startFrame = 0,
  endFrame = 9999,
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame > endFrame) return null;

  const t = frame - startFrame;
  const dur = endFrame - startFrame;
  const bob = Math.sin(t * 0.12) * 4;

  // Fade in/out
  const opacity = interpolate(t, [0, 8, Math.max(dur - 10, 9), dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const content = (() => {
    switch (type) {
      case 'speedLines': {
        const dir = direction === 'right' ? 1 : -1;
        const lines = [];
        for (let i = 0; i < 7; i++) {
          const ly = -36 + i * 12;
          const lw = 25 + seeded(i) * 40;
          const lx = dir > 0 ? -lw - 8 : 8;
          const op = 0.25 + seeded(i + 10) * 0.45;
          lines.push(
            <line key={i} x1={lx + Math.sin(t * 0.1 + i) * 3} y1={ly} x2={lx + lw} y2={ly}
              stroke="#000" strokeWidth={2} strokeLinecap="round" opacity={op} />
          );
        }
        return <>{lines}</>;
      }

      case 'impactStar': {
        const pulse = 1 + Math.sin(t * 0.3) * 0.15;
        const rays = [];
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const inner = 4;
          const outer = (14 + seeded(i) * 16) * pulse;
          rays.push(
            <line key={i}
              x1={Math.cos(angle) * inner} y1={Math.sin(angle) * inner}
              x2={Math.cos(angle) * outer} y2={Math.sin(angle) * outer}
              stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
          );
        }
        return <>{rays}</>;
      }

      case 'dustCloud': {
        const puffs = [];
        for (let i = 0; i < 5; i++) {
          const cx = (seeded(i) - 0.5) * 40;
          const cy = (seeded(i + 5) - 0.5) * 20;
          const r = 5 + seeded(i + 10) * 9;
          const drift = t * (0.3 + seeded(i + 15) * 0.4);
          const fadeOp = Math.max(0, 1 - t / 40);
          puffs.push(
            <circle key={i} cx={cx + drift * (seeded(i) > 0.5 ? 1 : -1)} cy={cy - drift * 0.3} r={r}
              fill="#CCC" stroke="#AAA" strokeWidth={1} opacity={fadeOp * 0.6} />
          );
        }
        return <>{puffs}</>;
      }

      case 'speechBubble': {
        const txt = text || '...';
        const w = Math.max(90, txt.length * 11 + 24);
        const h = 44;
        const scIn = interpolate(t, [0, 10], [0.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <g transform={`scale(${scIn})`}>
            <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={12} fill="white" stroke="#000" strokeWidth={2.5} />
            <polygon points={`-6,${h / 2} 6,${h / 2} -12,${h / 2 + 16}`} fill="white" stroke="#000" strokeWidth={2.5} />
            <line x1={-7} y1={h / 2} x2={7} y2={h / 2} stroke="white" strokeWidth={3} />
            <text x={0} y={5} fontSize={16} fill="#000" fontFamily="Arial" textAnchor="middle" fontWeight="bold">{txt}</text>
          </g>
        );
      }

      case 'thoughtBubble': {
        const txt = text || '...';
        const w = Math.max(90, txt.length * 11 + 24);
        const h = 44;
        const scIn = interpolate(t, [0, 10], [0.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <g transform={`scale(${scIn})`}>
            <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={16} fill="white" stroke="#000" strokeWidth={2.5} />
            <circle cx={-8} cy={h / 2 + 9} r={4.5} fill="white" stroke="#000" strokeWidth={2} />
            <circle cx={-15} cy={h / 2 + 18} r={2.5} fill="white" stroke="#000" strokeWidth={1.5} />
            <text x={0} y={5} fontSize={16} fill="#000" fontFamily="Arial" textAnchor="middle">{txt}</text>
          </g>
        );
      }

      case 'questionMark':
        return <text x={0} y={bob} fontSize={32} fontWeight="bold" fill="#000" fontFamily="Arial" textAnchor="middle">?</text>;

      case 'exclamation':
        return <text x={0} y={bob} fontSize={32} fontWeight="bold" fill="#000" fontFamily="Arial" textAnchor="middle">!</text>;

      case 'sweatDrop':
        return <ellipse cx={0} cy={bob} rx={4} ry={7} fill="#5BA3D9" opacity={0.8} />;

      case 'lightbulb':
        return (
          <g transform={`translate(0, ${bob})`}>
            <circle cx={0} cy={0} r={12} fill="#FFF176" stroke="#F5C400" strokeWidth={2} />
            <line x1={0} y1={12} x2={0} y2={17} stroke="#333" strokeWidth={2} />
            <line x1={-3} y1={17} x2={3} y2={17} stroke="#333" strokeWidth={1.5} />
          </g>
        );

      case 'heart':
        return <text x={0} y={bob + 6} fontSize={26} fill="#E53935" fontFamily="Arial" textAnchor="middle">{'\u2764'}</text>;

      case 'musicNote':
        return (<>
          <text x={0} y={bob} fontSize={24} fill="#000" opacity={0.7} fontFamily="Arial">{'\u266A'}</text>
          <text x={18} y={bob - 8} fontSize={18} fill="#000" opacity={0.5} fontFamily="Arial">{'\u266B'}</text>
        </>);

      case 'star':
        return (<>
          <text x={0} y={bob} fontSize={22} fill="#FFC107" fontFamily="Arial">{'\u2605'}</text>
          <text x={18} y={bob - 8} fontSize={15} fill="#FFC107" opacity={0.7} fontFamily="Arial">{'\u2605'}</text>
        </>);

      case 'zzz':
        return (<>
          <text x={0} y={bob + 4} fontSize={15} fontWeight="bold" fill="#000" opacity={0.4} fontFamily="Arial">z</text>
          <text x={12} y={bob - 4} fontSize={19} fontWeight="bold" fill="#000" opacity={0.55} fontFamily="Arial">Z</text>
          <text x={26} y={bob - 14} fontSize={24} fontWeight="bold" fill="#000" opacity={0.7} fontFamily="Arial">Z</text>
        </>);

      case 'anger':
        return (
          <g>
            <line x1={-5} y1={-5 + bob} x2={5} y2={5 + bob} stroke="#D32F2F" strokeWidth={3} strokeLinecap="round" />
            <line x1={5} y1={-5 + bob} x2={-5} y2={5 + bob} stroke="#D32F2F" strokeWidth={3} strokeLinecap="round" />
          </g>
        );

      default: return null;
    }
  })();

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={opacity}>
      {content}
    </g>
  );
};

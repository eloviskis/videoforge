import React from 'react';
import { useCurrentFrame } from 'remotion';

export interface StickFigureProps {
  x: number;
  y: number;
  scale?: number;
  animation?: 'idle' | 'walk' | 'run' | 'jump' | 'wave' | 'dance' | 'celebrate' | 'think' | 'talk' | 'sit' | 'fall' | 'facepalm' | 'point' | 'shrug' | 'kick' | 'static';
  expression?: 'happy' | 'sad' | 'confused' | 'surprised' | 'angry' | 'neutral' | 'excited' | 'thinking' | 'sleeping';
  symbol?: 'questionMark' | 'exclamation' | 'sweatDrop' | 'lightbulb' | 'heart' | 'star' | 'musicNote' | 'zzz' | 'anger' | 'none';
  facing?: 'left' | 'right';
  startFrame?: number;
  endFrame?: number;
}

export const StickFigure: React.FC<StickFigureProps> = ({
  x,
  y,
  scale = 1,
  animation = 'idle',
  expression = 'neutral',
  symbol = 'none',
  facing = 'right',
  startFrame = 0,
  endFrame = 9999,
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame > endFrame) return null;

  const t = frame - startFrame;
  const s1 = Math.sin(t * 0.12);
  const s2 = Math.sin(t * 0.18);
  const s3 = Math.sin(t * 0.25);
  const abs2 = Math.abs(s2);
  const abs3 = Math.abs(s3);

  // --- Geometry constants ---
  const headCY = -58;
  const headR = 22;
  const shoulderY = -32;
  const hipY = 18;
  const armLen = 40;
  const legLen = 48;
  const feetY = hipY + legLen;
  const sw = 4;
  const headSW = 3.5;

  // --- Pose state ---
  let bodyDY = 0;
  let bodyTilt = 0;
  let headTilt = 0;
  let sX = 1, sY = 1; // squash-and-stretch

  let laDX = -14, laDY = armLen;
  let raDX = 14, raDY = armLen;
  let llDX = -11, llDY = legLen;
  let rlDX = 11, rlDY = legLen;

  // --- Expression body offsets (posture) ---
  if (expression === 'sad') bodyTilt += -2;
  if (expression === 'confused') headTilt += 8;
  if (expression === 'surprised') bodyTilt += -3;
  if (expression === 'angry') bodyTilt += 4;
  if (expression === 'thinking') headTilt += -6;

  // --- Animation ---
  switch (animation) {
    case 'walk':
      bodyDY = abs2 * 4;
      laDX = -14 + s2 * 16; laDY = 30 + abs2 * 4;
      raDX = 14 - s2 * 16; raDY = 30 + abs2 * 4;
      llDX = -11 - s2 * 13; rlDX = 11 + s2 * 13;
      break;

    case 'run':
      bodyDY = abs3 * 7;
      bodyTilt += 10;
      laDX = -18 + s3 * 26; laDY = 16;
      raDX = 18 - s3 * 26; raDY = 16;
      llDX = -13 - s3 * 20; llDY = legLen - 3;
      rlDX = 13 + s3 * 20; rlDY = legLen - 3;
      break;

    case 'jump': {
      const cycle = (t % 80) / 80;
      if (cycle < 0.15) {
        const p = cycle / 0.15;
        bodyDY = p * 14;
        sY = 1 - p * 0.15; sX = 1 + p * 0.08;
        llDX = -15; llDY = legLen - 8;
        rlDX = 15; rlDY = legLen - 8;
      } else if (cycle < 0.55) {
        const p = (cycle - 0.15) / 0.4;
        bodyDY = -Math.sin(p * Math.PI) * 55;
        sY = 1 + Math.sin(p * Math.PI) * 0.08;
        sX = 1 - Math.sin(p * Math.PI) * 0.04;
        laDX = -24; laDY = -18;
        raDX = 24; raDY = -18;
        llDY = legLen + 5; rlDY = legLen + 5;
      } else if (cycle < 0.75) {
        const p = (cycle - 0.55) / 0.2;
        bodyDY = 10 * (1 - p);
        sY = 1 - 0.12 * (1 - p); sX = 1 + 0.06 * (1 - p);
        llDX = -15; llDY = legLen - 5;
        rlDX = 15; rlDY = legLen - 5;
      }
      break;
    }

    case 'wave':
      raDX = 28 + s3 * 10; raDY = -30 + s3 * 6;
      bodyDY = s1 * 1.5;
      break;

    case 'dance':
      bodyDY = abs3 * 11;
      bodyTilt += s2 * 9;
      laDX = -22 + s3 * 20; laDY = -10 + s2 * 16;
      raDX = 22 - s3 * 20; raDY = -10 - s2 * 16;
      llDX = -13 + s2 * 11; rlDX = 13 - s2 * 11;
      break;

    case 'celebrate':
      bodyDY = abs3 * 12;
      laDX = -24 + s3 * 7; laDY = -32;
      raDX = 24 - s3 * 7; raDY = -32;
      break;

    case 'think':
      raDX = 8; raDY = -22;
      headTilt += -6;
      bodyTilt += -3;
      break;

    case 'talk':
      bodyDY = s1 * 2;
      raDX = 26 + s3 * 10; raDY = 10 + s2 * 10;
      laDX = -16; laDY = 34;
      break;

    case 'sit':
      bodyDY = 20;
      llDX = -17; llDY = 18;
      rlDX = 17; rlDY = 18;
      laDY = 32; raDY = 32;
      break;

    case 'fall': {
      const fp = Math.min(t / 25, 1);
      bodyTilt += fp * 72;
      bodyDY = fp * 28;
      laDX = -30; laDY = -14;
      raDX = 30; raDY = -14;
      break;
    }

    case 'facepalm':
      raDX = 6; raDY = -22;
      headTilt += -5;
      bodyTilt += -3;
      break;

    case 'point':
      raDX = 44; raDY = -10;
      bodyTilt += 3;
      break;

    case 'shrug':
      laDX = -26; laDY = -8 + s2 * 4;
      raDX = 26; raDY = -8 + s2 * 4;
      bodyDY = s1 * 2;
      break;

    case 'kick': {
      const kp = (t % 40) / 40;
      if (kp < 0.3) {
        // wind-up
      } else if (kp < 0.6) {
        const p = (kp - 0.3) / 0.3;
        rlDX = 11 + p * 32; rlDY = legLen - p * 22;
        bodyTilt += p * 5;
      } else {
        const p = (kp - 0.6) / 0.4;
        rlDX = 43 - p * 32; rlDY = legLen - 22 + p * 22;
        bodyTilt += 5 * (1 - p);
      }
      break;
    }

    case 'static':
    case 'idle':
    default:
      bodyDY = s1 * 1.5;
      laDY = armLen + s1 * 2;
      raDY = armLen + s1 * 2;
      break;
  }

  const flipX = facing === 'left' ? -1 : 1;

  // ========== FACE ==========
  const renderFace = () => {
    const ey = headCY - 4;
    const my = headCY + 10;
    const elx = -8, erx = 8;

    switch (expression) {
      case 'happy':
        return (<>
          <circle cx={elx} cy={ey} r={2.5} fill="#000" />
          <circle cx={erx} cy={ey} r={2.5} fill="#000" />
          <path d={`M -8 ${my} Q 0 ${my + 9} 8 ${my}`} fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
        </>);

      case 'sad':
        return (<>
          <circle cx={elx} cy={ey} r={2.5} fill="#000" />
          <circle cx={erx} cy={ey} r={2.5} fill="#000" />
          <path d={`M -7 ${my + 4} Q 0 ${my - 3} 7 ${my + 4}`} fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
          <ellipse cx={erx + 3} cy={ey + 6} rx={1.5} ry={3} fill="#5BA3D9" opacity={0.7} />
        </>);

      case 'confused':
        return (<>
          <line x1={elx - 4} y1={ey - 7} x2={elx + 4} y2={ey - 5} stroke="#000" strokeWidth={2} strokeLinecap="round" />
          <line x1={erx - 3} y1={ey - 4} x2={erx + 4} y2={ey - 8} stroke="#000" strokeWidth={2} strokeLinecap="round" />
          <circle cx={elx} cy={ey} r={2.5} fill="#000" />
          <circle cx={erx} cy={ey} r={2.5} fill="#000" />
          <path d={`M -5 ${my} Q -2 ${my + 3} 0 ${my} Q 2 ${my - 3} 5 ${my + 1}`} fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
        </>);

      case 'surprised':
        return (<>
          <circle cx={elx} cy={ey} r={5} fill="white" stroke="#000" strokeWidth={2} />
          <circle cx={elx} cy={ey} r={1.8} fill="#000" />
          <circle cx={erx} cy={ey} r={5} fill="white" stroke="#000" strokeWidth={2} />
          <circle cx={erx} cy={ey} r={1.8} fill="#000" />
          <ellipse cx={0} cy={my + 2} rx={4.5} ry={6.5} fill="white" stroke="#000" strokeWidth={2} />
        </>);

      case 'angry':
        return (<>
          <line x1={elx - 4} y1={ey - 4} x2={elx + 4} y2={ey - 8} stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={erx - 4} y1={ey - 8} x2={erx + 4} y2={ey - 4} stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
          <circle cx={elx} cy={ey} r={2.5} fill="#000" />
          <circle cx={erx} cy={ey} r={2.5} fill="#000" />
          <line x1={-6} y1={my + 1} x2={6} y2={my + 1} stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
        </>);

      case 'excited':
        return (<>
          <path d={`M ${elx - 4} ${ey - 2} Q ${elx} ${ey + 5} ${elx + 4} ${ey - 2}`} fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
          <path d={`M ${erx - 4} ${ey - 2} Q ${erx} ${ey + 5} ${erx + 4} ${ey - 2}`} fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" />
          <path d={`M -9 ${my} Q 0 ${my + 11} 9 ${my}`} fill="white" stroke="#000" strokeWidth={2} strokeLinecap="round" />
        </>);

      case 'thinking':
        return (<>
          <circle cx={elx} cy={ey - 3} r={2.5} fill="#000" />
          <circle cx={erx} cy={ey - 3} r={2.5} fill="#000" />
          <circle cx={3} cy={my + 1} r={2.5} fill="none" stroke="#000" strokeWidth={2} />
        </>);

      case 'sleeping':
        return (<>
          <line x1={elx - 4} y1={ey} x2={elx + 4} y2={ey} stroke="#000" strokeWidth={2} strokeLinecap="round" />
          <line x1={erx - 4} y1={ey} x2={erx + 4} y2={ey} stroke="#000" strokeWidth={2} strokeLinecap="round" />
          <path d={`M -4 ${my + 1} Q 0 ${my + 4} 4 ${my + 1}`} fill="none" stroke="#000" strokeWidth={1.5} strokeLinecap="round" />
        </>);

      default: // neutral
        return (<>
          <circle cx={elx} cy={ey} r={2.5} fill="#000" />
          <circle cx={erx} cy={ey} r={2.5} fill="#000" />
          <line x1={-6} y1={my + 1} x2={6} y2={my + 1} stroke="#000" strokeWidth={2} strokeLinecap="round" />
        </>);
    }
  };

  // ========== SYMBOL ==========
  const renderSymbol = () => {
    const symY = headCY - headR - 10;
    const bob = Math.sin(t * 0.12) * 4;

    switch (symbol) {
      case 'questionMark':
        return <text x={0} y={symY + bob} fontSize={28} fontWeight="bold" fill="#000" fontFamily="Arial" textAnchor="middle">?</text>;
      case 'exclamation':
        return <text x={0} y={symY + bob} fontSize={28} fontWeight="bold" fill="#000" fontFamily="Arial" textAnchor="middle">!</text>;
      case 'sweatDrop':
        return <ellipse cx={headR + 5} cy={headCY - 2 + bob} rx={3} ry={5.5} fill="#5BA3D9" opacity={0.8} />;
      case 'lightbulb':
        return (
          <g transform={`translate(0, ${symY + bob - 10})`}>
            <circle cx={0} cy={0} r={10} fill="#FFF176" stroke="#F5C400" strokeWidth={2} />
            <line x1={0} y1={10} x2={0} y2={14} stroke="#333" strokeWidth={2} />
            <line x1={-3} y1={14} x2={3} y2={14} stroke="#333" strokeWidth={1.5} />
          </g>
        );
      case 'heart':
        return <text x={0} y={symY + bob} fontSize={22} fill="#E53935" fontFamily="Arial" textAnchor="middle">{'\u2764'}</text>;
      case 'star':
        return (<>
          <text x={-12} y={symY + bob + 2} fontSize={16} fill="#FFC107" fontFamily="Arial">{'\u2605'}</text>
          <text x={12} y={symY + bob - 5} fontSize={12} fill="#FFC107" fontFamily="Arial">{'\u2605'}</text>
        </>);
      case 'musicNote':
        return (<>
          <text x={-8} y={symY + bob} fontSize={20} fill="#000" opacity={0.7} fontFamily="Arial">{'\u266A'}</text>
          <text x={12} y={symY + bob - 6} fontSize={16} fill="#000" opacity={0.5} fontFamily="Arial">{'\u266B'}</text>
        </>);
      case 'zzz':
        return (<>
          <text x={14} y={symY + bob + 6} fontSize={14} fontWeight="bold" fill="#000" opacity={0.4} fontFamily="Arial">z</text>
          <text x={24} y={symY + bob - 2} fontSize={18} fontWeight="bold" fill="#000" opacity={0.55} fontFamily="Arial">Z</text>
          <text x={36} y={symY + bob - 12} fontSize={22} fontWeight="bold" fill="#000" opacity={0.7} fontFamily="Arial">Z</text>
        </>);
      case 'anger':
        return (
          <g transform={`translate(${headR - 3}, ${headCY - headR + 4})`}>
            <line x1={0} y1={-4} x2={0} y2={4} stroke="#D32F2F" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={-4} y1={0} x2={4} y2={0} stroke="#D32F2F" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        );
      default: return null;
    }
  };

  // ========== RENDER ==========
  return (
    <g transform={`translate(${x}, ${y + bodyDY}) scale(${flipX * scale}, ${scale})`}>
      <g transform={`rotate(${bodyTilt})`}>
        {/* Shadow */}
        <ellipse cx={0} cy={feetY + 3} rx={18} ry={4} fill="rgba(0,0,0,0.08)" />

        {/* Squash-and-stretch from feet anchor */}
        <g transform={sX !== 1 || sY !== 1 ? `translate(0,${feetY}) scale(${sX},${sY}) translate(0,${-feetY})` : undefined}>
          {/* Legs */}
          <line x1={0} y1={hipY} x2={llDX} y2={hipY + llDY} stroke="#000" strokeWidth={sw} strokeLinecap="round" />
          <line x1={0} y1={hipY} x2={rlDX} y2={hipY + rlDY} stroke="#000" strokeWidth={sw} strokeLinecap="round" />

          {/* Body */}
          <line x1={0} y1={shoulderY} x2={0} y2={hipY} stroke="#000" strokeWidth={sw + 0.5} strokeLinecap="round" />

          {/* Arms */}
          <line x1={0} y1={shoulderY} x2={laDX} y2={shoulderY + laDY} stroke="#000" strokeWidth={sw} strokeLinecap="round" />
          <line x1={0} y1={shoulderY} x2={raDX} y2={shoulderY + raDY} stroke="#000" strokeWidth={sw} strokeLinecap="round" />

          {/* Head */}
          <g transform={`rotate(${headTilt}, 0, ${headCY})`}>
            <circle cx={0} cy={headCY} r={headR} fill="white" stroke="#000" strokeWidth={headSW} />
            {renderFace()}
          </g>

          {/* Symbol */}
          {symbol !== 'none' && renderSymbol()}
        </g>
      </g>
    </g>
  );
};

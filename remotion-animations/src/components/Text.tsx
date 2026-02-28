import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export interface TextProps {
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fadeIn?: boolean;
  fadeOut?: boolean;
  totalFrames?: number;
  startFrame?: number;
  endFrame?: number;
  opacity?: number;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

export const Text: React.FC<TextProps> = ({
  text,
  x,
  y,
  fontSize = 32,
  color = '#000000',
  fontFamily = "Arial, Helvetica, sans-serif",
  fadeIn = false,
  fadeOut = false,
  totalFrames = 100,
  startFrame = 0,
  endFrame,
  opacity: opacityProp,
  bold = false,
  align = 'center',
}) => {
  const frame = useCurrentFrame();
  const end = endFrame ?? startFrame + totalFrames;
  if (frame < startFrame || frame > end) return null;

  const localFrame = frame - startFrame;
  const dur = end - startFrame;
  let opacity = opacityProp ?? 1;

  if (fadeIn && localFrame < 20) {
    opacity = interpolate(localFrame, [0, 20], [0, opacity], { extrapolateRight: 'clamp' });
  }
  if (fadeOut && localFrame > dur - 20) {
    opacity = interpolate(localFrame, [dur - 20, dur], [opacity, 0], { extrapolateLeft: 'clamp' });
  }

  // Auto-wrap long text
  const maxChars = Math.floor(1600 / (fontSize * 0.55));
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur.length > 0) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) lines.push(cur.trim());

  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';

  return (
    <g opacity={opacity}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x}
          y={y + i * (fontSize * 1.3)}
          fontSize={fontSize}
          fill={color}
          fontFamily={fontFamily}
          fontWeight={bold ? 'bold' : 'normal'}
          textAnchor={anchor}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

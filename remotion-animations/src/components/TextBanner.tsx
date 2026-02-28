import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

export interface TextBannerProps {
  text: string;
  x: number;
  y: number;
  bgColor?: string;
  textColor?: string;
  fontSize?: number;
  padding?: number;
  startFrame?: number;
  endFrame?: number;
}

export const TextBanner: React.FC<TextBannerProps> = ({
  text,
  x,
  y,
  bgColor = '#FF6600',
  textColor = '#FFFFFF',
  fontSize = 42,
  padding = 20,
  startFrame = 0,
  endFrame = 9999,
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame > endFrame) return null;

  const t = frame - startFrame;
  const dur = endFrame - startFrame;

  // Animate scale in
  const scaleIn = interpolate(t, [0, 12], [0.3, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = interpolate(t, [0, 8, dur - 10, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Approximate text width (rough)
  const estWidth = text.length * fontSize * 0.52;
  const boxW = estWidth + padding * 2;
  const boxH = fontSize + padding * 2;

  return (
    <g transform={`translate(${x}, ${y}) scale(${scaleIn})`} opacity={opacity}>
      {/* Shadow */}
      <rect
        x={-boxW / 2 + 4} y={-boxH / 2 + 4}
        width={boxW} height={boxH}
        rx={8} fill="rgba(0,0,0,0.2)"
      />
      {/* Background */}
      <rect
        x={-boxW / 2} y={-boxH / 2}
        width={boxW} height={boxH}
        rx={8} fill={bgColor} stroke="#333" strokeWidth={3}
      />
      {/* Text */}
      <text
        x={0} y={fontSize * 0.35}
        fontSize={fontSize}
        fill={textColor}
        fontFamily="'Arial Black', 'Impact', Arial, sans-serif"
        fontWeight="bold"
        textAnchor="middle"
        stroke="#333" strokeWidth={1}
        paintOrder="stroke"
      >
        {text}
      </text>
    </g>
  );
};

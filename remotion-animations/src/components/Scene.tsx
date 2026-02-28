import React from 'react';
import { AbsoluteFill } from 'remotion';

export interface SceneProps {
  backgroundColor?: string;
  style?: 'whiteboard' | 'blank' | 'ground' | 'sky';
  groundY?: number;
  children: React.ReactNode;
}

export const Scene: React.FC<SceneProps> = ({
  backgroundColor = '#FFFFFF',
  style = 'whiteboard',
  groundY = 850,
  children,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        style={{ position: 'absolute' }}
      >
        {style === 'whiteboard' && (
          <>
            {Array.from({ length: 20 }, (_, i) => (
              <line key={`v${i}`} x1={i * 96 + 48} y1={0} x2={i * 96 + 48} y2={1080} stroke="#ECECEC" strokeWidth={0.5} />
            ))}
            {Array.from({ length: 12 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 90 + 45} x2={1920} y2={i * 90 + 45} stroke="#ECECEC" strokeWidth={0.5} />
            ))}
          </>
        )}

        {style === 'ground' && (
          <line x1={0} y1={groundY} x2={1920} y2={groundY} stroke="#000" strokeWidth={2.5} />
        )}

        {style === 'sky' && (
          <>
            <defs>
              <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E3F2FD" />
                <stop offset="65%" stopColor="#FFFFFF" />
              </linearGradient>
            </defs>
            <rect width="1920" height="1080" fill="url(#skyGrad)" />
            <line x1={0} y1={groundY} x2={1920} y2={groundY} stroke="#555" strokeWidth={2.5} />
          </>
        )}

        {children}
      </svg>
    </AbsoluteFill>
  );
};

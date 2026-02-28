import React from 'react';
import { useCurrentFrame } from 'remotion';

export interface DecorationProps {
  type: 'musicNotes' | 'stars' | 'hearts' | 'sparkles' | 'questionMarks' | 'exclamation' | 'cross' | 'column' | 'scroll';
  x: number;
  y: number;
  scale?: number;
  color?: string;
  animated?: boolean;
}

export const Decoration: React.FC<DecorationProps> = ({
  type,
  x,
  y,
  scale = 1,
  color = '#333333',
  animated = true,
}) => {
  const frame = useCurrentFrame();
  const t = animated ? frame : 0;
  const bob = Math.sin(t * 0.1) * 5;
  const bob2 = Math.sin(t * 0.15 + 1) * 4;

  switch (type) {
    case 'musicNotes':
      return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`}>
          <text x={0} y={bob} fontSize={32} fill={color} opacity={0.8} fontFamily="Arial">♪</text>
          <text x={25} y={-10 + bob2} fontSize={24} fill={color} opacity={0.6} fontFamily="Arial">♫</text>
          <text x={-15} y={15 + bob} fontSize={20} fill={color} opacity={0.5} fontFamily="Arial">♬</text>
        </g>
      );
    case 'stars':
      return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`}>
          <text x={0} y={bob} fontSize={28} fill="#FFD700" fontFamily="Arial">★</text>
          <text x={20} y={-8 + bob2} fontSize={18} fill="#FFD700" opacity={0.7} fontFamily="Arial">✦</text>
          <text x={-12} y={12 + bob} fontSize={14} fill="#FFD700" opacity={0.5} fontFamily="Arial">★</text>
        </g>
      );
    case 'hearts':
      return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`}>
          <text x={0} y={bob} fontSize={24} fill="#FF1493" fontFamily="Arial">❤</text>
          <text x={18} y={-6 + bob2} fontSize={16} fill="#FF69B4" opacity={0.7} fontFamily="Arial">❤</text>
        </g>
      );
    case 'sparkles':
      return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`}>
          <text x={0} y={bob} fontSize={22} fill="#FFD700" fontFamily="Arial">✨</text>
          <text x={20} y={-5 + bob2} fontSize={16} fill="#FFD700" opacity={0.7} fontFamily="Arial">✨</text>
          <text x={-10} y={15 + bob} fontSize={12} fill="#FFD700" opacity={0.5} fontFamily="Arial">✨</text>
        </g>
      );
    case 'questionMarks':
      return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`}>
          <text x={0} y={bob} fontSize={36} fontWeight="bold" fill="#CC0000" fontFamily="Arial Black, Arial">?</text>
          <text x={22} y={-8 + bob2} fontSize={28} fontWeight="bold" fill="#CC0000" opacity={0.7} fontFamily="Arial Black, Arial">?</text>
        </g>
      );
    case 'exclamation':
      return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`}>
          <text x={0} y={bob} fontSize={36} fontWeight="bold" fill="#FF6600" fontFamily="Arial Black, Arial">!</text>
          <text x={18} y={-5 + bob2} fontSize={28} fontWeight="bold" fill="#FF6600" opacity={0.7} fontFamily="Arial Black, Arial">!</text>
        </g>
      );
    case 'cross':
      return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={0.3}>
          <rect x={-3} y={0} width={6} height={40} fill="#8B7355" stroke="#333" strokeWidth={1} />
          <rect x={-12} y={8} width={24} height={5} fill="#8B7355" stroke="#333" strokeWidth={1} />
        </g>
      );
    case 'column':
      return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={0.25}>
          <rect x={-8} y={0} width={16} height={70} fill="#C0B090" stroke="#333" strokeWidth={1} />
          <rect x={-12} y={-5} width={24} height={8} rx={2} fill="#C0B090" stroke="#333" strokeWidth={1} />
          <rect x={-12} y={67} width={24} height={8} rx={2} fill="#C0B090" stroke="#333" strokeWidth={1} />
          {/* Fluting lines */}
          <line x1={-3} y1={5} x2={-3} y2={65} stroke="#A09070" strokeWidth={0.5} />
          <line x1={3} y1={5} x2={3} y2={65} stroke="#A09070" strokeWidth={0.5} />
        </g>
      );
    case 'scroll':
      return (
        <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={0.3}>
          <rect x={-15} y={0} width={30} height={40} fill="#F5DEB3" stroke="#333" strokeWidth={1.5} rx={2} />
          <ellipse cx={-15} cy={0} rx={5} ry={4} fill="#DEB887" stroke="#333" strokeWidth={1} />
          <ellipse cx={15} cy={0} rx={5} ry={4} fill="#DEB887" stroke="#333" strokeWidth={1} />
          <ellipse cx={-15} cy={40} rx={5} ry={4} fill="#DEB887" stroke="#333" strokeWidth={1} />
          <ellipse cx={15} cy={40} rx={5} ry={4} fill="#DEB887" stroke="#333" strokeWidth={1} />
          <line x1={-8} y1={10} x2={8} y2={10} stroke="#999" strokeWidth={0.8} />
          <line x1={-8} y1={16} x2={8} y2={16} stroke="#999" strokeWidth={0.8} />
          <line x1={-8} y1={22} x2={8} y2={22} stroke="#999" strokeWidth={0.8} />
          <line x1={-8} y1={28} x2={6} y2={28} stroke="#999" strokeWidth={0.8} />
        </g>
      );
    default:
      return null;
  }
};

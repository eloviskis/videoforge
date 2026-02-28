import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';

export const Scene6: React.FC = () => {
  const frame = useCurrentFrame();

  const pathX = interpolate(frame, [50, 350], [200, 1700], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const vegetationOpacity = interpolate(frame, [300, 400], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stickFigureScale = 1.6;
  
  return (
    <Scene style="whiteboard">
      <Text
        text="O tempo enfraquece as memórias."
        x={960} y={90} fontSize={38} bold={true}
        fadeIn={true} totalFrames={425}
        align="center"
      />

      <Text
        text="Conexões neurais se perdem com o tempo."
        x={960} y={150} fontSize={26}
        fadeIn={true} startFrame={20} totalFrames={425}
        align="center"
      />

      {/* Caminho */}
      <svg width="1920" height="1080">
        <path
          d="M200 800 C 400 700, 600 700, 800 800 C 1000 900, 1200 900, 1400 800 C 1600 700, 1700 700, 1700 800"
          stroke="#888"
          strokeWidth="10"
          fill="transparent"
        />
      </svg>

      {/* "Vegetação" cobrindo o caminho */}
      <svg width="1920" height="1080" style={{ opacity: vegetationOpacity }}>
        <path
          d="M200 800 C 400 850, 600 850, 800 800 C 1000 750, 1200 750, 1400 800 C 1600 850, 1700 850, 1700 800"
          stroke="#008000"
          strokeWidth="20"
          fill="transparent"
          strokeLinecap="round"
        />
          <path
          d="M250 780 C 450 830, 650 830, 850 780 C 1050 730, 1250 730, 1450 780 C 1650 830, 1750 830, 1750 780"
          stroke="#006400"
          strokeWidth="15"
          fill="transparent"
          strokeLinecap="round"
        />
      </svg>

      <StickFigure
        x={pathX}
        y={740}
        scale={stickFigureScale}
        animation={frame < 350 ? 'walk' : 'idle'}
        expression={frame < 350 ? 'neutral' : 'thinking'}
        facing="right"
        startFrame={50}
        endFrame={425}
      />

      <Text
        text="?"
        x={pathX + 30}
        y={600}
        fontSize={50}
        fadeIn={true}
        fadeOut={false}
        totalFrames={425}
        startFrame={350}
        endFrame={400}
      />
    </Scene>
  );
};

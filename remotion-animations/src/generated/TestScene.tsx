import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';
import { Effect } from '../components/Effect';

export const TestScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Personagem 1 entra andando da esquerda
  const char1X = interpolate(frame, [0, 50, 80, 250], [100, 550, 550, 550], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const char2Reacts = frame > 55;

  return (
    <Scene style="whiteboard">
      <Text
        text="Teste de Qualidade Visual"
        x={960} y={85} fontSize={40} color="#000" bold={true}
        fadeIn={true} totalFrames={250}
      />

      <Text
        text="Padrao viral stick figure"
        x={960} y={140} fontSize={24} color="#666"
        fadeIn={true} startFrame={15} totalFrames={250}
      />

      {frame < 55 && (
        <Effect type="speedLines" x={char1X - 50} y={720} direction="left" startFrame={0} endFrame={55} />
      )}

      <StickFigure
        x={char1X} y={740} scale={1.5}
        animation={frame < 55 ? 'walk' : frame < 90 ? 'idle' : 'talk'}
        expression={frame < 55 ? 'happy' : frame < 90 ? 'neutral' : 'excited'}
        facing="right"
        startFrame={0} endFrame={250}
      />

      {frame > 95 && (
        <Effect type="speechBubble" text="E ai!" x={550} y={560} startFrame={95} endFrame={180} />
      )}

      <StickFigure
        x={1300} y={740} scale={1.5}
        animation={!char2Reacts ? 'idle' : frame < 100 ? 'idle' : 'wave'}
        expression={!char2Reacts ? 'neutral' : frame < 80 ? 'surprised' : 'happy'}
        symbol={char2Reacts && frame < 85 ? 'exclamation' : 'none'}
        facing="left"
        startFrame={0} endFrame={250}
      />

      {frame > 55 && frame < 75 && (
        <Effect type="impactStar" x={1300} y={620} scale={0.8} startFrame={55} endFrame={75} />
      )}

      {frame > 110 && (
        <Effect type="thoughtBubble" text="Que legal!" x={1300} y={560} startFrame={110} endFrame={200} />
      )}

      {frame > 140 && (
        <StickFigure
          x={960} y={740} scale={1.3}
          animation="jump"
          expression="excited"
          symbol="star"
          startFrame={140} endFrame={250}
        />
      )}

      {frame > 145 && frame < 165 && (
        <Effect type="dustCloud" x={960} y={800} startFrame={145} endFrame={165} />
      )}
    </Scene>
  );
};

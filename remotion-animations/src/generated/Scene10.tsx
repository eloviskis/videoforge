import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';

export const Scene10: React.FC = () => {
  const frame = useCurrentFrame();

  const stickFigure1X = interpolate(frame, [0, 100], [200, 600], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stickFigure2X = interpolate(frame, [100, 200], [1200, 900], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stickFigure1Animation = frame < 100 ? 'walk' : 'idle';
  const stickFigure2Animation = frame >= 100 && frame < 200 ? 'think' : 'idle';
  const stickFigure2Expression = frame >= 100 && frame < 200 ? 'thinking' : 'neutral';

  const stickFigure1Scale = 1.5;
  const stickFigure2Scale = 1.5;

  return (
    <Scene style="whiteboard">
      <Text
        text="O esquecimento, portanto..."
        x={960}
        y={90}
        fontSize={38}
        bold={true}
        fadeIn={true}
        totalFrames={400}
      />

      <Text
        text="...é um fenômeno natural e multifacetado."
        x={960}
        y={150}
        fontSize={26}
        fadeIn={true}
        startFrame={20}
        totalFrames={400}
      />

      <StickFigure
        x={stickFigure1X}
        y={740}
        scale={stickFigure1Scale}
        animation={stickFigure1Animation}
        expression="happy"
        facing="right"
        startFrame={0}
        endFrame={400}
      />

      <StickFigure
        x={stickFigure2X}
        y={740}
        scale={stickFigure2Scale}
        animation={stickFigure2Animation}
        expression={stickFigure2Expression}
        symbol={frame >= 120 && frame < 180 ? 'questionMark' : 'none'}
        facing="left"
        startFrame={0}
        endFrame={400}
      />

      <Text
        text="Entender seus mecanismos..."
        x={960}
        y={210}
        fontSize={26}
        fadeIn={true}
        startFrame={50}
        totalFrames={400}
      />

      <Text
        text="...nos permite proteger nossa memória..."
        x={960}
        y={270}
        fontSize={26}
        fadeIn={true}
        startFrame={100}
        totalFrames={400}
      />

      <Text
        text="...e aproveitar essa incrível capacidade!"
        x={960}
        y={330}
        fontSize={26}
        fadeIn={true}
        startFrame={150}
        totalFrames={400}
      />

       <Text
        text="Um cérebro bem cuidado..."
        x={960}
        y={390}
        fontSize={26}
        fadeIn={true}
        startFrame={200}
        totalFrames={400}
      />
      
       <Text
        text="...é a chave para uma vida repleta de lembranças."
        x={960}
        y={450}
        fontSize={26}
        fadeIn={true}
        startFrame={250}
        totalFrames={400}
      />

      <Text
        text="Lembre-se!"
        x={960}
        y={510}
        fontSize={32}
        bold={true}
        fadeIn={true}
        startFrame={300}
        totalFrames={400}
      />

      {frame > 300 && (
        <StickFigure
          x={1500}
          y={740}
          scale={1.5}
          animation="celebrate"
          expression="excited"
          symbol="exclamation"
          facing="left"
          startFrame={300}
          endFrame={400}
        />
      )}
       {frame > 300 && (
        <StickFigure
          x={300}
          y={740}
          scale={1.5}
          animation="dance"
          expression="happy"
          symbol="heart"
          facing="right"
          startFrame={300}
          endFrame={400}
        />
      )}
    </Scene>
  );
};

import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();

  const stickFigure1X = 300;
  const stickFigure1Y = 750;
  const stickFigureScale = 1.3;

  const stickFigure2X = interpolate(frame, [100, 300], [1400, 900], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const stickFigure2Animation = frame < 300 ? 'walk' : 'idle';

  return (
    <Scene style="whiteboard">
      <Text
        text="A memória é mais complexa do que imaginamos."
        x={960}
        y={90}
        fontSize={36}
        bold={true}
        align="center"
        fadeIn={true}
        totalFrames={450}
      />

      <Text
        text="Não é um depósito único, mas um sistema intricado."
        x={960}
        y={150}
        fontSize={30}
        align="center"
        fadeIn={true}
        startFrame={30}
        totalFrames={450}
      />

      <Text
        text="Para entender o esquecimento, precisamos entender como a memória funciona."
        x={960}
        y={210}
        fontSize={30}
        align="center"
        fadeIn={true}
        startFrame={60}
        totalFrames={450}
      />

      <StickFigure
        x={stickFigure1X}
        y={stickFigure1Y}
        scale={stickFigureScale}
        animation="think"
        expression="thinking"
        symbol="questionMark"
        facing="right"
        startFrame={0}
        endFrame={150}
      />

      <StickFigure
        x={stickFigure1X}
        y={stickFigure1Y}
        scale={stickFigureScale}
        animation="idle"
        expression="surprised"
        symbol="exclamation"
        facing="right"
        startFrame={151}
        endFrame={250}
      />

       <StickFigure
        x={stickFigure1X}
        y={stickFigure1Y}
        scale={stickFigureScale}
        animation="shrug"
        expression="confused"
        symbol="questionMark"
        facing="right"
        startFrame={251}
        endFrame={450}
      />

      <StickFigure
        x={stickFigure2X}
        y={stickFigure1Y}
        scale={stickFigureScale}
        animation={stickFigure2Animation}
        expression="neutral"
        facing="left"
        startFrame={100}
        endFrame={300}
      />

        <StickFigure
        x={900}
        y={stickFigure1Y}
        scale={stickFigureScale}
        animation="point"
        expression="happy"
        facing="right"
        startFrame={301}
        endFrame={450}
      />
    </Scene>
  );
};

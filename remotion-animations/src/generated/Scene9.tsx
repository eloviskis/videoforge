import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';

export const Scene9: React.FC = () => {
  const frame = useCurrentFrame();

  const textY = 100;

  const char1X = 300;
  const char1Y = 750;
  const charScale = 1.6;

  const char2StartX = 1600;
  const char2EndX = 1200;
  const char2Y = 750;
  const char2Scale = 1.6;

  const char2X = interpolate(frame, [0, 150], [char2StartX, char2EndX], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const char2Animation = frame < 150 ? 'run' : 'idle';
  const char2Facing = 'left';

  const brainX = 960;
  const brainY = 400;
  const brainScale = 0.7;

  const bloodFlowScale = interpolate(frame, [150, 250], [0.1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const neuroplasticityScale = interpolate(frame, [250, 350], [0.1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  return (
    <Scene style="whiteboard">
      <Text
        text="Benefícios dos exercícios para o cérebro"
        x={960}
        y={textY - 40}
        fontSize={32}
        bold={true}
        fadeIn={true}
        totalFrames={375}
      />
      <Text
        text="A prática regular de exercícios físicos também contribui para a saúde cerebral, aumentando o fluxo sanguíneo e estimulando a neuroplasticidade."
        x={960}
        y={textY}
        fontSize={28}
        fadeIn={true}
        totalFrames={375}
      />
      <Text
        text="Um cérebro ativo é um cérebro mais resistente ao esquecimento."
        x={960}
        y={textY + 80}
        fontSize={28}
        fadeIn={true}
        startFrame={200}
        totalFrames={375}
      />

      <StickFigure
        x={char1X}
        y={char1Y}
        scale={charScale}
        animation="idle"
        expression="happy"
        facing="right"
        startFrame={0}
        endFrame={375}
      />

      <StickFigure
        x={char2X}
        y={char2Y}
        scale={char2Scale}
        animation={char2Animation}
        expression="excited"
        facing={char2Facing}
        startFrame={0}
        endFrame={375}
      />

      {frame > 150 && (
        <StickFigure
          x={brainX}
          y={brainY}
          scale={brainScale}
          animation="think"
          expression="thinking"
          symbol="lightbulb"
          facing="right"
          startFrame={150}
          endFrame={375}
        />
      )}
    </Scene>
  );
};

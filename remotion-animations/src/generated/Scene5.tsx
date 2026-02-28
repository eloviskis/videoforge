import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';
import { Effect } from '../components/Effect';

export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();

  const stickFigureX = 400;
  const stickFigureY = 750;
  const stickFigureScale = 1.6;

  const listenerX = 1400;
  const listenerY = 750;
  const listenerScale = 1.6;

  const questionMarkVisible = frame > 200 && frame < 350;

  return (
    <Scene style="whiteboard">
      <Text
        text="Falta de atenção = Falha na codificação"
        x={960} y={90} fontSize={38} bold={true}
        fadeIn={true} totalFrames={400}
        align="center"
      />

      <Text
        text="Quantas vezes você 'ouviu' sem absorver?"
        x={960} y={150} fontSize={26}
        fadeIn={true} startFrame={20} totalFrames={400}
        align="center"
      />

      <StickFigure
        x={stickFigureX} y={stickFigureY} scale={stickFigureScale}
        animation="talk"
        expression="neutral"
        facing="right"
        startFrame={0} endFrame={400}
      />

      <StickFigure
        x={listenerX} y={listenerY} scale={listenerScale}
        animation={frame < 150 ? 'idle' : (frame < 350 ? 'confused' : 'facepalm')}
        expression={frame < 150 ? 'neutral' : (frame < 350 ? 'confused' : 'sad')}
        facing="left"
        startFrame={0} endFrame={400}
      />

      {questionMarkVisible && (
        <Effect
          type="questionMark"
          x={listenerX}
          y={listenerY - 150}
          scale={1.2}
          startFrame={200}
          endFrame={350}
        />
      )}

      {frame > 150 && frame < 200 && (
        <Effect
          type="zzz"
          x={listenerX}
          y={listenerY - 150}
          scale={0.8}
          startFrame={150}
          endFrame={200}
        />
      )}

      {frame > 350 && (
         <Effect
            type="sweatDrop"
            x={listenerX - 50}
            y={listenerY - 50}
            scale={1}
            startFrame={350}
            endFrame={400}
         />
      )}
    </Scene>
  );
};

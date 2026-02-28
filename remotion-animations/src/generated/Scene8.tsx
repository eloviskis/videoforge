import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';
import { Effect } from '../components/Effect';

export const Scene8: React.FC = () => {
  const frame = useCurrentFrame();

  // Stick figure 1 (feliz com as boas notícias)
  const stickFigure1X = 300;
  const stickFigure1Y = 700;
  const stickFigure1Scale = 1.6;

  // Stick figure 2 (pensando em técnicas de memorização)
  const stickFigure2X = 1300;
  const stickFigure2Y = 700;
  const stickFigure2Scale = 1.6;
  const thinkingStartFrame = 150;

  // Text fade-in and fade-out times
  const textFadeInStart = 50;
  const textFadeOutEnd = 400;

  // Animação para o primeiro stick figure celebrar
  const celebrateStartFrame = 50;
  const celebrateEndFrame = 150;

  //Animação para o segundo stick figure pensar
  const thinkingEndFrame = 300;

  return (
    <Scene style="whiteboard">
      <Text
        text="Boas notícias: Podemos melhorar nossa memória!"
        x={960}
        y={90}
        fontSize={38}
        bold={true}
        fadeIn={true}
        startFrame={textFadeInStart}
        endFrame={textFadeOutEnd}
        totalFrames={450}
        align="center"
      />

      <Text
        text="Técnicas de memorização e sono adequado ajudam!"
        x={960}
        y={150}
        fontSize={28}
        fadeIn={true}
        startFrame={textFadeInStart + 30}
        endFrame={textFadeOutEnd}
        totalFrames={450}
        align="center"
      />

      <StickFigure
        x={stickFigure1X}
        y={stickFigure1Y}
        scale={stickFigure1Scale}
        animation={frame >= celebrateStartFrame && frame <= celebrateEndFrame ? 'celebrate' : 'idle'}
        expression="happy"
        facing="right"
        startFrame={0}
        endFrame={450}
      />

      {/* Efeito de estrela para celebrar */}
      {frame >= celebrateStartFrame && frame <= celebrateEndFrame && (
        <Effect
          type="star"
          x={stickFigure1X + 150}
          y={stickFigure1Y - 100}
          scale={0.8}
          startFrame={celebrateStartFrame}
          endFrame={celebrateEndFrame}
        />
      )}

      <StickFigure
        x={stickFigure2X}
        y={stickFigure2Y}
        scale={stickFigure2Scale}
        animation={frame >= thinkingStartFrame && frame <= thinkingEndFrame ? 'think' : 'idle'}
        expression={frame >= thinkingStartFrame && frame <= thinkingEndFrame ? 'thinking' : 'neutral'}
        facing="left"
        startFrame={0}
        endFrame={450}
      />

      {frame >= thinkingStartFrame && frame <= thinkingEndFrame && (
        <Effect
          type="thoughtBubble"
          text="Mnemônicos?"
          x={stickFigure2X - 150}
          y={stickFigure2Y - 200}
          startFrame={thinkingStartFrame}
          endFrame={thinkingEndFrame}
        />
      )}
    </Scene>
  );
};

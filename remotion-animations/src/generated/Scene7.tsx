import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';
import { Effect } from '../components/Effect';

export const Scene7: React.FC = () => {
  const frame = useCurrentFrame();

  const forgettingTypesY = 100;

  // Esquecimento Transitório
  const transientForgetX = 300;
  const transientForgetY = 700;

  const transientAnim = frame < 120 ? 'think' : 'facepalm';
  const transientSymbol = frame < 120 ? 'questionMark' : 'none';
  const transientExpression = frame < 120 ? 'thinking' : 'confused';

  // Esquecimento Permanente
  const permanentForgetX = 960;
  const permanentForgetY = 700;

  const permanentAnim = frame < 280 ? 'idle' : 'fall';
  const permanentSymbol = frame < 280 ? 'none' : 'zzz';
  const permanentExpression = frame < 280 ? 'neutral' : 'sleeping';

  // Esquecimento Motivado
  const motivatedForgetX = 1620;
  const motivatedForgetY = 700;

  const motivatedAnim = frame < 400 ? 'idle' : 'shrug';
  const motivatedSymbol = frame < 400 ? 'none' : 'sweatDrop';
  const motivatedExpression = frame < 400 ? 'neutral' : 'confused';

  return (
    <Scene style="whiteboard">
      <Text
        text="Tipos de Esquecimento"
        x={960} y={forgettingTypesY} fontSize={48} bold={true}
        fadeIn={true} totalFrames={500}
        align="center"
      />

      <Text
        text="Esquecimento Transitório"
        x={transientForgetX} y={500} fontSize={32} bold={true}
        fadeIn={true} startFrame={20} endFrame={150}
        align="center"
      />

      <StickFigure
        x={transientForgetX} y={transientForgetY} scale={1.3}
        animation={transientAnim}
        expression={transientExpression}
        symbol={transientSymbol}
        facing="right"
        startFrame={0} endFrame={180}
      />

      <Text
        text="Esquecimento Permanente"
        x={permanentForgetX} y={500} fontSize={32} bold={true}
        fadeIn={true} startFrame={160} endFrame={300}
        align="center"
      />

      <StickFigure
        x={permanentForgetX} y={permanentForgetY} scale={1.3}
        animation={permanentAnim}
        expression={permanentExpression}
        symbol={permanentSymbol}
        facing="right"
        startFrame={140} endFrame={320}
      />

      <Text
        text="Esquecimento Motivado"
        x={motivatedForgetX} y={500} fontSize={32} bold={true}
        fadeIn={true} startFrame={300} endFrame={450}
        align="center"
      />

      <StickFigure
        x={motivatedForgetX} y={motivatedForgetY} scale={1.3}
        animation={motivatedAnim}
        expression={motivatedExpression}
        symbol={motivatedSymbol}
        facing="right"
        startFrame={280} endFrame={500}
      />

      {frame > 100 && frame < 130 && <Effect type="questionMark" x={transientForgetX + 50} y={transientForgetY - 150} scale={0.7} startFrame={100} endFrame={130} />}
      {frame > 280 && frame < 310 && <Effect type="zzz" x={permanentForgetX + 50} y={permanentForgetY - 100} scale={0.7} startFrame={280} endFrame={310} />}
      {frame > 380 && frame < 410 && <Effect type="sweatDrop" x={motivatedForgetX + 50} y={motivatedForgetY - 150} scale={0.7} startFrame={380} endFrame={410} />}
    </Scene>
  );
};

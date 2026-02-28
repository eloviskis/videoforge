import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';
import { Effect } from '../components/Effect';

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();

  // Personagem 1: Entrando no cômodo e pensando
  const char1X = interpolate(frame, [0, 50, 100], [100, 300, 300], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const thinking = frame >= 100 && frame < 200;

  // Personagem 2: Tentando lembrar um nome
  const char2X = 1300;
  const char2Thinking = frame >= 220 && frame < 320;

  return (
    <Scene style="whiteboard">
      <Text
        text="Por que esquecemos as coisas?"
        x={960} y={90} fontSize={38} bold={true} align="center"
        fadeIn={true} totalFrames={375}
      />

      <Text
        text="Vamos desvendar os mistérios do esquecimento!"
        x={960} y={150} fontSize={26} align="center"
        fadeIn={true} startFrame={20} totalFrames={375}
      />

      {/* Personagem 1 entrando no cômodo */}
      <StickFigure
        x={char1X} y={740} scale={1.5}
        animation={frame < 50 ? 'walk' : 'idle'}
        expression={thinking ? 'thinking' : 'neutral'}
        facing="right"
        startFrame={0} endFrame={375}
        symbol={thinking ? 'questionMark' : 'none'}
      />

      {/* Efeito de interrogação para o personagem 1 */}
      {thinking && (
        <Effect type="questionMark" x={char1X} y={600} scale={0.8} startFrame={100} endFrame={200} />
      )}

      {/* Personagem 2 pensando em um nome */}
      <StickFigure
        x={char2X} y={740} scale={1.5}
        animation={'idle'}
        expression={char2Thinking ? 'thinking' : 'facepalm'}
        symbol={char2Thinking ? 'questionMark' : 'sweatDrop'}
        facing="left"
        startFrame={0} endFrame={375}
      />
       {/* Efeito de interrogação para o personagem 2 */}
       {char2Thinking && (
        <Effect type="questionMark" x={char2X} y={600} scale={0.8} startFrame={220} endFrame={320} />
      )}

      {/* Texto sobre o esquecimento ao longo da cena*/}
      <Text
        text="Já entrou em um cômodo e esqueceu o que ia fazer?"
        x={960} y={250} fontSize={28} align="center"
        fadeIn={true} startFrame={0} endFrame={125}
      />

      <Text
        text="Ou tentou lembrar o nome de alguém que acabou de conhecer?"
        x={960} y={300} fontSize={28} align="center"
        startFrame={125} endFrame={250}
      />

      <Text
        text="Calma, isso acontece com todo mundo!"
        x={960} y={350} fontSize={28} align="center"
        startFrame={250} endFrame={375}
      />
    </Scene>
  );
};

import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';
import { Effect } from '../components/Effect';

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();

  // Etapa 1: Codificação - Personagem "arquivando" um documento
  const codingX = 300;
  const codingY = 750;

  // Etapa 2: Armazenamento - Personagem colocando em uma estante
  const storageX = 960;
  const storageY = 750;

  // Etapa 3: Recuperação - Personagem procurando o documento
  const retrievalX = 1620;
  const retrievalY = 750;

  // Animação do personagem "codificando"
  const codingAnimation = frame < 150 ? 'think' : 'idle';
  const codingSymbol = frame > 100 && frame < 150 ? 'questionMark' : 'none';

  // Animação do personagem "armazenando"
  const storageAnimation = frame > 150 && frame < 300 ? 'point' : 'idle';
  const storageExpression = frame > 200 && frame < 250 ? 'happy' : 'neutral';

  // Animação do personagem "recuperando"
  const retrievalAnimation = frame > 300 && frame < 450 ? 'facepalm' : 'idle';
  const retrievalExpression = frame > 350 && frame < 400 ? 'confused' : 'neutral';
  const retrievalSymbol = frame > 350 && frame < 400 ? 'questionMark' : 'none';

  return (
    <Scene style="whiteboard">
      <Text
        text="Memória: Codificação, Armazenamento e Recuperação"
        x={960}
        y={90}
        fontSize={38}
        bold={true}
        fadeIn={true}
        totalFrames={500}
        align="center"
      />

      <Text
        text="Se uma etapa falhar, a informação se perde!"
        x={960}
        y={150}
        fontSize={26}
        fadeIn={true}
        startFrame={20}
        totalFrames={500}
        align="center"
      />

      {/* Personagem 1 - Codificação */}
      <StickFigure
        x={codingX}
        y={codingY}
        scale={1.5}
        animation={codingAnimation}
        expression="thinking"
        symbol={codingSymbol}
        facing="right"
        startFrame={0}
        endFrame={150}
      />

      {/* Personagem 2 - Armazenamento */}
      <StickFigure
        x={storageX}
        y={storageY}
        scale={1.5}
        animation={storageAnimation}
        expression={storageExpression}
        facing="right"
        startFrame={150}
        endFrame={300}
      />

      {/* Personagem 3 - Recuperação */}
      <StickFigure
        x={retrievalX}
        y={retrievalY}
        scale={1.5}
        animation={retrievalAnimation}
        expression={retrievalExpression}
        symbol={retrievalSymbol}
        facing="right"
        startFrame={300}
        endFrame={500}
      />

      {/* Texto explicativo - Codificação */}
      <Text
        text="Codificação: Rotular o documento"
        x={codingX}
        y={600}
        fontSize={28}
        startFrame={0}
        endFrame={150}
        align="center"
      />

      {/* Texto explicativo - Armazenamento */}
      <Text
        text="Armazenamento: Colocar no lugar certo"
        x={storageX}
        y={600}
        fontSize={28}
        startFrame={150}
        endFrame={300}
        align="center"
      />

      {/* Texto explicativo - Recuperação */}
      <Text
        text="Recuperação: Encontrar o documento"
        x={retrievalX}
        y={600}
        fontSize={28}
        startFrame={300}
        endFrame={500}
        align="center"
      />

      {/* Efeito de confusão no personagem da Recuperação */}
      {frame > 350 && frame < 400 && (
        <Effect
          type="sweatDrop"
          x={retrievalX + 50}
          y={680}
          scale={1}
          startFrame={350}
          endFrame={400}
        />
      )}

      {/* Texto narrativo */}
      <Text
        text="Basicamente, a memória passa por três etapas principais: a codificação, o armazenamento e a recuperação."
        x={960}
        y={250}
        fontSize={28}
        startFrame={0}
        endFrame={180}
        align="center"
      />

      <Text
        text="Se alguma dessas etapas falhar, a informação pode se perder."
        x={960}
        y={300}
        fontSize={28}
        startFrame={180}
        endFrame={360}
        align="center"
      />

      <Text
        text="Imagine que você está tentando arquivar um documento importante. Se você não o rotular corretamente (codificação), ou colocá-lo no lugar errado (armazenamento), dificilmente o encontrará depois (recuperação)."
        x={960}
        y={350}
        fontSize={28}
        startFrame={360}
        endFrame={500}
        align="center"
      />
    </Scene>
  );
};

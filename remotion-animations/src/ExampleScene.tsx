// EXEMPLO DE CÓDIGO GERADO PELA IA
// Este arquivo mostra como o LLM deve gerar código para cada cena

import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from './components/Scene';
import { StickFigure } from './components/StickFigure';
import { Text } from './components/Text';

export const ExampleScene: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Exemplo: personagem caminha da esquerda para direita
  const characterX = interpolate(frame, [0, 100], [300, 1600], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  return (
    <Scene backgroundColor="#87CEEB">
      {/* Chão */}
      <line
        x1={0}
        y1={900}
        x2={1920}
        y2={900}
        stroke="#8B4513"
        strokeWidth={4}
      />
      
      {/* Título da cena */}
      <Text
        text="Exemplo: Caminhada"
        x={960}
        y={100}
        fontSize={48}
        color="#000000"
        fadeIn={true}
        totalFrames={100}
      />
      
      {/* Personagem principal andando */}
      <StickFigure
        x={characterX}
        y={800}
        scale={1.5}
        color="#FF0000"
        animation="walk"
        startFrame={0}
        endFrame={100}
      />
      
      {/* Personagem secundário acenando */}
      <StickFigure
        x={1700}
        y={800}
        scale={1.2}
        color="#0000FF"
        animation="wave"
        startFrame={20}
        endFrame={100}
      />
    </Scene>
  );
};

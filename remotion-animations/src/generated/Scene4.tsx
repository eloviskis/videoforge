import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { Scene } from '../components/Scene';
import { StickFigure } from '../components/StickFigure';
import { Text } from '../components/Text';
import { Effect } from '../components/Effect';

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();

  const libraryX = 960;

  // Stick figure pensando
  const stickFigureX = interpolate(frame, [0, 375], [300, 300], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Livros aparecendo
  const bookStartX = 1400;
  const bookEndX = libraryX + 200;

  const bookX = interpolate(frame, [75, 150], [bookStartX, bookEndX], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bookFadeIn = frame >= 75 && frame <= 150;

  const book2StartX = 1600;
  const book2EndX = libraryX - 200;

  const book2X = interpolate(frame, [150, 225], [book2StartX, book2EndX], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const book2FadeIn = frame >= 150 && frame <= 225;

  const book3StartX = 1800;
  const book3EndX = libraryX + 50;

  const book3X = interpolate(frame, [225, 300], [book3StartX, book3EndX], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const book3FadeIn = frame >= 225 && frame <= 300;
  
  return (
    <Scene style="whiteboard">
      <Text
        text="Por que esquecemos?"
        x={960} y={90} fontSize={38} bold={true}
        fadeIn={true} totalFrames={375}
        align="center"
      />

      <Text
        text="Interferência: Novas informações competem com as antigas."
        x={960} y={150} fontSize={26}
        fadeIn={true} startFrame={20} totalFrames={375}
        align="center"
      />

      <StickFigure
        x={stickFigureX} y={740} scale={1.5}
        animation="think"
        expression="thinking"
        facing="right"
        startFrame={0} endFrame={375}
        symbol="questionMark"
      />

      {bookFadeIn && (
        <Text
          text="Livro 1"
          x={bookX} y={740} fontSize={28}
          fadeIn={bookFadeIn} fadeOut={false}
          startFrame={75} endFrame={150}
        />
      )}

      {book2FadeIn && (
        <Text
          text="Livro 2"
          x={book2X} y={740} fontSize={28}
          fadeIn={book2FadeIn} fadeOut={false}
          startFrame={150} endFrame={225}
        />
      )}

      {book3FadeIn && (
        <Text
          text="Livro 3"
          x={book3X} y={740} fontSize={28}
          fadeIn={book3FadeIn} fadeOut={false}
          startFrame={225} endFrame={300}
        />
      )}
      
      <Text
          text="É como uma biblioteca superlotada!"
          x={960} y={200} fontSize={26}
          fadeIn={true} startFrame={50} totalFrames={375}
          align="center"
        />
      
    </Scene>
  );
};

import { Composition, registerRoot } from 'remotion';
import React from 'react';
import { Scene1 } from './generated/Scene1';
import { Scene2 } from './generated/Scene2';
import { Scene3 } from './generated/Scene3';
import { Scene4 } from './generated/Scene4';
import { Scene5 } from './generated/Scene5';
import { Scene6 } from './generated/Scene6';
import { Scene7 } from './generated/Scene7';
import { Scene8 } from './generated/Scene8';
import { Scene9 } from './generated/Scene9';
import { Scene10 } from './generated/Scene10';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      
      <Composition
        id="Scene1"
        component={Scene1}
        durationInFrames={375}
        fps={25}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene2"
        component={Scene2}
        durationInFrames={450}
        fps={25}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene3"
        component={Scene3}
        durationInFrames={500}
        fps={25}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene4"
        component={Scene4}
        durationInFrames={375}
        fps={25}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene5"
        component={Scene5}
        durationInFrames={400}
        fps={25}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene6"
        component={Scene6}
        durationInFrames={425}
        fps={25}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene7"
        component={Scene7}
        durationInFrames={500}
        fps={25}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene8"
        component={Scene8}
        durationInFrames={450}
        fps={25}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene9"
        component={Scene9}
        durationInFrames={375}
        fps={25}
        width={1920}
        height={1080}
      />
      <Composition
        id="Scene10"
        component={Scene10}
        durationInFrames={400}
        fps={25}
        width={1920}
        height={1080}
      />
    </>
  );
};

registerRoot(RemotionRoot);

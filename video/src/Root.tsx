import React from 'react';
import {Composition} from 'remotion';
import {HandoffReel, DURATION} from './HandoffReel';

export const Root: React.FC = () => (
  <Composition
    id="HandoffReel"
    component={HandoffReel}
    durationInFrames={DURATION}
    fps={30}
    width={1080}
    height={1920}
  />
);

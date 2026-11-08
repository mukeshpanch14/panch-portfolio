import React from 'react';
import {Composition} from 'remotion';
import {HandoffReel, DURATION} from './HandoffReel';
import {HandoffReelV2, durationV2} from './v2/HandoffReelV2';

export const Root: React.FC = () => (
  <>
    <Composition id="HandoffReel" component={HandoffReel} durationInFrames={DURATION} fps={30} width={1080} height={1920} />
    <Composition id="HandoffReelV2" component={HandoffReelV2} durationInFrames={durationV2(30)} fps={30} width={1080} height={1920} />
  </>
);

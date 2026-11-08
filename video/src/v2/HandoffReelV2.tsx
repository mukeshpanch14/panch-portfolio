import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {scenes} from './theme';
import {BgMesh, Grade, Grain, Vignette, useFonts} from './components/fx';
import {Hook, Pipeline, Packet, Fail, Outro} from './scenes/Scenes';

export const durationV2 = (fps: number) =>
  Object.values(scenes).reduce((a, s) => a + Math.round(s * fps), 0);

export const HandoffReelV2: React.FC = () => {
  useFonts();
  const {fps} = useVideoConfig();
  const order: [number, React.ReactNode][] = [
    [scenes.hook, <Hook />], [scenes.pipeline, <Pipeline />], [scenes.packet, <Packet />],
    [scenes.fail, <Fail />], [scenes.outro, <Outro />],
  ];
  let t = 0;
  return (
    <AbsoluteFill>
      {/* 1 background mesh */}
      <BgMesh />
      {/* 2-3 assets + graphics/type */}
      {order.map(([sec, el], i) => {
        const len = Math.round(sec * fps);
        const from = t;
        t += len;
        return (
          <Sequence key={i} from={from} durationInFrames={len}>
            {el}
          </Sequence>
        );
      })}
      <Audio src={staticFile('sfx/pad.wav')} volume={0.22} />
      {/* 4 grade, 5 grain + vignette */}
      <Grade />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};

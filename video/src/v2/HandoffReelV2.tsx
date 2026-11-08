import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from 'remotion';
import {scenes} from './theme';
import {BgMesh, Grade, Grain, Vignette, useFonts} from './components/fx';
import {ReelContent, handoffContent} from './content';
import {Hook, Pipeline, Packet, Fail, Outro} from './scenes/Scenes';

export const durationV2 = (fps: number) =>
  Object.values(scenes).reduce((a, s) => a + Math.round(s * fps), 0);

export const HandoffReelV2: React.FC<Partial<ReelContent>> = (props) => {
  const c: ReelContent = {...handoffContent, ...props};
  useFonts();
  const {fps} = useVideoConfig();
  const order: [number, React.ReactNode][] = [
    [scenes.hook, <Hook c={c.hook} />], [scenes.pipeline, <Pipeline c={c.flow} />], [scenes.packet, <Packet c={c.list} />],
    [scenes.fail, <Fail c={c.contrast} />], [scenes.outro, <Outro c={c.outro} />],
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

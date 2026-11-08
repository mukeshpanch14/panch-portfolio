import React from 'react';
import {AbsoluteFill, delayRender, continueRender, staticFile} from 'remotion';
import {useCurrentFrame} from 'remotion';
import {theme} from '../theme';

export const useFonts = () => {
  const [handle] = React.useState(() => delayRender('fonts'));
  React.useEffect(() => {
    const faces = [
      ['Space Grotesk', '500', 'fonts/space-grotesk-latin-500-normal.woff2'],
      ['Space Grotesk', '700', 'fonts/space-grotesk-latin-700-normal.woff2'],
      ['JetBrains Mono', '500', 'fonts/jetbrains-mono-latin-500-normal.woff2'],
    ] as const;
    Promise.all(
      faces.map(([family, weight, file]) => {
        const ff = new FontFace(family, `url(${staticFile(file)})`, {weight});
        document.fonts.add(ff);
        return ff.load();
      }),
    )
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [handle]);
};

export const BgMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 55) * 50;
  const d2 = Math.cos(frame / 70) * 40;
  return (
    <AbsoluteFill style={{background: theme.colors.bg}}>
      <div
        style={{
          position: 'absolute', width: 1300, height: 1300, borderRadius: '50%',
          top: -500, left: -350 + d1, filter: 'blur(50px)',
          background: `radial-gradient(circle, ${theme.colors.primary}30, transparent 62%)`,
        }}
      />
      <div
        style={{
          position: 'absolute', width: 1000, height: 1000, borderRadius: '50%',
          bottom: -420, right: -300 - d2, filter: 'blur(70px)',
          background: `radial-gradient(circle, ${theme.colors.accent}1c, transparent 65%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Grade: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill
      style={{backgroundColor: theme.colors.primary, mixBlendMode: 'soft-light', opacity: 0.2}}
    />
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.12), transparent 28%, transparent 72%, rgba(0,0,0,0.22))',
      }}
    />
  </AbsoluteFill>
);

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none', backgroundImage: noise, backgroundSize: '220px',
        backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`,
        opacity: 0.06, mixBlendMode: 'overlay',
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, transparent 56%, rgba(0,0,0,0.35) 100%)',
    }}
  />
);

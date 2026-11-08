import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';

/** delay in SECONDS so timing derives from fps. */
export const useSpringIn = (delaySec = 0, cfg: typeof theme.spring[keyof typeof theme.spring] = theme.spring.smooth) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - Math.round(delaySec * fps), fps, config: cfg});
};

export const Entrance: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  from?: number;
}> = ({delay = 0, children, style, from = 44}) => {
  const p = useSpringIn(delay);
  return (
    <div
      style={{
        opacity: interpolate(p, [0, 0.6], [0, 1], {extrapolateRight: 'clamp'}),
        transform: `translateY(${interpolate(p, [0, 1], [from, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const WordReveal: React.FC<{
  words: {t: string; hero?: boolean}[];
  delay?: number;
  per?: number; // seconds between words
  style?: React.CSSProperties;
}> = ({words, delay = 0, per = 0.1, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', columnGap: 22, rowGap: 6, ...style}}>
      {words.map((w, i) => {
        const p = spring({
          frame: frame - Math.round((delay + i * per) * fps),
          fps,
          config: theme.spring.snappy,
        });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: interpolate(p, [0, 0.7], [0, 1], {extrapolateRight: 'clamp'}),
              transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px) scale(${interpolate(p, [0, 1], [0.92, 1])})`,
              color: w.hero ? theme.colors.primary : theme.colors.text,
              textShadow: w.hero ? `0 0 60px ${theme.colors.glow}` : undefined,
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

/** Wraps a scene: faster-than-entrance exit (rise + blur + fade), idle drift. */
export const SceneShell: React.FC<{len: number; children: React.ReactNode}> = ({len, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const exitStart = len - Math.round(0.33 * fps);
  const exit = interpolate(frame, [exitStart, len - 2], [0, 1], {
    easing: theme.ease.in, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const drift = interpolate(frame, [0, len], [0, -18], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute', inset: 0, padding: '230px 84px 290px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        fontFamily: theme.fonts.display, color: theme.colors.text,
        opacity: 1 - exit,
        filter: `blur(${exit * 10}px)`,
        transform: `translateY(${drift - exit * 60}px) scale(${1 + exit * 0.04})`,
      }}
    >
      {children}
    </div>
  );
};

export const Breathe: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{transform: `translateY(${Math.sin(frame / 30) * 4}px) scale(${1 + Math.sin(frame / 22) * 0.008})`, ...style}}>
      {children}
    </div>
  );
};

export const Counter: React.FC<{to: number; delay?: number; style?: React.CSSProperties}> = ({to, delay = 0, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - Math.round(delay * fps), fps, config: {damping: 30, stiffness: 60}});
  return <span style={{fontVariantNumeric: 'tabular-nums', ...style}}>{Math.round(interpolate(p, [0, 1], [0, to]))}</span>;
};

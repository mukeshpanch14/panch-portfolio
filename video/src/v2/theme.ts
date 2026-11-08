// Single source of truth. Palette: warm hero (Claude orange) on a near-black base.
import {Easing} from 'remotion';

export const theme = {
  colors: {
    bg: '#0C0B0A',
    bgAlt: '#171513',
    primary: '#D97757', // THE hero color: max one element per frame
    accent: '#5EC8D8',
    text: '#F6F2EC',
    textDim: '#9A938A',
    line: 'rgba(246,242,236,0.12)',
    glow: 'rgba(217,119,87,0.4)',
  },
  fonts: {
    display: '"Space Grotesk", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: {damping: 14, stiffness: 160, mass: 0.6},
    smooth: {damping: 20, stiffness: 90, mass: 1},
    bouncy: {damping: 11, stiffness: 170, mass: 0.7},
  },
} as const;

// Scene lengths in seconds; everything else derives from fps.
export const scenes = {hook: 3.5, pipeline: 5.5, packet: 6, fail: 4.5, outro: 3.5} as const;
export const totalSeconds = Object.values(scenes).reduce((a, b) => a + b, 0);

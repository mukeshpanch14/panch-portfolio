// Synthesizes a tiny deterministic SFX kit as 16-bit mono WAVs (no downloads).
import {writeFileSync, mkdirSync} from 'node:fs';
const SR = 44100;
mkdirSync('public/sfx', {recursive: true});
let seed = 1337;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const wav = (name, samples) => {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 32000, 44 + i * 2);
  writeFileSync(`public/sfx/${name}.wav`, buf);
};
const gen = (dur, fn) => Array.from({length: Math.floor(dur * SR)}, (_, i) => fn(i / SR, i));

// whoosh: band-swept noise, swell then fade
{
  let lp = 0;
  wav('whoosh', gen(0.6, (t) => {
    const env = Math.sin(Math.PI * Math.min(1, t / 0.6)) ** 2;
    const a = 0.05 + 0.5 * (t / 0.6);
    lp += a * (rnd() - lp);
    return lp * env * 1.6;
  }));
}
// pop: pitch-dropping sine
wav('pop', gen(0.18, (t) => Math.sin(2 * Math.PI * (900 * Math.exp(-t * 22) + 200) * t) * Math.exp(-t * 22) * 0.8));
// thump: sub hit
wav('thump', gen(0.7, (t) => Math.sin(2 * Math.PI * (90 * Math.exp(-t * 6) + 42) * t) * Math.exp(-t * 6) * 0.95));
// pad: detuned sine chord (A minor-ish), slow swell, for the music bed
{
  const notes = [110, 164.81, 220, 261.63];
  const dur = 24;
  wav('pad', gen(dur, (t) => {
    const env = Math.min(1, t / 3) * Math.min(1, (dur - t) / 3);
    let v = 0;
    for (const f of notes) v += Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.003 * t);
    return (v / 8) * env * (0.8 + 0.2 * Math.sin(t * 0.9));
  }));
}
console.log('sfx written');

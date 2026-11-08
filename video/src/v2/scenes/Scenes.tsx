import React from 'react';
import {Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {theme, scenes} from '../theme';
import {Entrance, WordReveal, SceneShell, Breathe, Counter, useSpringIn} from '../components/motion';

const T = theme.colors;
const useLen = (sec: number) => Math.round(sec * useVideoConfig().fps);

/** SFX starts 3 frames BEFORE the visual lands. */
const Sfx: React.FC<{at: number; file: string; volume?: number}> = ({at, file, volume = 0.6}) => {
  const {fps} = useVideoConfig();
  const from = Math.max(0, Math.round(at * fps) - 3);
  return (
    <Sequence from={from} layout="none">
      <Audio src={staticFile(`sfx/${file}.wav`)} volume={volume} />
    </Sequence>
  );
};

const Eyebrow: React.FC<{children: React.ReactNode; delay?: number}> = ({children, delay = 0}) => (
  <Entrance delay={delay} from={20}>
    <div style={{fontFamily: theme.fonts.mono, fontSize: 34, letterSpacing: 6, color: T.textDim}}>{children}</div>
  </Entrance>
);

export const Hook: React.FC = () => {
  const len = useLen(scenes.hook);
  return (
    <SceneShell len={len}>
      <Sfx at={0.05} file="whoosh" />
      <Sfx at={0.9} file="thump" volume={0.8} />
      <Eyebrow>CLAUDE CODE / SUB-AGENTS</Eyebrow>
      <div style={{height: 44}} />
      <WordReveal
        delay={0.15}
        per={0.12}
        style={{fontSize: 124, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05}}
        words={[{t: 'Opus'}, {t: 'plans.'}, {t: 'Sonnet'}, {t: 'builds.'}, {t: 'Haiku'}, {t: 'documents.'}]}
      />
      <div style={{height: 70}} />
      <Entrance delay={1.5}>
        <div style={{fontSize: 62, fontWeight: 500, letterSpacing: '-0.02em'}}>
          The hard part is the <span style={{color: T.primary, textShadow: `0 0 60px ${T.glow}`}}>handoff.</span>
        </div>
      </Entrance>
    </SceneShell>
  );
};

const Agent: React.FC<{name: string; role: string; delay: number; hero?: boolean}> = ({name, role, delay, hero}) => (
  <Entrance delay={delay}>
    <Breathe>
      <div
        style={{
          background: `linear-gradient(135deg, ${T.bgAlt}, #100f0d)`,
          border: `2px solid ${hero ? T.primary : T.line}`,
          boxShadow: hero ? `0 0 60px ${T.glow}, 0 0 120px rgba(217,119,87,0.2)` : '0 30px 60px -20px rgba(0,0,0,0.6)',
          borderRadius: 32, padding: '34px 46px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}
      >
        <span style={{fontSize: 76, fontWeight: 700, letterSpacing: '-0.03em'}}>{name}</span>
        <span style={{fontSize: 40, color: T.textDim, fontWeight: 500}}>{role}</span>
      </div>
    </Breathe>
  </Entrance>
);

const Link: React.FC<{file: string; delay: number}> = ({file, delay}) => {
  const {fps} = useVideoConfig();
  const frame = useCurrentFrame();
  const h = interpolate(frame - Math.round(delay * fps), [0, 14], [0, 120], {
    easing: theme.ease.out, extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const p = useSpringIn(delay + 0.15, theme.spring.snappy);
  return (
    <div style={{height: 120, display: 'flex', alignItems: 'center', gap: 28, paddingLeft: 80}}>
      <div style={{width: 6, height: h, background: T.primary, borderRadius: 3, boxShadow: `0 0 24px ${T.glow}`}} />
      <div
        style={{
          fontFamily: theme.fonts.mono, fontSize: 46, color: T.text, opacity: p,
          transform: `translateX(${interpolate(p, [0, 1], [-30, 0])}px)`,
        }}
      >
        {file}
      </div>
    </div>
  );
};

export const Pipeline: React.FC = () => {
  const len = useLen(scenes.pipeline);
  return (
    <SceneShell len={len}>
      <Sfx at={0.05} file="whoosh" />
      <Sfx at={0.55} file="pop" />
      <Sfx at={1.9} file="pop" />
      <Sfx at={3.3} file="pop" />
      <Entrance>
        <div style={{fontSize: 64, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 56, lineHeight: 1.1}}>
          Hand off <span style={{color: T.primary, textShadow: `0 0 60px ${T.glow}`}}>files</span>,
          <br />
          not summaries.
        </div>
      </Entrance>
      <Agent name="Opus" role="Planner" delay={0.5} />
      <Link file="PLAN.md" delay={1.15} />
      <Agent name="Sonnet" role="Builder" delay={1.85} />
      <Link file="BUILD.md + diff" delay={2.5} />
      <Agent name="Haiku" role="Docs & lint" delay={3.25} />
    </SceneShell>
  );
};

const SECTIONS: [string, string][] = [
  ['Goal', 'what done looks like'],
  ['Decisions', 'with the reasons'],
  ['Files', 'touch / do not touch'],
  ['Non-goals', 'what NOT to build'],
  ['Acceptance', 'checks you can run'],
  ['Open questions', 'stop and ask'],
];

export const Packet: React.FC = () => {
  const len = useLen(scenes.packet);
  return (
    <SceneShell len={len}>
      <Sfx at={0.05} file="whoosh" />
      {SECTIONS.map((_, i) => (
        <Sfx key={i} at={0.7 + i * 0.28} file="pop" volume={0.35} />
      ))}
      <Entrance>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 30}}>
          <span style={{fontSize: 190, fontWeight: 700, letterSpacing: '-0.05em', color: T.primary, textShadow: `0 0 60px ${T.glow}`, lineHeight: 1}}>
            <Counter to={6} delay={0.3} />
          </span>
          <span style={{fontSize: 60, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1}}>
            parts in every
            <br />
            <span style={{fontFamily: theme.fonts.mono, fontWeight: 500, color: T.textDim, fontSize: 48}}>PLAN.md</span>
          </span>
        </div>
      </Entrance>
      <div style={{height: 44}} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 20}}>
        {SECTIONS.map(([t, d], i) => (
          <Entrance key={t} delay={0.7 + i * 0.28} from={36}>
            <div
              style={{
                background: T.bgAlt, border: `2px solid ${T.line}`, borderRadius: 22,
                padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              }}
            >
              <span style={{fontSize: 52, fontWeight: 700, letterSpacing: '-0.02em'}}>{t}</span>
              <span style={{fontSize: 33, color: T.textDim, fontWeight: 500}}>{d}</span>
            </div>
          </Entrance>
        ))}
      </div>
    </SceneShell>
  );
};

const FAILS: [string, string][] = [
  ['Builder guesses', 'Hand open questions back'],
  ['Reasons lost', 'Record decisions + why'],
  ['Scope creep', 'State non-goals, off-limits files'],
  ['"Done" on faith', 'Run acceptance checks yourself'],
];

export const Fail: React.FC = () => {
  const len = useLen(scenes.fail);
  return (
    <SceneShell len={len}>
      <Sfx at={0.05} file="whoosh" />
      {FAILS.map((_, i) => (
        <Sfx key={i} at={0.9 + i * 0.45} file="pop" volume={0.4} />
      ))}
      <Entrance>
        <div style={{fontSize: 62, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1}}>
          Looks like a bad model.
          <br />
          <span style={{color: T.primary, textShadow: `0 0 60px ${T.glow}`}}>Is a bad packet.</span>
        </div>
      </Entrance>
      <div style={{height: 54}} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
        {FAILS.map(([a, b], i) => (
          <Entrance key={a} delay={0.9 + i * 0.45}>
            <div style={{background: T.bgAlt, border: `2px solid ${T.line}`, borderRadius: 22, padding: '26px 36px'}}>
              <div style={{fontSize: 46, fontWeight: 700, letterSpacing: '-0.02em'}}>{a}</div>
              <div style={{fontSize: 36, color: T.accent, marginTop: 8, fontWeight: 500}}>→ {b}</div>
            </div>
          </Entrance>
        ))}
      </div>
    </SceneShell>
  );
};

export const Outro: React.FC = () => {
  const len = useLen(scenes.outro);
  return (
    <SceneShell len={len}>
      <Sfx at={0.05} file="whoosh" />
      <Sfx at={1.0} file="thump" volume={0.8} />
      <WordReveal
        delay={0.15}
        per={0.12}
        style={{fontSize: 104, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08}}
        words={[{t: 'A'}, {t: 'sub-agent'}, {t: 'only'}, {t: 'knows'}, {t: 'what'}, {t: 'you'}, {t: 'hand', hero: true}, {t: 'it.', hero: true}]}
      />
      <div style={{height: 80}} />
      <Entrance delay={1.3}>
        <div style={{fontSize: 42, color: T.textDim, fontWeight: 500}}>Full post · link in bio</div>
        <div style={{fontSize: 54, fontWeight: 700, marginTop: 10, letterSpacing: '-0.02em'}}>Panch Mukesh</div>
      </Entrance>
    </SceneShell>
  );
};

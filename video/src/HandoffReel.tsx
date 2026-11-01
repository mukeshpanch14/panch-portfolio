import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const FPS = 30;
const C = {
  bg: '#0d1117',
  panel: '#161b22',
  line: '#30363d',
  text: '#f0f6fc',
  muted: '#8b949e',
  opus: '#d2a8ff',
  sonnet: '#79c0ff',
  haiku: '#7ee787',
  warn: '#ffa657',
  bad: '#ff7b72',
};
const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
const MONO = '"SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';

// Scene lengths in seconds
const S = {hook: 3.5, pipeline: 5.5, packet: 6, fail: 4.5, outro: 3.5};
const f = (s: number) => Math.round(s * FPS);
export const DURATION =
  f(S.hook) + f(S.pipeline) + f(S.packet) + f(S.fail) + f(S.outro);

const useIn = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping}});
};

const Fade: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({children, delay = 0, style}) => {
  const p = useIn(delay);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Scene: React.FC<{children: React.ReactNode; len: number}> = ({
  children,
  len,
}) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [len - 8, len], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        opacity: out,
        padding: '200px 80px 260px', // keep clear of Reels UI overlays
        fontFamily: FONT,
        color: C.text,
        justifyContent: 'center',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => (
  <Scene len={f(S.hook)}>
    <Fade>
      <div style={{fontSize: 40, color: C.muted, letterSpacing: 4}}>
        CLAUDE CODE · SUB-AGENTS
      </div>
    </Fade>
    <Fade delay={8} style={{marginTop: 40}}>
      <div style={{fontSize: 110, fontWeight: 800, lineHeight: 1.05}}>
        <span style={{color: C.opus}}>Opus</span> plans.
        <br />
        <span style={{color: C.sonnet}}>Sonnet</span> builds.
        <br />
        <span style={{color: C.haiku}}>Haiku</span> documents.
      </div>
    </Fade>
    <Fade delay={40} style={{marginTop: 60}}>
      <div style={{fontSize: 56, fontWeight: 600}}>
        The hard part is the <span style={{color: C.warn}}>handoff</span>.
      </div>
    </Fade>
  </Scene>
);

const Node: React.FC<{
  name: string;
  role: string;
  color: string;
  delay: number;
}> = ({name, role, color, delay}) => {
  const p = useIn(delay);
  return (
    <div
      style={{
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0.9, 1])})`,
        background: C.panel,
        border: `3px solid ${color}`,
        borderRadius: 28,
        padding: '34px 44px',
        width: '100%',
      }}
    >
      <div style={{fontSize: 64, fontWeight: 800, color}}>{name}</div>
      <div style={{fontSize: 38, color: C.muted, marginTop: 6}}>{role}</div>
    </div>
  );
};

const Handoff: React.FC<{file: string; delay: number}> = ({file, delay}) => {
  const frame = useCurrentFrame();
  const h = interpolate(frame - delay, [0, 14], [0, 130], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const o = interpolate(frame - delay, [8, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        height: 130,
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        paddingLeft: 70,
      }}
    >
      <div style={{width: 6, height: h, background: C.warn, borderRadius: 3}} />
      <div style={{opacity: o, fontFamily: MONO, fontSize: 44, color: C.warn}}>
        {file}
      </div>
    </div>
  );
};

const Pipeline: React.FC = () => (
  <Scene len={f(S.pipeline)}>
    <Fade>
      <div style={{fontSize: 52, fontWeight: 700, marginBottom: 50}}>
        Hand off <span style={{color: C.warn}}>files</span>, not summaries.
      </div>
    </Fade>
    <Node name="Opus" role="Planner" color={C.opus} delay={10} />
    <Handoff file="PLAN.md" delay={35} />
    <Node name="Sonnet" role="Builder" color={C.sonnet} delay={50} />
    <Handoff file="BUILD.md + diff" delay={75} />
    <Node name="Haiku" role="Docs & lint" color={C.haiku} delay={90} />
  </Scene>
);

const SECTIONS = [
  ['Goal', 'what done looks like'],
  ['Decisions', 'with the reasons'],
  ['Files', 'touch / do not touch'],
  ['Non-goals', 'what NOT to build'],
  ['Acceptance', 'checks you can run'],
  ['Open questions', 'stop and ask'],
];

const Packet: React.FC = () => (
  <Scene len={f(S.packet)}>
    <Fade>
      <div style={{fontSize: 52, fontWeight: 700}}>
        Every packet, <span style={{color: C.warn}}>same six parts</span>
      </div>
      <div style={{fontFamily: MONO, fontSize: 38, color: C.muted, marginTop: 10}}>
        PLAN.md
      </div>
    </Fade>
    <div style={{marginTop: 44, display: 'flex', flexDirection: 'column', gap: 22}}>
      {SECTIONS.map(([t, d], i) => (
        <Fade key={t} delay={14 + i * 14}>
          <div
            style={{
              background: C.panel,
              border: `2px solid ${C.line}`,
              borderLeft: `10px solid ${i === 5 ? C.warn : C.sonnet}`,
              borderRadius: 18,
              padding: '24px 34px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span style={{fontSize: 52, fontWeight: 700}}>{t}</span>
            <span style={{fontSize: 34, color: C.muted}}>{d}</span>
          </div>
        </Fade>
      ))}
    </div>
  </Scene>
);

const FAILS = [
  ['Builder guesses', 'Give it open questions to hand back'],
  ['Reasons lost', 'Record decisions and why'],
  ['Scope creep', 'State non-goals and off-limit files'],
  ['"Done" taken on faith', 'Run acceptance checks yourself'],
];

const Fail: React.FC = () => (
  <Scene len={f(S.fail)}>
    <Fade>
      <div style={{fontSize: 52, fontWeight: 700}}>
        Looks like a bad model.
        <br />
        <span style={{color: C.bad}}>Is a bad packet.</span>
      </div>
    </Fade>
    <div style={{marginTop: 50, display: 'flex', flexDirection: 'column', gap: 26}}>
      {FAILS.map(([a, b], i) => (
        <Fade key={a} delay={16 + i * 16}>
          <div
            style={{
              background: C.panel,
              border: `2px solid ${C.line}`,
              borderRadius: 18,
              padding: '26px 34px',
            }}
          >
            <div style={{fontSize: 46, fontWeight: 700, color: C.bad}}>{a}</div>
            <div style={{fontSize: 36, color: C.haiku, marginTop: 8}}>
              → {b}
            </div>
          </div>
        </Fade>
      ))}
    </div>
  </Scene>
);

const Outro: React.FC = () => (
  <Scene len={f(S.outro)}>
    <Fade>
      <div style={{fontSize: 90, fontWeight: 800, lineHeight: 1.1}}>
        A sub-agent only knows what you{' '}
        <span style={{color: C.warn}}>hand it</span>.
      </div>
    </Fade>
    <Fade delay={30} style={{marginTop: 80}}>
      <div style={{fontSize: 44, color: C.muted}}>Full post · link in bio</div>
      <div style={{fontSize: 52, fontWeight: 700, marginTop: 10}}>
        Panch Mukesh
      </div>
    </Fade>
  </Scene>
);

const Bg: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, DURATION], [20, 80]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x}% 15%, #1f2a44 0%, ${C.bg} 60%)`,
      }}
    />
  );
};

export const HandoffReel: React.FC = () => {
  let t = 0;
  const seq = (len: number, el: React.ReactNode) => {
    const s = (
      <Sequence from={t} durationInFrames={len}>
        {el}
      </Sequence>
    );
    t += len;
    return s;
  };
  return (
    <AbsoluteFill>
      <Bg />
      {seq(f(S.hook), <Hook />)}
      {seq(f(S.pipeline), <Pipeline />)}
      {seq(f(S.packet), <Packet />)}
      {seq(f(S.fail), <Fail />)}
      {seq(f(S.outro), <Outro />)}
    </AbsoluteFill>
  );
};

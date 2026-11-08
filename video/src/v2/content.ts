// All post-specific copy lives here (or in a JSON passed via --props).
// Scenes never hard-code text.
export type Word = {t: string; hero?: boolean};

export type ReelContent = {
  hook: {eyebrow: string; words: Word[]; subPre: string; subHero: string};
  flow: {titlePre: string; titleHero: string; titlePost: string; nodes: {name: string; role: string}[]; links: string[]};
  list: {count: number; heading: string; mono: string; items: [string, string][]};
  contrast: {line1: string; line2Hero: string; cards: [string, string][]};
  outro: {words: Word[]; cta: string; name: string};
};

export const handoffContent: ReelContent = {
  hook: {
    eyebrow: 'CLAUDE CODE / SUB-AGENTS',
    words: [{t: 'Opus'}, {t: 'plans.'}, {t: 'Sonnet'}, {t: 'builds.'}, {t: 'Haiku'}, {t: 'documents.'}],
    subPre: 'The hard part is the ',
    subHero: 'handoff.',
  },
  flow: {
    titlePre: 'Hand off ', titleHero: 'files', titlePost: ', not summaries.',
    nodes: [
      {name: 'Opus', role: 'Planner'},
      {name: 'Sonnet', role: 'Builder'},
      {name: 'Haiku', role: 'Docs & lint'},
    ],
    links: ['PLAN.md', 'BUILD.md + diff'],
  },
  list: {
    count: 6,
    heading: 'parts in every',
    mono: 'PLAN.md',
    items: [
      ['Goal', 'what done looks like'],
      ['Decisions', 'with the reasons'],
      ['Files', 'touch / do not touch'],
      ['Non-goals', 'what NOT to build'],
      ['Acceptance', 'checks you can run'],
      ['Open questions', 'stop and ask'],
    ],
  },
  contrast: {
    line1: 'Looks like a bad model.',
    line2Hero: 'Is a bad packet.',
    cards: [
      ['Builder guesses', 'Hand open questions back'],
      ['Reasons lost', 'Record decisions + why'],
      ['Scope creep', 'State non-goals, off-limits files'],
      ['"Done" on faith', 'Run acceptance checks yourself'],
    ],
  },
  outro: {
    words: [{t: 'A'}, {t: 'sub-agent'}, {t: 'only'}, {t: 'knows'}, {t: 'what'}, {t: 'you'}, {t: 'hand', hero: true}, {t: 'it.', hero: true}],
    cta: 'Full post · link in bio',
    name: 'Panch Mukesh',
  },
};

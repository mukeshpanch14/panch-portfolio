---
title: "Opus Plans, Sonnet Builds, Haiku Documents. The Hard Part Is the Handoff."
date: 2026-10-11 10:00
modified: 2026-10-11
category: Technology
tags:
  - claude
  - ai
  - agentic-coding
  - context-engineering
  - developer-tools
slug: subagent-handoff-architecture
author: Panch Mukesh
summary: Choosing a model per subagent takes one line of config. Making the work survive the trip between them takes a handoff contract. Here's how to design one.
status: published
---

The pitch for multi-model subagents is easy to like. Give the planning to your strongest model, the implementation to a faster one, and the docs and changelog to the cheapest. Each stage gets the model it deserves, and the bill goes down.

Then you try it, and the results disappoint. The plan was good. The code was competent. The docs were fluent. But the code doesn't do what the plan meant, and the docs describe behavior nobody built.

The model split usually isn't the culprit. Every boundary between agents is a place where context gets lost, and with a split like this you have created two of them.

---

## Why route models by role at all

Different stages of the same task ask for different things:

- **Planning** is judgment-heavy. You are weighing trade-offs, reading unfamiliar code, and deciding what *not* to do. A mistake here is expensive because everything downstream inherits it.
- **Building** is execution-heavy. Given a clear plan, the work is writing code, running tests, and fixing what breaks.
- **Documentation and metadata** are high-volume and low-risk. They need accuracy and a consistent voice more than deep reasoning.

Matching model to stage is a reasonable instinct. I'm deliberately not putting prices in this post, because they go stale. The shape holds regardless: spend where a wrong answer is costly, save where it isn't.

---

## Defining a subagent of your choice

In Claude Code, a custom subagent is a Markdown file with YAML frontmatter, in `.claude/agents/` for a project or `~/.claude/agents/` for all your projects. The body is its system prompt. The `model` field is where you choose.

```markdown
---
name: planner
description: Produces an implementation plan before any code is written. Use for non-trivial features.
tools: Read, Grep, Glob, Write
model: opus
---

You are a planning agent. Read the relevant code, make the design decisions,
and write PLAN.md using the template in docs/handoff-template.md.
Do not write implementation code.
```

`model` accepts the aliases `opus`, `sonnet` and `haiku`, a full model ID, or `inherit` to use whatever the main conversation is running. If you leave it out, the subagent follows the main conversation's model. `tools` is an allowlist, which is how you keep a planner from editing source and a docs agent from touching anything but docs.

That is the entire cost of the routing. Everything else in this post is the part people skip.

---

## Handoff architecture

### A subagent starts nearly blind

A subagent gets a fresh context window. It does not inherit your conversation, the files the parent already read, or the reasoning that led to the current plan. What it does get is short: its own system prompt, basic environment details, your project's CLAUDE.md, and the prompt the parent writes when delegating.

That delegation prompt is the handoff. When the parent is finished, only the subagent's final summary comes back, not its tool calls or intermediate work. I covered the reasoning behind this isolation in [Context Is Infrastructure]({filename}context-infrastructure.md). This post is about what to do given it.

![Fig 1 — Planner, builder and docs agents each hand a file to the next, with the main session routing every handoff]({static}/images/blog/subagent-handoff/fig1-pipeline.svg)

### Hand off artifacts, not summaries

A summary is whatever the sender remembers to say. A file has a shape, so gaps in it are visible.

The pattern in the figure is simple. The planner writes `PLAN.md`. The orchestrator, which is your main session, spawns the builder and points it at that path. The builder writes a `BUILD.md` with what changed and why. The docs agent reads that, plus the diff.

A file also survives. If the builder fails halfway, a fresh builder can pick up the same plan. A chat summary can't be reloaded.

### What goes in the packet

Fix the shape of the file so the planner fills the same sections every time and a missing one is obvious.

![Fig 2 — The six parts of a handoff packet and what each one is for]({static}/images/blog/subagent-handoff/fig2-handoff-packet.svg)

Two of these deserve more attention than they usually get.

**Decisions, with reasons.** "Use a token bucket" is an instruction. "Use a token bucket, because we need to allow short bursts and a fixed window would reject them" is something a builder can act on intelligently. Without the reason, the first time the instruction is awkward, a capable model will helpfully pick something simpler.

**Open questions.** Give the receiver permission to stop. A cheaper model handed an ambiguous plan will guess confidently. Telling it which questions to hand back instead of resolving is cheap insurance.

### Direction changes what crosses the boundary

Not every handoff carries the same thing:

| Direction | Example | What it should carry |
|---|---|---|
| Forward | planner to builder | Intent, decisions, boundaries, checks |
| Backward | builder to planner | The blocker, what was tried, and the specific decision needed |
| Sideways | builder to docs | The diff plus the rationale, not just the diff |

Backward handoffs are the ones teams forget to design. If the builder hits something the plan didn't anticipate, there needs to be a path back to the planner that doesn't involve the builder improvising.

### Who orchestrates

Claude Code allows subagents to spawn their own subagents, to a depth of three by default. I'd still start flat: the main session spawns each agent and passes the baton itself.

That keeps every handoff visible in one place, which matters when you are debugging a bad result. It also means the main session is the natural spot to verify between stages.

### Verify at the boundary

Don't take "done" at face value. The packet's acceptance checks should be things the orchestrator can run: a test command, a lint pass, a file that must exist. Run them before spawning the next agent.

If you want that to be automatic, Claude Code fires a `SubagentStop` hook when a subagent finishes, matched by agent name. I wrote about hooks in [the Claude hooks guide]({filename}claude-hooks-guide.md). Check the hooks docs for exactly what a stop hook can and can't do before you build a gate on it.

---

## How handoffs fail

![Fig 3 — Four handoff failure modes and the packet-level fix for each]({static}/images/blog/subagent-handoff/fig3-handoff-failure-modes.svg)

Each of these looks like a model failure, and each one is fixed in the packet, not by switching models.

---

## A worked example

Take a deliberately ordinary task: add a rate-limited `/reports` endpoint to an existing service.

The planner reads the codebase and writes this:

```markdown
# PLAN: rate-limited /reports endpoint

## Goal
Expose GET /reports, limited to 60 requests per minute per API key.

## Decisions
- Token bucket, not fixed window: clients batch requests, so bursts must be allowed.
- Store counters in the existing Redis instance: no new infrastructure.
- Return 429 with a Retry-After header, using the error shape in api/errors.py.

## Files
- Touch: api/routes/reports.py, api/middleware/ratelimit.py, tests/test_reports.py
- Do not touch: api/auth/*, anything under migrations/

## Non-goals
- No per-endpoint config UI. A constant is fine for now.

## Acceptance
- `pytest tests/test_reports.py` passes
- 61st request in a minute returns 429 with Retry-After

## Open questions
- If Redis is unreachable, fail open or closed? Stop and ask; do not choose.
```

The orchestrator hands that path to the builder, a Sonnet agent with edit and shell tools. The builder implements it, runs the acceptance command, hits the Redis question, and returns it instead of guessing.

The orchestrator answers it (fail open, with a logged warning), records that in the plan, and resumes. Then it runs the acceptance checks itself. Only after they pass does it spawn the Haiku docs agent, which gets `PLAN.md`, the builder's `BUILD.md` and the diff. It has what it needs to document the 429 behavior accurately, including the fail-open decision a reader would otherwise never learn.

None of the model choices in that story is the interesting part. The interesting part is that every agent could do its job from a file.

---

## When not to split

Handoffs cost tokens, latency and your attention. For a small change, a single agent holding the whole task in one context will beat a pipeline. The split pays off when the work is large enough that isolating context helps, when stages need different tool access, or when one stage is cheap enough to hand to a smaller model.

If you can describe the whole task in two sentences, don't build a pipeline for it.

---

## The checklist

- Pick the model per stage in the agent's frontmatter, and the tool allowlist while you're there.
- Hand off a file with a fixed shape, not a chat summary.
- Record decisions and their reasons, not just instructions.
- State non-goals and files off limits.
- Write acceptance checks the orchestrator can actually run.
- Give the receiver an explicit way to hand a question back.
- Keep orchestration flat until you have a reason not to.
- Skip the whole thing for small tasks.

The model tiers are a cost lever. The handoff is the design.

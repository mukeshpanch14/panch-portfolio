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
summary: Picking a model per sub-agent takes one line of config. Making the work survive the trip between them takes a handoff contract — here's how to design one.
status: published
---

The pitch for multi-model sub-agents is easy to like. Give the planning to your strongest model, the building to a faster one, and the docs and changelog to the cheapest. Every stage gets the model it deserves, and the bill goes down.

Then you try it, and the result is oddly disappointing. The plan was good. The code was competent. The docs read beautifully. But the code doesn't do what the plan meant, and the docs describe behavior nobody built.

The models weren't the problem. Every boundary between agents is a place where context gets lost, and a three-stage pipeline gives you two of them.

---

## Why route models by role at all

Different stages of the same task ask for different things:

**Planning** is judgment-heavy. You're weighing trade-offs, reading unfamiliar code, and deciding what *not* to do. A mistake here is expensive, because everything downstream inherits it.

**Building** is execution-heavy. Given a clear plan, the work is writing code, running tests, and fixing what breaks.

**Documentation and metadata** are high-volume and low-risk. They need accuracy and a consistent voice more than deep reasoning.

Matching the model to the stage is a sensible instinct. I'm deliberately leaving prices out of this post, because they go stale fast. The principle doesn't: spend where a wrong answer is costly, save where it isn't.

---

## Defining a sub-agent of your choice

In Claude Code, a custom sub-agent is just a Markdown file with YAML frontmatter. It lives in `.claude/agents/` for one project, or `~/.claude/agents/` for all of them. The body is its system prompt, and the `model` field is where you choose.

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

`model` accepts the aliases `opus`, `sonnet` and `haiku`, a full model ID, or `inherit` to use whatever your main conversation is running. Leave it out and the sub-agent falls back to the main conversation's model, unless you've set the `CLAUDE_CODE_SUBAGENT_MODEL` environment variable. `tools` is an allowlist — it's how you stop a planner from editing source, or a docs agent from touching anything but docs.

That's the entire cost of the routing. Everything else in this post is the part people skip.

---

## Handoff architecture

### A sub-agent starts nearly blind

A sub-agent gets a fresh context window. It doesn't inherit your conversation, the files the parent already read, or the reasoning that produced the current plan. What it does get is short: its own system prompt plus basic environment details, your project's CLAUDE.md files, a git status snapshot, and the prompt the parent writes when it delegates.

**That delegation prompt is the handoff.** And when the sub-agent finishes, only its final summary comes back — not the tool calls, not the intermediate work.

I covered *why* this isolation is useful in [Managing Context Across AI Coding Tools]({filename}context-infrastructure.md). This post is about what to do once you've accepted it.

<div style="width:0;min-width:100%;overflow-x:auto"><img alt="Fig 1 — Planner, builder and docs agents each hand a file to the next, with the main session routing every handoff" src="{static}/images/blog/subagent-handoff/fig1-pipeline.svg" style="min-width:640px;max-width:none;width:100%;height:auto"></div>

*Fig 1 — Each stage hands a file to the next. The main session spawns every agent and routes every handoff.*

### Hand off artifacts, not summaries

A summary is whatever the sender remembers to say. A file has a shape, so gaps in it are visible.

The pattern in the figure is simple. The planner writes `PLAN.md`. Your main session — the orchestrator — spawns the builder and points it at that path. The builder writes a `BUILD.md` covering what changed and why. The docs agent reads that, plus the diff.

A file also survives. If the builder dies halfway through, a fresh one picks up the same plan. A chat summary can't be reloaded.

### What goes in the packet

Fix the shape of the file. The planner fills the same sections every time, and a missing one jumps out.

<div style="width:0;min-width:100%;overflow-x:auto"><img alt="Fig 2 — The six parts of a handoff packet and what each one is for" src="{static}/images/blog/subagent-handoff/fig2-handoff-packet.svg" style="min-width:640px;max-width:none;width:100%;height:auto"></div>

*Fig 2 — Six sections, every time. Intent, boundaries, verification, and an escape hatch.*

Two of these deserve more attention than they usually get.

**Decisions, with reasons.** "Use a token bucket" is an instruction. "Use a token bucket, because clients batch requests and a fixed window would reject the burst" is something a builder can act on intelligently. Without the reason, the first time the instruction feels awkward, a capable model will helpfully pick something simpler.

**Open questions.** Give the receiver permission to stop. A cheaper model handed an ambiguous plan won't say so — it'll guess, confidently. Telling it which questions to hand back instead of resolving is cheap insurance.

### Direction changes what crosses the boundary

Not every handoff carries the same thing:

| Direction | Example | What it should carry |
|---|---|---|
| Forward | planner to builder | Intent, decisions, boundaries, checks |
| Backward | builder to planner | The blocker, what was tried, the specific decision needed |
| Sideways | builder to docs | The diff plus the rationale, not just the diff |

Backward handoffs are the ones everyone forgets to design. If the builder hits something the plan didn't anticipate, there needs to be a path back to the planner — one that doesn't involve the builder improvising.

### Who orchestrates

Claude Code lets sub-agents spawn their own sub-agents, three levels deep by default. I'd still start flat: the main session spawns each agent and passes the baton itself.

That keeps every handoff visible in one place, which matters a lot when you're debugging a bad result. It's also the natural spot to verify between stages.

### Verify at the boundary

Don't take "done" at face value. The packet's acceptance checks should be things the orchestrator can actually run — a test command, a lint pass, a file that has to exist. Run them *before* spawning the next agent.

If you want that to happen automatically, Claude Code fires a `SubagentStop` hook when a sub-agent finishes, matched by agent name. And it isn't just a notification — a `SubagentStop` hook can block the sub-agent from stopping (exit code 2, or a `block` decision), which sends it back to work. Point it at your acceptance checks and "done" has to be earned.

I wrote about hooks in [Claude Code Hooks: Get Notified When It Needs You]({filename}claude-hooks-guide.md). That post is about notifications; for the blocking side, the [hooks docs](https://code.claude.com/docs/en/hooks) are the place to look.

---

## Handoffs aren't only at the start

Most sessions aren't a clean pipeline. You're deep into a task with Opus or Sonnet when a chore turns up: lint that PR, raise issues for the three things you just found, triage the docs this change made stale. None of it needs your main model's judgment, and all of it floods the context you've been building. That's a handoff too, with slightly different rules.

| Side quest | One reasonable fit | What should come back |
|---|---|---|
| Lint a PR | Haiku, read + shell | Pass or fail, plus a short `file:line` list |
| Raise GitHub issues | Haiku or Sonnet, `gh` access | Drafts first; after your OK, the issue URLs |
| Triage docs | Haiku, read-only | A punch list: page, what's stale, suggested fix |

**Dig the packet out of the conversation.** The sub-agent can't see it, so pass only what the task needs: the PR number, the rules that matter, what done looks like. Three or four lines. Pasting the conversation in is the context bloat covered next, arriving through a side door.

**Design the return.** Only the final summary comes back, and it lands in the context you're protecting, so its shape is the contract: "pass or fail, at most ten findings, full output in `lint-report.txt`."

**Draft before anything outward-facing.** Linting only reads; filing issues writes to a tracker other people see. Have the sub-agent draft, review, then file.

For a one-off chore the main model can pick a cheaper model for that single call. Save agent files for chores you repeat, and run slow ones in the background so you can keep working.

---

## How handoffs fail

<div style="width:0;min-width:100%;overflow-x:auto"><img alt="Fig 3 — Four handoff failure modes and the packet-level fix for each" src="{static}/images/blog/subagent-handoff/fig3-handoff-failure-modes.svg" style="min-width:640px;max-width:none;width:100%;height:auto"></div>

*Fig 3 — Four failures that look like model problems, and the packet-level fix for each.*

Every one of these looks like the model being bad at its job. Every one of them is fixed in the packet, not by switching models.

---

## A worked example

Take a deliberately ordinary task: add a rate-limited `/reports` endpoint to an existing service.

The planner reads the codebase and writes a `PLAN.md`. Expand it to see exactly what gets handed over:

<details markdown="1" style="margin-bottom:1.5rem">
<summary style="cursor:pointer;font-weight:600">PLAN.md — the full handoff packet</summary>

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

</details>

**Step 1:** The orchestrator hands that path to the builder — a Sonnet agent with edit and shell tools.

**Step 2:** The builder implements it, runs the acceptance command, hits the Redis question, and returns it instead of guessing.

**Step 3:** The orchestrator answers (fail open, with a logged warning), records that in the plan, and resumes the build.

**Step 4:** The orchestrator runs the acceptance checks itself. Only when they pass does it spawn the Haiku docs agent.

**Step 5:** The docs agent gets `PLAN.md`, the builder's `BUILD.md`, and the diff. It has everything it needs to document the 429 behavior accurately — including the fail-open decision a reader would otherwise never learn about.

None of the model choices in that story is the interesting part. The interesting part is that every agent could do its job from a file.

---

## When to split, and when not to

Handoffs cost tokens, latency, and your attention.

**When the split pays off:**
- The work is big enough that isolating context helps
- Stages need different tool access
- One stage is cheap enough to hand to a smaller model
- A chore would flood your main context with output — lint runs, issue triage, docs sweeps

**When NOT to split:**
- The change is small — one agent holding the whole task will beat a pipeline
- You can describe the whole task in two sentences
- Just because it sounds cool

---

### The short version

Model tiers are a cost lever. The handoff is the design.

- Pick the model per stage in the agent's frontmatter — and the tool allowlist while you're there
- Hand off a file with a fixed shape, not a chat summary
- Record decisions *and* their reasons
- State non-goals and files that are off limits
- Write acceptance checks the orchestrator can actually run
- Give the receiver an explicit way to hand a question back
- Keep orchestration flat until you have a reason not to
- Treat mid-session chores as handoffs too: a small packet, a defined return, and a draft before anything outward-facing

A sub-agent only knows what you hand it. Hand it something worth knowing.

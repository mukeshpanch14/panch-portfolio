---
title: "Let It Think, Let It Search: When Reasoning Models and Deep Research Are Worth the Wait"
date: 2026-11-08 10:00
modified: 2026-11-08
category: Technology
tags:
  - llm
  - ai
  - reasoning-models
  - deep-research
  - prompt-engineering
slug: thinking-models-deep-research
author: Panch Mukesh
summary: Thinking models take longer to get the answer right. Deep research takes even longer to cover more ground. Here's how each one works, and how to tell which one your task needs.
status: published
---

Most AI chat apps now have two buttons that make the model slower on purpose. One says *Think*. The other says *Deep research*. Press either and a two-second answer turns into a two-minute one, or a twenty-minute one.

Sometimes the wait gets you a much better answer. Sometimes it gets you the same answer, later, at a higher cost. Once you know what each button actually does, it's easy to tell which is which.

A lot of how I think about this comes from Andrej Karpathy's talk [How I use LLMs](https://www.youtube.com/watch?v=EWvNQjAaOHw). It's worth watching in full. This post covers what's changed since, plus the examples I actually use.

---

## Thinking models

### What is a thinking model?

A regular model answers straight away. It starts writing the reply the moment you hit send, one word after another, and whatever comes out first is what you get.

A thinking model works the problem out before it answers. It writes notes to itself first: breaking the question into steps, trying an approach, checking whether it holds up, and fixing mistakes along the way. Only after that does it write the reply you actually see.

Think of asking someone a tricky question. One person blurts out the first thing that comes to mind. The other says "hang on", grabs a pen, works it through, and then answers. Same person, same knowledge. The second answer is just more likely to be right.

That's the whole trade: **a thinking model spends more time and more tokens to get a more careful answer.**

### Where thinking comes from

A model learns in three stages.

<div style="width:0;min-width:100%;overflow-x:auto"><img alt="Fig 1 — Pre-training, post-training and reinforcement learning, and the thinking tokens a model produces at answer time" src="{static}/images/blog/thinking-deep-research/fig1-training-stages.svg" style="min-width:640px;max-width:none;width:100%;height:auto"></div>

*Fig 1 — Thinking is a habit picked up in the third stage. You see it as extra work before the reply.*

**Pre-training.** The model reads a huge chunk of the internet and learns to predict the next word. Karpathy calls the result a *lossy zip file* of the web. It remembers a lot, but fuzzily, and only up to the date training stopped.

**Post-training.** The model studies example conversations and learns to act like a helpful assistant instead of just continuing text.

**Reinforcement learning.** This is the newer stage. The model practises on problems where the answer can be checked, like maths, puzzles, and code that has to pass tests. Attempts that get the right answer are rewarded.

### What thinking looks like

Before it replies, a thinking model writes a kind of scratch pad. It tries an approach, checks it, notices a mistake, backs up, and tries again. Then it gives you the answer.

One thing worth knowing about that scratch pad: **you pay for it.** Thinking counts as output, so it's on the bill even if you never see it. Claude, for example, only shows you a summary of its thinking, or nothing at all. You're charged for the whole thing either way.

### When thinking helps

Thinking pays off when a problem has steps where things can go wrong: debugging, designing a schema, planning a migration, checking a calculation that doesn't add up. You're basically paying the model to double-check itself.

It doesn't help when there's nothing to work out. "What's the capital of France?" isn't more correct after a minute of thought. Neither is a friendlier version of your email.

My rule of thumb: **if you'd reach for scratch paper, so should the model.**

### It's a dial now

Early on, "thinking" was a separate model you picked from a menu. That's mostly gone. Today's models decide for themselves how much to think, and you just set how hard they should try.

On the Claude API, it looks like this:

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive", "display": "summarized"},
    output_config={"effort": "high"},  # low | medium | high | xhigh | max
    messages=[{"role": "user", "content": "Why does this cache return stale data under load? ..."}],
)

for block in response.content:
    if block.type == "thinking":
        print("Thinking summary:", block.thinking)
    elif block.type == "text":
        print(block.text)
```

`adaptive` lets the model decide how much to think. `effort` is the dial. `display: "summarized"` gives you a readable summary of the thinking; leave it out and you'll just see a pause before the answer.

OpenAI and Google have the same kind of dial under different names. The options change from model to model, so check the docs for the one you're using.

Whatever the provider, the advice is the same: **start low, and turn it up only when you can see the answers getting better.**

---

## Search and deep research

### The model's knowledge has a date on it

Training is expensive, so it doesn't happen often. Anything after the cutoff, the model just doesn't know. Rare facts it only saw a few times are fuzzy too.

Search fixes this. Instead of answering from memory, the model asks for a search. The app runs it, grabs the pages, and drops the text into the conversation. Now the model is reading the facts, not trying to remember them. Reading is a lot more reliable than remembering.

### Search vs. deep research

**Search** is quick. A query or two, a few pages, an answer in seconds. Use it for things that are recent or obscure: release notes, prices, schedules, today's news, whether a library is still maintained.

**Deep research** is a different kind of job. You hand it a question and it goes away for several minutes, sometimes half an hour. It makes a plan, runs dozens of searches, reads docs and papers, spots what's missing, searches again, and writes you a long report with links.

<div style="width:0;min-width:100%;overflow-x:auto"><img alt="Fig 2 — A lead agent splits a question into sub-questions, parallel workers search and read, findings return, and gaps trigger another round before the report is written" src="{static}/images/blog/thinking-deep-research/fig2-research-loop.svg" style="min-width:640px;max-width:none;width:100%;height:auto"></div>

*Fig 2 — Deep research goes round in a loop. It covers more ground by splitting the work, and goes deeper by going round again.*

Anthropic [wrote up how theirs works](https://www.anthropic.com/engineering/multi-agent-research-system), and it's roughly Fig 2. A lead agent plans the work and splits the question up. Helper agents each take a piece, read in their own space, and send back a short summary. The lead decides if it has enough or needs another round.

Two numbers from that write-up stuck with me. On their own tests, this setup did about 90% better than a single agent. It also used about **15 times** the tokens of a normal chat. A lot of the gain comes from simply putting more work into the question. That's also why it's overkill for a question with a one-line answer.

If you read [my post on sub-agent handoffs]({filename}subagent-handoff-architecture.md), this will look familiar. Helpers keep the lead's context tidy, and only a summary comes back.

### Good uses for deep research

I reach for it when a question needs **lots of sources, lots of criteria, and a structured answer.**

**When building a product:**

- **Sizing up competitors.** How rivals handle pricing, trials and onboarding.
- **Finding user pain points.** What people complain about in reviews and forums.
- **Mapping a market.** Who the players are and what they charge.
- **Comparing vendors.** Payments, email, auth, monitoring.

**When writing code:**

- **Picking a library.** "Which Python job queue should we use: Celery, RQ, Dramatiq or Arq?" Ask it to cover maintenance, async support, open issues and how each one handles retries.
- **Planning a migration.** "What do we need to change to move from Python 3.12 to 3.14?" or "Which of our pylint rules does ruff cover, and what do we lose?" It pulls together release notes, migration guides and the issues other teams ran into.
- **Before integrating an API.** "How do Stripe, Razorpay and Adyen handle refunds, webhooks and retries?" Better to learn the differences before you write the code than after.
- **Making a design call.** I used it to plan a map analytics server for loading insights onto MapTiler maps: "Should we serve the data as vector tiles straight from the database, as pre-built tiles, or as plain GeoJSON from an API?" It reads the docs, the blog posts and the war stories you'd otherwise skim on a Sunday.

**Beyond work:**

- **Checking the evidence.** "What does the research actually say about X?" It finds and reads papers you'd never get round to.

### Write the question like a brief

Deep research runs for a long time on whatever you give it, so a vague question wastes a lot of effort. Write it the way you'd brief a new teammate. Here's one I'd use:

<details markdown="1" style="margin-bottom:1.5rem">
<summary style="cursor:pointer;font-weight:600">Example brief — comparing managed Postgres providers</summary>

```markdown
## Question
Which managed Postgres provider fits a multi-tenant SaaS with ~50 GB of data,
growing ~5 GB/month, mostly in the EU?

## Compare
Providers: AWS RDS, AWS Aurora, Google Cloud SQL, Azure Flexible Server,
Neon, Supabase, Crunchy Bridge.

Criteria:
- Pricing at our size (compute, storage, egress, backups)
- Point-in-time recovery: how far back, how long to restore
- Connection pooling: built in or bring your own
- EU regions and data residency
- Major version upgrades and downtime
- Notable outages in the last 12 months

## Sources
Prefer official docs, pricing pages, status pages and engineering blogs.
Don't trust vendor comparison pages or affiliate reviews.
Pricing info must be from the last 12 months.

## Output
1. One table: providers × criteria
2. A short recommendation, plus the two closest alternatives
3. A list of anything you couldn't confirm, and why

## Out of scope
Self-hosted Postgres. Non-Postgres databases.
```

</details>

A clear goal, the things to compare, which sources to trust, what the answer should look like, and a place to say "I couldn't find this." That last part matters most. Without it, gaps get filled with confident guesses.

### Treat the report as a first draft

A deep research report reads like it came from someone careful. That's exactly why it's easy to trust too much. It can still:

- **Miss a major option** it never came across, with no hint that anything's missing
- **Use old information**, like a price or policy that has since changed
- **Link a real page for a claim that page doesn't make**
- **Repeat one mistake** across several sources that all copied each other

My check is quick. Click through on the two or three claims your decision depends on. Ask who's missing from the table. Look at the dates on anything about pricing or policy. If one of those checks fails, be suspicious of the rest.

---

## Picking the right mode

<div style="width:0;min-width:100%;overflow-x:auto"><img alt="Fig 3 — A two-by-two grid: standard, thinking, web search and deep research, by reasoning needed and outside information needed" src="{static}/images/blog/thinking-deep-research/fig3-mode-picker.svg" style="min-width:640px;max-width:none;width:100%;height:auto"></div>

*Fig 3 — Two questions: how much working out does it need, and how much does it need to look up?*

Or, as a table:

| Mode | Good for | Wait | Watch out for |
|---|---|---|---|
| Standard | Drafting, rewriting, explaining common things | Seconds | Outdated or fuzzy facts |
| Thinking | Debugging, design, planning, maths | Seconds to minutes | Paying for thought on easy tasks |
| Search | A recent or obscure fact | Seconds | Only skims a page or two |
| Deep research | Many sources, many criteria, a report | Minutes to half an hour | Confident gaps, lots of tokens |

You can mix them, too. Deep research thinks between searches, and a debugging session might need one quick search for a known bug. The grid just tells you where to start.

### Two habits that always help

**Start a new chat when you switch topics.** Everything in the conversation is the model's working memory, and old stuff gets in the way. A finished research report is a lot of baggage to carry into an unrelated coding question. More on this in [Managing Context Across AI Coding Tools]({filename}context-infrastructure.md).

**Let code do the maths.** Thinking makes a model better at reasoning about numbers, not at multiplying them. If the answer depends on a calculation, ask it to run the code.

---

### Takeaways

Thinking gets you a more careful answer. Deep research gets you a wider one. Both cost time and money, so use them when the task calls for it.

- Thinking is a habit models learn by practising on problems with checkable answers
- You pay for the thinking even when you only see a summary
- Thinking is a dial now: start low, turn it up when it helps
- Search lets the model read the facts instead of half-remembering them
- Deep research is a plan, search, read, repeat loop, and it uses a lot of tokens
- Brief it like a teammate: what to compare, which sources to trust, what to return, what it couldn't find
- Check the claims you're relying on, ask who's missing, and look at the dates

The slow buttons are worth pressing. Just know what you're waiting for.

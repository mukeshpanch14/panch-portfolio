---
title: Why Your Tests Pass Locally but Fail in CI
date: 2026-03-08 20:12
modified: 2026-03-08 20:12
category: Development
tags:
  - sdlc;cicd;
slug: why-tests-pass-locally-but-fail-in-ci
author: Panch Mukesh
summary: Most developers don't realize that GitHub Actions tests a merge commit
  — not their branch in isolation. This post explains how actions/checkout
  creates a temporary merge ref combining your PR with the latest main, why that
  causes unexpected test failures, and how rebasing regularly keeps your local
  environment in sync with what CI actually runs.
status: published
---
*\*A deep dive into how GitHub Actions checks out your pull request code — and why it matters.\**
---
## The Frustrating Scenario
You've been working on a feature branch for a few days. You run your tests locally:
\`\`\`bashpytest --cov\`\`\`
**\*\*All green.\*\*** You push your branch, open a pull request, and... CI fails. The same tests. The same code. But a different result.
You scratch your head, run the tests again locally — still green. What's going on?
---
## The Root Cause: CI Doesn't Test What You Think It Tests
Here's the key insight most developers miss:
> **\*\*GitHub Actions doesn't test your branch in isolation. It tests what would happen if your branch were merged into \`main\` right now.\*\***
### What you see locally
When you check out your branch and run tests, you're running against your branch's code — and only your branch's code. Your working tree looks exactly like your latest commit.
\`\`\`main:             A --- B --- C --- D --- E     (main has moved ahead)                   \your-branch:        F --- G --- H               (your work)\`\`\`
Locally, you're sitting on commit **\*\*H\*\***. Your tests run against the snapshot at **\*\*H\*\***. If your branch is internally consistent — your service code matches your models, your tests mock the right fields — everything passes.
### What CI sees
When you open a PR, GitHub Actions runs \`actions/checkout@v4\`. This action doesn't simply clone your branch. For pull request events, it checks out a **\*\*merge commit\*\*** — a temporary commit that combines your branch with the latest \`main\`:
\`\`\`main:             A --- B --- C --- D --- E                   \                       \your-branch:        F --- G --- H --------- M   (merge commit)\`\`\`
Commit **\*\*M\*\*** is a blend of your code (**\*\*H\*\***) and the current state of \`main\` (**\*\*E\*\***). GitHub creates this merge ref automatically at `refs/pull/<number>/merge`.
This means CI is answering a different question than your local test run:
| Environment | Question being answered ||---|---|| **\*\*Local\*\*** | "Does my branch work?" || **\*\*CI\*\*** | "Will my branch work **\*\*after\*\*** it's merged into main?" |
---
## A Real-World Example
Let's make this concrete. Say you're working on adding an \`action_type\` field to an API response.
### On your branch, you:
1. Added \`action_type\` to the Pydantic model:   \`\``python   class OaRResponse(BaseModel):       oar_title: str       action_type: str | None = None   *\# new field*   \`\`\`
2. Updated the service to populate it:   \`\`\`python   *return* OaRResponse(       oar_title=oar.oar_title,       action_type=oar.action_type,      *\# new line*   )   \`\`\`
3. Updated test mocks:   \`\`\`python   mock.action_type = "review"   \`\`\`
Everything is consistent. Tests pass.
### Meanwhile, on \`main\`, a teammate:
1. Removed \`action_type\` from the model and added \`generation_context\` and \`scores\` instead:   \`\`\`python   class OaRResponse(BaseModel):       oar_title: str       generation_context: dict | None = None   *\# replaced action_type*       scores: dict | None = None                *\# new field*   \`\`\`
2. Updated the service accordingly3. Added new tests that assert on \`generation_context\`
### When CI creates the merge commit:
Git tries to combine both sets of changes. Depending on which files conflict and how they merge, you might end up with:
- A service that sets \`action_type\` on a model that no longer has that field- Test mocks missing \`generation_context\` and \`scores\` that the service now requires- New tests from \`main\` that assert on fields your service doesn't produce
The result: a Frankenstein codebase that neither you nor your teammate intended.
---
## Under the Hood: How \`actions/checkout\` Works
Here's what \`actions/checkout@v4\` does for pull requests, step by step:
\`\`\`yaml- uses: actions/checkout@v4    *\# This one line hides a lot of complexity*\`\``
1. **\*\*Clones the repository\*\*** to the runner2. **\*\*Detects the event type\*\*** — for \`pull_request\` events, it uses \`github.ref\` which points to `refs/pull/<number>/merge`3. **\*\*Checks out the merge ref\*\*** — this is a read-only ref that GitHub maintains, representing the result of merging your PR branch into the base branch4. **\*\*The runner now has a working tree\*\*** that represents the merged state
You can verify this by adding a debug step to your workflow:
\`\`\`yaml- name: Debug ref  run: |    echo "github.ref: ${{ github.ref }}"    echo "github.sha: ${{ github.sha }}"    git log --oneline -5\`\`\`
For a PR, you'll see something like:
\`\``github.ref: refs/pull/42/mergegithub.sha: abc123def456
abc123d Merge <sha> into <sha>    ← the merge commit1234567 Your latest commit89abcde Main's latest commit\`\`\`
---
## Why GitHub Does This
This design is intentional and actually protects you. Consider the alternative — if CI only tested your branch in isolation:
1. Your branch passes CI ✅2. Your teammate's branch passes CI ✅3. You both merge to \`main\`4. \`main` is now broken 💥
Nobody did anything wrong individually, but the combination of changes is broken. By testing the merge result, GitHub catches this **\*\*before\*\*** the merge happens.
---
## How to Fix It (and Prevent It)
### Immediate fix: Rebase onto main
\`\``bashgit fetch origingit rebase origin/main*\# Resolve any conflicts*git push --force-with-lease\`\`\`
After rebasing, your branch starts from the latest \`main`. The merge commit in CI becomes trivial (no divergence to reconcile), and your local environment matches what CI will test.
### Prevention strategies
**\*\*1. Rebase frequently\*\***
If your branch lives for more than a day or two, rebase onto \`main\` regularly:
\`\`\`bashgit fetch origin && git rebase origin/main\`\`\`
**\*\*2. Enable branch protection rules\*\***
In your repo settings, enable **\*\*"Require branches to be up to date before merging"\*\***. This forces contributors to update their branch before the merge button becomes available.
**\*\*3. Watch for high-traffic files\*\***
If you're modifying files that change frequently (models, shared utilities, API schemas), expect merge issues. Communicate with your team about who's touching what.
**\*\*4. Keep branches short-lived\*\***
The longer your branch lives, the more \`main\` diverges, and the higher the chance of this problem. Aim for small, focused PRs that merge within a day or two.
---
## Key Takeaways
| Concept | Detail ||---|---|| **\*\*Local tests\*\*** | Run against your branch in isolation || **\*\*CI tests\*\*** | Run against a merge of your branch + latest \`main\` || **\*\*The merge ref\*\*** | GitHub maintains `refs/pull/<N>/merge` automatically || **\*\*Why it exists\*\*** | To catch integration issues before they reach \`main\` || **\*\*The fix\*\*** | Rebase your branch onto \`main\` to eliminate divergence |
The next time your tests pass locally but fail in CI, don't assume it's a flaky test or an environment issue. Check how far your branch has diverged from \`main\`:
\`\`\`bashgit log HEAD..origin/main --oneline | wc -l\`\`\`
If that number is anything other than zero, you likely have a merge integration problem — and a rebase is your friend.
---
*\*Understanding this CI behavior turns a frustrating debugging session into a 30-second diagnosis. The merge commit isn't a bug — it's a feature that keeps your \`main\` branch healthy.\**

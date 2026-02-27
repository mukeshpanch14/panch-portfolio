Title: Claude Code Hooks: Auto-Label Every Terminal Session
Date: 2026-02-27 10:00
Modified: 2026-02-27
Category: Technology
Tags: claude, agentic-coding, developer-tools, productivity, automation, python
Slug: claude-multi-terminal-session-labels
Author: Panch Mukesh
Summary: Replace Claude Code's random session hashes with meaningful labels like S1 and S2, so notifications tell you exactly which terminal needs your attention.
Status: published

Once you set up Claude Code notifications, you start using Claude more aggressively. More terminals, more tasks running in parallel. One fixing a bug, one writing tests, one refactoring a module.

And then your phone buzzes.

> **Action Required [pulse #a3f2]**

You have three terminals open. Which one is that? What was it working on? You have no idea without switching to each terminal and checking.

This is the multi-terminal problem. And it's surprisingly easy to fix.

---

## Why Random Hashes Are Useless

Claude Code identifies sessions with a UUID — something like `d524f0c1-0e93-49d5-9603-e0320534259f`. When you set up notifications, most examples trim that to the last four characters as a "tag", giving you things like `#a3f2` or `#b891`.

That's better than nothing, but it still doesn't tell you anything meaningful. You can't look at `#a3f2` and know it's the terminal that was fixing the auth bug. You have to go hunting.

What you actually want is something like this:

> **Action Required — pulse / S2 "add RBAC"**

Now you know exactly which terminal needs you. You don't even have to look at your screen to know.

---

## The Idea: A Session Registry

The fix is a small shared registry file that maps each session UUID to something human-readable.

Here's how it works:

1. When a session starts, assign it a short label: `S1`, `S2`, `S3` — sequential per project
2. When you type your first message, capture the first few words as a task summary
3. Store both in a JSON file at `~/.claude/session-registry.json`
4. Your notifications and statusline both read from this file

The result is that every terminal gets a unique, meaningful identity that matches up between your notification and your screen.

| Terminal | What you see in the statusline | What the notification says |
|---|---|---|
| Terminal 1 | `S1 "fix auth bug"` | `Action Required — pulse / S1 "fix auth bug"` |
| Terminal 2 | `S2 "add RBAC"` | `Action Required — pulse / S2 "add RBAC"` |
| Terminal 3 | `S3` *(no prompt yet)* | `Action Required — pulse / S3` |

---

## Building It

You need three pieces: a registry library, a hook that populates the registry, and updates to your existing notification script.

### 1. The Registry Library

This is the core. Save it to `~/.claude/hooks/session_registry.py`.

```python
#!/usr/bin/env python3
"""
Shared session registry for Claude Code.
Maps session UUIDs to human-readable labels like S1, S2, S3.
"""

import fcntl
import json
import os
import tempfile
from datetime import datetime, timezone

REGISTRY_PATH = os.path.expanduser("~/.claude/session-registry.json")
LOCK_PATH = REGISTRY_PATH + ".lock"
STALE_HOURS = 24


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _load(f):
    try:
        content = f.read()
        return json.loads(content) if content.strip() else {"sessions": {}}
    except (json.JSONDecodeError, AttributeError):
        return {"sessions": {}}


def _save(data):
    """Atomic write — readers never see a partial file."""
    dir_ = os.path.dirname(REGISTRY_PATH)
    with tempfile.NamedTemporaryFile("w", dir=dir_, delete=False, suffix=".tmp") as tmp:
        json.dump(data, tmp, indent=2)
        tmp_path = tmp.name
    os.rename(tmp_path, REGISTRY_PATH)


def _purge_stale(sessions):
    """Remove sessions not seen in the last 24 hours."""
    cutoff = datetime.now(timezone.utc).timestamp() - (STALE_HOURS * 3600)
    return {
        sid: s for sid, s in sessions.items()
        if datetime.fromisoformat(s["last_seen"]).timestamp() > cutoff
    }


def _next_seq(sessions, project):
    """Find the next available sequence number for a project."""
    used = {
        s["seq"] for s in sessions.values()
        if s.get("project") == project
    }
    seq = 1
    while seq in used:
        seq += 1
    return seq


def register_session(session_id, cwd):
    """
    Register a new session. Assigns it the next available S-number for its project.
    Safe to call multiple times — skips if already registered.
    """
    project = os.path.basename(cwd.rstrip("/")) if cwd else "unknown"

    try:
        lock = open(LOCK_PATH, "w")
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except (OSError, IOError):
        # Can't get lock — fall back silently
        return

    try:
        with open(REGISTRY_PATH, "r") as f:
            data = _load(f)
    except FileNotFoundError:
        data = {"sessions": {}}

    sessions = data.get("sessions", {})
    sessions = _purge_stale(sessions)

    # Don't re-register an existing session
    if session_id in sessions:
        sessions[session_id]["last_seen"] = _now_iso()
        data["sessions"] = sessions
        _save(data)
        return

    seq = _next_seq(sessions, project)
    sessions[session_id] = {
        "seq": seq,
        "project": project,
        "label": f"S{seq}",
        "task_summary": "",
        "started_at": _now_iso(),
        "last_seen": _now_iso(),
    }
    data["sessions"] = sessions
    _save(data)

    fcntl.flock(lock, fcntl.LOCK_UN)
    lock.close()


def update_task_summary(session_id, prompt):
    """
    Store the first prompt as the session's task summary.
    Only updates if no summary exists yet.
    """
    try:
        lock = open(LOCK_PATH, "w")
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except (OSError, IOError):
        return

    try:
        with open(REGISTRY_PATH, "r") as f:
            data = _load(f)
    except FileNotFoundError:
        return

    sessions = data.get("sessions", {})

    if session_id not in sessions:
        return

    # Only capture the very first prompt
    if not sessions[session_id].get("task_summary"):
        summary = prompt.strip().replace("\n", " ")[:40]
        sessions[session_id]["task_summary"] = summary
        sessions[session_id]["last_seen"] = _now_iso()
        data["sessions"] = sessions
        _save(data)

    fcntl.flock(lock, fcntl.LOCK_UN)
    lock.close()


def get_session_label(session_id):
    """
    Returns a human-readable label for a session.
    e.g. 'S1 "fix auth bug"' or falls back to '#a3f2' if not registered.
    """
    try:
        with open(REGISTRY_PATH, "r") as f:
            data = _load(f)
    except FileNotFoundError:
        return f"#{session_id[-4:]}"

    entry = data.get("sessions", {}).get(session_id)
    if not entry:
        return f"#{session_id[-4:]}"

    label = entry.get("label", f"#{session_id[-4:]}")
    summary = entry.get("task_summary", "")
    if summary:
        return f'{label} "{summary}"'
    return label
```

The two things worth noting here: **file locking** with `fcntl.flock` makes sure two sessions starting simultaneously don't both claim `S1`. And **atomic writes** via `os.rename` means readers can never catch the file in a half-written state.

---

### 2. The Hook That Feeds the Registry

This is the thin script that Claude Code actually calls. Save it to `~/.claude/hooks/session_register.py`.

```python
#!/usr/bin/env python3
"""
Hook entrypoint for SessionStart and UserPromptSubmit events.
Populates the session registry with labels and task summaries.
"""

import json
import sys
import os
sys.path.insert(0, os.path.expanduser("~/.claude/hooks"))
import session_registry


def main():
    try:
        data = json.loads(sys.stdin.read())
    except Exception:
        return

    session_id = data.get("session_id", "")
    event = data.get("hook_event_name", "")

    if not session_id:
        return

    if event == "SessionStart":
        cwd = data.get("cwd", os.getcwd())
        session_registry.register_session(session_id, cwd)

    elif event == "UserPromptSubmit":
        prompt = data.get("prompt", "")
        cwd = data.get("cwd", os.getcwd())
        # Auto-register in case SessionStart was missed
        session_registry.register_session(session_id, cwd)
        if prompt:
            session_registry.update_task_summary(session_id, prompt)


if __name__ == "__main__":
    main()
```

---

### 3. Update Your notify.py

You only need to change how the session tag is generated. Replace wherever you currently build the tag (the `#{last-4-chars}` part) with a call to `get_session_label`:

```python
import sys
import os
sys.path.insert(0, os.path.expanduser("~/.claude/hooks"))
import session_registry

# Replace this:
tag = f"#{session_id[-4:]}"

# With this:
tag = session_registry.get_session_label(session_id)
```

And update your notification title accordingly:

```python
notify(f"⚠️ Action Required — {project} / {tag}", f"Waiting to use: {tool}")
```

---

### 4. Register the New Hooks in settings.json

Add `SessionStart` and `UserPromptSubmit` to your hooks config in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/session_register.py",
            "timeout": 3
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/session_register.py",
            "timeout": 3
          }
        ]
      }
    ]
  }
}
```

---

## What the Registry File Looks Like

Once a few sessions have run, `~/.claude/session-registry.json` will look something like this:

```json
{
  "sessions": {
    "d524f0c1-0e93-49d5-9603-e0320534259f": {
      "seq": 1,
      "project": "pulse",
      "label": "S1",
      "task_summary": "fix auth bug in login flow",
      "started_at": "2026-02-21T01:47:00Z",
      "last_seen": "2026-02-21T02:13:00Z"
    },
    "b45b5be6-bb5b-43df-b8ce-48d22a03d893": {
      "seq": 2,
      "project": "pulse",
      "label": "S2",
      "task_summary": "add RBAC to dashboard endpoints",
      "started_at": "2026-02-21T01:52:00Z",
      "last_seen": "2026-02-21T02:10:00Z"
    }
  }
}
```

Sessions older than 24 hours get purged automatically the next time a new session registers. No cron jobs needed.

---

## Testing It

Open two terminals in the same project. In the first, type something like "fix the login bug". In the second, type "add unit tests for the auth module".

Now trigger a permission prompt in either terminal — ask Claude to run a bash command it hasn't run before. The notification should say something like:

> **⚠️ Action Required — pulse / S1 "fix the login bug"**

You'll know exactly which terminal it's coming from without looking.

---

## Extending It Further

Once the registry exists, you can use it for other things:

**Better statusline** — if you use the `statusLine` feature in `settings.json`, you can pull the session label from the registry and display it right in your terminal prompt. Then notifications and statusline show the same label, making it effortless to match them.

**Usage tracking** — log each session's task summary to a weekly file and you get a natural record of everything you've been using Claude for. Surprisingly useful for end-of-week reviews.

**Context-aware hooks** — route notifications differently based on what the session is doing. Critical tasks go to your phone, routine ones just make a sound.

---

## The Bigger Point

The random hash wasn't a feature, it was a placeholder. Claude Code's hook system is powerful enough to build real session identity on top of it — you just have to wire it together yourself.

Once you have meaningful labels, multi-terminal Claude Code goes from chaotic to genuinely manageable. You stop babysitting terminals and start trusting the system to tell you when it needs you.

That's the whole point.

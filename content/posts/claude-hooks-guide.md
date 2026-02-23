Title: Claude Code Hooks: Get Notified When It Needs You
Date: 2026-02-23 10:00
Modified: 2026-02-23
Category: Technology
Tags: claude, ai, hooks, productivity, developer-tools, notifications, agentic-coding
Slug: claude-hooks-guide
Author: Panch Mukesh
Summary: Stop babysitting the terminal. Claude Code hooks let you run scripts on task completion, permission prompts, and idle states — so you get notified the moment Claude needs you, no matter what you're doing.
Status: published

If you've been using Claude Code, you've probably done this at least once — kicked off a big task, switched to another window, and come back ten minutes later only to find Claude has been sitting idle, waiting for you to approve something.

It ran into a tool it needed permission to use. It had a question. It finished and was waiting for your next instruction. And it said nothing.

That's the problem hooks solve.

---

## What Are Hooks, Exactly?

Hooks are scripts that Claude Code runs automatically when certain things happen during a session.

Think of them like event listeners, but for your AI assistant. When Claude finishes a task, a hook runs. When it needs your approval to use a tool, a hook runs. When it's sitting idle waiting for your input, a hook runs.

What that hook *does* is entirely up to you. Most people use hooks to send themselves a notification so they can stop babysitting the terminal. But hooks can do anything a shell command can do — log to a file, call a webhook, send a Slack message, update a dashboard. The sky's the limit.

---

## The Four Events You'll Use Most

Claude Code has several hook events, but these four are the ones that actually matter day-to-day:

**`Stop`** fires when Claude finishes its turn and is waiting for your next message. This is the "come back, I'm done" notification.

**`Notification`** fires for specific situations Claude wants to flag — like when it hits a permission prompt and needs you to approve or deny something. This is the "I'm stuck, I need a human" notification.

**`TaskCompleted`** fires when a sub-agent finishes its work. Useful if you're running multi-agent workflows and want to track individual agent completions.

**`UserPromptSubmit`** fires right after you send a message. Useful for logging, preprocessing, or tracking what you're asking Claude to do.

---

## How to Set Up Your First Hook

Hooks live in your `~/.claude/settings.json` file. Here's the basic structure:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/notify.py",
            "timeout": 5
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/notify.py",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

The `matcher` field on `Notification` lets you filter — `permission_prompt` fires when Claude needs approval for a tool, `idle_prompt` fires when it's waiting for your input.

Notice the `timeout: 5`. This is important. Claude Code waits for your hook to finish before moving on. Keep your hooks fast, or they'll slow down your workflow. Five seconds is plenty for sending a notification.

---

## Writing a Simple notify.py

Claude Code sends your hook a JSON payload via stdin. Your script reads it, figures out what happened, and does something useful with that information.

Here's a minimal notification script for macOS:

```python
#!/usr/bin/env python3
import json
import subprocess
import sys

def sanitize(text):
    text = str(text)
    text = text.replace("\\", "\\\\")
    text = text.replace('"', '\\"')
    text = text.replace("\n", " ")
    return text[:200]

def notify(title, message):
    script = (
        f'display notification "{sanitize(message)}" '
        f'with title "{sanitize(title)}" '
        f'sound name "default"'
    )
    subprocess.Popen(
        ["/usr/bin/osascript", "-e", script],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

def main():
    try:
        data = json.loads(sys.stdin.read())
    except Exception:
        return

    # Don't fire notifications from inside a Stop hook to avoid loops
    if data.get("stop_hook_active"):
        return

    event = data.get("hook_event_name", "")

    if event == "Stop":
        notify("Claude Code", "Task complete — ready for your next instruction")

    elif event == "Notification":
        kind = data.get("notification", {}).get("type", "")
        if kind == "permission_prompt":
            tool = data.get("notification", {}).get("tool_name", "a tool")
            notify("⚠️ Claude needs your approval", f"Waiting to use: {tool}")
        elif kind == "idle_prompt":
            notify("Claude Code", "Waiting for your input")

if __name__ == "__main__":
    main()
```

Save this to `~/.claude/hooks/notify.py` and you're 90% of the way there.

---

## The macOS Gotcha Everyone Hits

If you set this up and notifications don't appear, the most common reason is a macOS permissions issue.

macOS requires that the app sending notifications (in this case, your terminal) is explicitly allowed to send Apple Events. If it's not, `osascript` fails silently — no error, no notification, nothing.

**How to check:** Run the osascript command manually from your terminal:

```bash
osascript -e 'display notification "test" with title "Test"'
```

If you see a permission dialog, click Allow. If nothing happens at all, go to **System Settings → Privacy & Security → Automation** and make sure your terminal app has permission to control System Events.

The script above runs osascript in the background with stderr suppressed, which means failures are silent. If you're debugging, temporarily change `stderr=subprocess.DEVNULL` to `stderr=subprocess.PIPE` and print any errors you get.

---

## Other Things You Can Do With Hooks

Notifications are just the start. Here are a few other patterns that work well:

**Logging every session to a file** — useful if you want to track what you've been asking Claude to do across projects:

```python
# In your Stop hook
with open(os.path.expanduser("~/.claude/session-log.txt"), "a") as f:
    f.write(f"{datetime.now().isoformat()} | {project} | Task complete\n")
```

**Posting to a Slack channel** — if you're running Claude on a server or want team visibility:

```python
import urllib.request
payload = json.dumps({"text": f"Claude finished a task in {project}"})
req = urllib.request.Request(SLACK_WEBHOOK_URL, data=payload.encode(), method="POST")
urllib.request.urlopen(req, timeout=3)
```

**Playing a sound without a visual notification** — sometimes you just want an audio cue:

```bash
afplay /System/Library/Sounds/Glass.aiff
```

---

## One Rule to Remember

Whatever your hook does, it must exit cleanly. Claude Code treats a non-zero exit code as a hook failure, and depending on your setup, that might block it from continuing. Always wrap your hook logic in a try/except and exit 0 even if something goes wrong.

The hook should never be the reason Claude gets stuck.

---

## Where to Go From Here

Once you have basic notifications working, you'll quickly notice the next problem: if you have Claude Code open in multiple terminals at once, all the notifications look the same. You can't tell which terminal is asking for your attention.

That's a solvable problem — and it's what the next post covers.

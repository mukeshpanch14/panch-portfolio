---
title: "How Claude Code Image Paste Actually Works"
date: 2026-03-20 10:00
modified: 2026-03-20
category: Technology
tags:
  - claude
  - ai
  - developer-tools
  - terminal
  - clipboard
slug: claude-code-image-paste
author: Panch Mukesh
summary: You see the word "image" appear in the terminal. Here's what's really happening underneath — from keystroke to API call.
status: published
---

When you paste a screenshot into Claude Code and see the word **"image"** appear in the input box, the terminal hasn't rendered a picture. It's done something far more interesting — and understanding why explains the whole platform story of why paste works on Mac but breaks on Windows.

## The misconception

Most developers assume image paste works like text paste: the terminal intercepts the clipboard content and streams it into the input field. That's completely wrong for images.

Terminals are fundamentally text-oriented. They deal in character streams — bytes that map to glyphs. Image data is binary, has no glyph representation, and terminals have no standard mechanism to display it inline (outside of exotic protocols like Kitty's graphics protocol or iTerm2's inline image spec, which Claude Code doesn't rely on).

> The terminal is just a trigger surface. The actual image data never flows through it at all.

## What actually happens, step by step

<div style="display:flex;flex-direction:column;gap:2px;margin:32px 0">
  <div style="display:flex;gap:20px;align-items:flex-start;padding:20px 24px;background:#fff;border:1px solid rgba(26,24,20,0.10);border-radius:10px 10px 4px 4px">
    <div style="flex-shrink:0;width:28px;height:28px;background:#1C1A16;color:#F5F3EE;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;margin-top:2px">1</div>
    <div>
      <div style="font-size:15px;font-weight:500;color:#1a1814;margin-bottom:4px">Keystroke interception</div>
      <p style="font-size:14px;color:#6b6760;margin:0;line-height:1.6">You press <code style="font-family:'DM Mono',monospace;font-size:12px;background:#ede9e0;padding:1px 5px;border-radius:3px;color:#c8501a">Ctrl+V</code> (or <code style="font-family:'DM Mono',monospace;font-size:12px;background:#ede9e0;padding:1px 5px;border-radius:3px;color:#c8501a">Alt+V</code> on Windows). Claude Code's TUI (terminal user interface) layer — built with a library like Ink or Blessed — intercepts this keystroke before the terminal's own paste handler fires.</p>
    </div>
  </div>
  <div style="display:flex;gap:20px;align-items:flex-start;padding:20px 24px;background:#fff;border:1px solid rgba(26,24,20,0.10);border-radius:4px">
    <div style="flex-shrink:0;width:28px;height:28px;background:#1C1A16;color:#F5F3EE;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;margin-top:2px">2</div>
    <div>
      <div style="font-size:15px;font-weight:500;color:#1a1814;margin-bottom:4px">OS clipboard API call</div>
      <p style="font-size:14px;color:#6b6760;margin:0;line-height:1.6">Claude Code calls the operating system's clipboard API directly — not the terminal's paste mechanism. On macOS this is the NSPasteboard API via OSC 52. It reads raw binary image bytes straight from the clipboard memory.</p>
    </div>
  </div>
  <div style="display:flex;gap:20px;align-items:flex-start;padding:20px 24px;background:#fff;border:1px solid rgba(26,24,20,0.10);border-radius:4px">
    <div style="flex-shrink:0;width:28px;height:28px;background:#1C1A16;color:#F5F3EE;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;margin-top:2px">3</div>
    <div>
      <div style="font-size:15px;font-weight:500;color:#1a1814;margin-bottom:4px">Base64 encoding in memory</div>
      <p style="font-size:14px;color:#6b6760;margin:0;line-height:1.6">The raw bytes are encoded to a base64 string entirely in Claude Code's process memory. Nothing is written to disk. The placeholder word <code style="font-family:'DM Mono',monospace;font-size:12px;background:#ede9e0;padding:1px 5px;border-radius:3px;color:#c8501a">"image"</code> appears in the input box as a UI affordance — it's just a label, not the data.</p>
    </div>
  </div>
  <div style="display:flex;gap:20px;align-items:flex-start;padding:20px 24px;background:#fff;border:1px solid rgba(26,24,20,0.10);border-radius:4px">
    <div style="flex-shrink:0;width:28px;height:28px;background:#1C1A16;color:#F5F3EE;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;margin-top:2px">4</div>
    <div>
      <div style="font-size:15px;font-weight:500;color:#1a1814;margin-bottom:4px">Bundled into the API payload</div>
      <p style="font-size:14px;color:#6b6760;margin:0;line-height:1.6">When you press Enter, the base64 string is assembled into a structured JSON content block alongside your text prompt and sent to Anthropic's <code style="font-family:'DM Mono',monospace;font-size:12px;background:#ede9e0;padding:1px 5px;border-radius:3px;color:#c8501a">/v1/messages</code> endpoint.</p>
    </div>
  </div>
  <div style="display:flex;gap:20px;align-items:flex-start;padding:20px 24px;background:#fff;border:1px solid rgba(26,24,20,0.10);border-radius:4px 4px 10px 10px">
    <div style="flex-shrink:0;width:28px;height:28px;background:#1C1A16;color:#F5F3EE;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;font-weight:500;margin-top:2px">5</div>
    <div>
      <div style="font-size:15px;font-weight:500;color:#1a1814;margin-bottom:4px">Tokenised server-side</div>
      <p style="font-size:14px;color:#6b6760;margin:0;line-height:1.6">Anthropic's API receives the image block, tokenises the pixel data using a vision encoder, and Claude processes both the image tokens and text tokens together in a single context window.</p>
    </div>
  </div>
</div>

![Fig 1 — How a paste event becomes an API call]({static}/images/blog/claude-code-image-paste/fig1-paste-flow-diagram.svg)

*Fig 1 — How a paste event becomes an API call*

## The API payload structure

This is what gets sent to the Anthropic API when you paste a screenshot and type a prompt. The image and text are sibling items in the same `content` array:

```json
{
  "role": "user",
  "content": [
    {
      "type": "image",
      "source": {
        "type": "base64",
        "media_type": "image/png",
        "data": "iVBORw0KGgoAAAANS..."
      }
    },
    {
      "type": "text",
      "text": "What's wrong with this layout?"
    }
  ]
}
```

The image is a proper first-class content block, not an attachment or a URL reference. It travels inline with the request as base64-encoded bytes. A 1000×1000 px screenshot costs roughly **1,334 tokens** — a meaningful but manageable chunk of a large context window.

## Why it breaks on Windows and Linux

The clipboard read relies on the terminal emulator cooperating with the OSC 52 escape sequence — a protocol that lets a terminal application read clipboard contents. The problem is image data.

Standard OSC 52 handles plain text only. It has no concept of MIME types, so when Claude Code asks the terminal "give me the clipboard", a Windows Terminal or PowerShell instance hands back nothing for binary image data — it simply doesn't know how to respond. The Kitty terminal created an extended protocol called OSC 5522 that adds MIME type awareness and supports images, but most terminals haven't adopted it yet.

<div style="background:#EDE9E0;border:1px solid rgba(26,24,20,0.20);border-radius:10px;padding:24px 28px;margin:32px 0">
  <p style="margin:0;color:#1a1814;font-size:15px">On macOS the default terminal emulators handle this gracefully. On Windows and Linux, the terminal layer is the bottleneck — workarounds like AutoHotkey scripts or VS Code extensions bypass it by saving the clipboard image to disk and pasting the file path instead.</p>
</div>

## Platform shortcuts at a glance

<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:28px 0">
  <div style="background:#D0EDE9;border:1px solid #1A7A6E;border-radius:10px;padding:20px">
    <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#1a7a6e;margin-bottom:8px">macOS</div>
    <div style="font-family:'DM Mono',monospace;font-size:16px;font-weight:500;color:#1a1814;margin-bottom:6px">Cmd + V</div>
    <p style="font-size:13px;color:#6b6760;margin:0;line-height:1.5">Works natively. Terminal cooperates with the OSC 52 read.</p>
  </div>
  <div style="background:#F2DDD3;border:1px solid #C8501A;border-radius:10px;padding:20px">
    <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#c8501a;margin-bottom:8px">Windows</div>
    <div style="font-family:'DM Mono',monospace;font-size:16px;font-weight:500;color:#1a1814;margin-bottom:6px">Ctrl + V</div>
    <p style="font-size:13px;color:#6b6760;margin:0;line-height:1.5">Requires workaround or AutoHotkey script to save image and inject path.</p>
  </div>
  <div style="background:#E8E3F7;border:1px solid #5A3DB8;border-radius:10px;padding:20px">
    <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#5a3db8;margin-bottom:8px">Linux</div>
    <div style="font-family:'DM Mono',monospace;font-size:16px;font-weight:500;color:#1a1814;margin-bottom:6px">Ctrl + V</div>
    <p style="font-size:13px;color:#6b6760;margin:0;line-height:1.5">Needs xclip (X11) or wl-clipboard (Wayland) installed and configured.</p>
  </div>
</div>

## The elegant part

What makes this design clever is that Claude Code treats images as a first-class input type without requiring any changes to the terminal protocol. The terminal is used only as a keyboard event source. All the real work — clipboard access, encoding, API communication — happens in Claude Code's own process, completely independent of the terminal's capabilities.

This is why the word "image" appears instead of an actual preview: the terminal has no idea an image was pasted. Claude Code just told it to display a placeholder string. The bytes are already in memory, waiting to be sent with your next prompt.

### Conclusion

Paste shortcut → Claude Code intercepts keystroke → OS clipboard API reads raw bytes → base64 encode in memory → show "image" placeholder in terminal → on Enter, send as a JSON content block to `/v1/messages` → Claude tokenises and processes it server-side. The terminal is never involved in the actual data transfer.

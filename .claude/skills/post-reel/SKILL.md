---
name: post-reel
description: Turn a blog post in content/posts/ into a 1080x1920 Instagram Reel (~23s, with SFX) using the Remotion project in video/. Use when the user asks for a reel, short, Instagram video, or social video for a post.
---

# post-reel

Generates a Reel from a blog post using the data-driven Remotion template in `video/`
(composition `HandoffReelV2`). Post-specific copy lives in a JSON file, never in the
scene code. The look comes from the `remotion-motion-graphics` rules (spring entrances,
stagger, five-layer stack, one hero color, synthesized SFX).

Argument: `$ARGUMENTS` = path to the post (default: the newest file in `content/posts/`
by front-matter `date`).

## Steps

1. **Read the post.** Pull out: the core claim (hook), the main flow or sequence (3 steps),
   one checklist (3-6 items), 2-4 "looks like X, is actually Y" failure/fix pairs,
   and the closing line. Use the post's own wording; do not invent claims the post
   does not make.
2. **Write `video/reels/<slug>.json`** matching `ReelContent` in
   `video/src/v2/content.ts`. See `video/reels/example-caching.json` for a filled example.
   Constraints that keep layout safe at 1080x1920:
   - hook: 4-8 short words total; mark at most 2 consecutive words `"hero": true` in outro, 0-1 in hook.
   - flow: exactly 3 nodes, 2 links (file/label names, short, monospace-friendly).
   - list: 3-6 items, each `[title, <=24 chars hint]`; `count` must equal `items.length`.
   - contrast: 2-4 cards, each `[problem, "fix"]`, fix <=34 chars.
   - Keep every string short. Reel text is read in 1-2 seconds.
   - Leave `outro.name` and `outro.cta` as the user's name and "Full post · link in bio" unless told otherwise.
3. **Install once** (local only, never global): `cd video && npm install`.
   Regenerate SFX if `video/public/sfx/` is missing: `npm run sfx`.
4. **Verify with stills first (fast, ~seconds each).** Frames at 40, 120, 230, 560 hit the
   hook, flow, list and contrast scenes; 650 hits the outro:
   ```bash
   cd video && for f in 40 120 230 560 650; do
     npx remotion still src/index.ts HandoffReelV2 out/chk_$f.png --frame=$f \
       --props=reels/<slug>.json --overwrite $RENDER_FLAGS
   done
   ```
   Read every PNG. Check: text inside the middle ~75% vertically, nothing clipped or
   overlapping, exactly one orange hero element per frame, copy fits on its card.
   Fix the JSON and re-run until clean.
5. **Render the video:**
   ```bash
   npm run reel -- reels/<slug>.json $RENDER_FLAGS      # -> out/reel.mp4
   ```
   Move/rename to `out/<slug>-reel.mp4`. Expect ~15-20 minutes in a sandbox with software GL
   (blur + grain layers); run it in the background and wait for completion, do not poll.
6. **Verify the encode:** `ffprobe` should show h264 1080x1920 ~23s plus an aac stream.
   Extract frames with `ffmpeg -ss <t> -i out/<slug>-reel.mp4 -frames:v 1` at ~0.6, 5, 12, 17, 21s
   and look at them before delivering.
7. **Deliver** the MP4 (SendUserFile when available). Mention that SFX/pad are synthetic
   and that a real music track can be dropped in via `public/` + an `<Audio>` in
   `video/src/v2/HandoffReelV2.tsx`.

## Render flags in sandboxes

Remotion cannot download its own browser offline. Use the preinstalled Chromium:

```
RENDER_FLAGS="--browser-executable=/opt/pw-browsers/chromium --chrome-mode=chrome-for-testing --gl=swangle"
```

On a normal machine omit them.

## Changing the look

Edit `video/src/v2/theme.ts` (colors, fonts, easings, springs, scene lengths in seconds).
Never inline hex colors or easings in components. Scene lengths are in `theme.scenes`;
if you change them the composition duration follows automatically (`durationV2`).

## Don'ts

- Do not hard-code post text in `scenes/Scenes.tsx`; add fields to `ReelContent` instead.
- Do not use emoji as icons (they ignore the palette).
- Do not deliver without having looked at extracted frames.
- Do not install anything globally.

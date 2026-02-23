Add Pelican metadata to a blog post in this project so it can be built and deployed via GitHub Pages.

## How to use
Run as: `/post-metadata content/posts/your-post.md`

The file to process is: $ARGUMENTS

## Steps

1. Read the target file at the path given in `$ARGUMENTS`.
2. Extract the H1 heading (the line starting with `#`) — this becomes the **Title**.
3. Remove that H1 line (and any immediately following blank line) from the content, since Pelican uses the metadata Title field instead.
4. Derive the **Slug** from the filename (strip the `.md` extension, keep hyphens as-is).
5. Generate the metadata block and prepend it to the file content.

## Metadata format

Use this exact format (field order matters for readability):

```
Title: <extracted from H1>
Date: <today's date as YYYY-MM-DD> 10:00
Modified: <today's date as YYYY-MM-DD>
Category: Technology
Tags: <comma-separated lowercase tags — pick 4–7 relevant ones from the content>
Slug: <derived from filename>
Author: Panch Mukesh
Summary: <one punchy sentence capturing the post's core value — no more than 30 words>
Status: published
```

## Field conventions for this project

- **Category** is always `Technology` unless the post is clearly non-technical (e.g. personal essays → `Personal`).
- **Author** is always `Panch Mukesh`.
- **Tags**: lowercase, hyphenated for multi-word (e.g. `developer-tools`, `agentic-coding`). Pick tags that reflect the post's primary topics. Common tags already in use: `ai`, `claude`, `agentic-coding`, `productivity`, `software-development`, `developer-tools`, `llm`, `context-engineering`, `github`, `mcp`, `python`, `automation`.
- **Summary**: write it fresh from the content — don't copy the intro sentence verbatim. Make it useful as a social/RSS snippet.
- **Status**: always `published` unless the user says otherwise.

## After editing the file

Confirm what was added and show the final metadata block to the user.

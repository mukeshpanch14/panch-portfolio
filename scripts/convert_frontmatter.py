#!/usr/bin/env python3
"""
Convert YAML frontmatter to Pelican format at build time.

Scans content/posts/*.md and rewrites any file that starts with YAML frontmatter
(--- delimiters) into Pelican's colon-only format. Files already in Pelican format
are left untouched (idempotent).

This script runs in CI before `pelican content` and does NOT commit changes back.
"""

import os
import re
import sys

POSTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "content", "posts")

# Fields whose values are YAML lists (comma-joined in Pelican format)
LIST_FIELDS = {"tags"}


def parse_yaml_frontmatter(text):
    """
    Parse a minimal YAML frontmatter block (flat key:value + simple lists).
    Returns (fields_dict, body_text) or (None, None) if not YAML frontmatter.
    """
    if not text.startswith("---"):
        return None, None

    # Find the closing ---
    rest = text[3:]
    if rest.startswith("\n"):
        rest = rest[1:]

    end = rest.find("\n---")
    if end == -1:
        return None, None

    yaml_block = rest[:end]
    body = rest[end + 4:]  # skip \n---
    if body.startswith("\n"):
        body = body[1:]

    fields = {}
    lines = yaml_block.split("\n")
    i = 0
    current_key = None

    while i < len(lines):
        line = lines[i]

        # List item continuation
        if line.startswith("  - ") or line.startswith("- "):
            stripped = line.lstrip("- ").strip()
            if current_key is not None:
                if isinstance(fields[current_key], list):
                    fields[current_key].append(stripped)
            i += 1
            continue

        # Key: value line
        m = re.match(r'^(\w+):\s*(.*)', line)
        if m:
            current_key = m.group(1).lower()
            value = m.group(2).strip()
            if value == "":
                # Might be a list on next lines
                fields[current_key] = []
            else:
                # Inline list: [a, b, c]
                if value.startswith("[") and value.endswith("]"):
                    inner = value[1:-1]
                    fields[current_key] = [v.strip().strip("'\"") for v in inner.split(",") if v.strip()]
                else:
                    # Strip surrounding quotes
                    fields[current_key] = value.strip("'\"")
        i += 1

    return fields, body


def to_pelican_format(fields, body):
    """Render fields dict + body as Pelican colon-format metadata."""
    # Canonical field order
    ORDER = ["title", "date", "modified", "category", "tags", "slug", "author", "summary", "status"]
    lines = []

    for key in ORDER:
        if key not in fields:
            continue
        value = fields[key]
        if isinstance(value, list):
            value = ", ".join(value)
        # Capitalize field name
        lines.append(f"{key.capitalize()}: {value}")

    # Any extra fields not in the canonical order
    for key, value in fields.items():
        if key.lower() not in ORDER:
            if isinstance(value, list):
                value = ", ".join(value)
            lines.append(f"{key.capitalize()}: {value}")

    return "\n".join(lines) + "\n\n" + body


def convert_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Already Pelican format (no --- at top)
    if not content.startswith("---"):
        return False

    fields, body = parse_yaml_frontmatter(content)
    if fields is None:
        print(f"  WARNING: Could not parse YAML frontmatter in {path}", file=sys.stderr)
        return False

    pelican_content = to_pelican_format(fields, body)

    with open(path, "w", encoding="utf-8") as f:
        f.write(pelican_content)

    return True


def main():
    converted = 0
    skipped = 0

    for filename in sorted(os.listdir(POSTS_DIR)):
        if not filename.endswith(".md"):
            continue
        path = os.path.join(POSTS_DIR, filename)
        if convert_file(path):
            print(f"  Converted: {filename}")
            converted += 1
        else:
            skipped += 1

    print(f"\nDone: {converted} converted, {skipped} already in Pelican format.")


if __name__ == "__main__":
    main()

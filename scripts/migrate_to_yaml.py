#!/usr/bin/env python3
"""
One-time migration: convert all existing Pelican-format posts to YAML frontmatter.

Run this locally once, commit the result, then push. After confirming everything
works, this script can be deleted.

Converts:
    Title: My Post          →    ---
    Tags: claude, ai             title: My Post
                                 tags:
    Body here.                     - claude
                                   - ai
                                 ---

                                 Body here.
"""

import os
import re

POSTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "content", "posts")

# Fields whose Pelican comma-separated values should become YAML lists
LIST_FIELDS = {"tags"}


def parse_pelican_frontmatter(text):
    """
    Parse Pelican colon-format metadata from the top of a file.
    Returns (fields_dict, body_text) or (None, None) if already YAML.
    """
    # Already YAML frontmatter
    if text.startswith("---"):
        return None, None

    lines = text.split("\n")
    fields = {}
    body_start = 0

    i = 0
    while i < len(lines):
        line = lines[i]
        # Blank line signals end of metadata
        if line.strip() == "":
            body_start = i + 1
            break
        m = re.match(r'^(\w[\w\s]*):\s*(.*)', line)
        if m:
            key = m.group(1).strip().lower()
            value = m.group(2).strip()
            fields[key] = value
        else:
            # Continuation or body started without blank line
            body_start = i
            break
        i += 1

    body = "\n".join(lines[body_start:])
    return fields, body


def to_yaml_frontmatter(fields, body):
    """Render fields dict + body as YAML frontmatter."""
    # Canonical field order
    ORDER = ["title", "date", "modified", "category", "tags", "slug", "author", "summary", "status"]
    yaml_lines = ["---"]

    for key in ORDER:
        if key not in fields:
            continue
        value = fields[key]
        if key in LIST_FIELDS:
            # Split comma-separated into YAML list
            items = [v.strip() for v in value.split(",") if v.strip()]
            yaml_lines.append(f"{key}:")
            for item in items:
                yaml_lines.append(f"  - {item}")
        else:
            # Quote values that contain colons or special chars
            if ":" in value or value.startswith("{") or value.startswith("["):
                yaml_lines.append(f'{key}: "{value}"')
            else:
                yaml_lines.append(f"{key}: {value}")

    # Any extra fields not in canonical order
    for key, value in fields.items():
        if key.lower() not in ORDER:
            yaml_lines.append(f"{key}: {value}")

    yaml_lines.append("---")
    yaml_lines.append("")

    return "\n".join(yaml_lines) + "\n" + body


def migrate_file(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    fields, body = parse_pelican_frontmatter(content)
    if fields is None:
        return False  # Already YAML

    yaml_content = to_yaml_frontmatter(fields, body)

    with open(path, "w", encoding="utf-8") as f:
        f.write(yaml_content)

    return True


def main():
    migrated = 0
    skipped = 0

    for filename in sorted(os.listdir(POSTS_DIR)):
        if not filename.endswith(".md"):
            continue
        path = os.path.join(POSTS_DIR, filename)
        if migrate_file(path):
            print(f"  Migrated: {filename}")
            migrated += 1
        else:
            print(f"  Skipped (already YAML): {filename}")
            skipped += 1

    print(f"\nDone: {migrated} migrated, {skipped} skipped.")
    print("\nNext steps:")
    print("  1. Review the converted posts (git diff content/posts/)")
    print("  2. Run: python scripts/convert_frontmatter.py  (verify round-trip)")
    print("  3. Commit and push")


if __name__ == "__main__":
    main()

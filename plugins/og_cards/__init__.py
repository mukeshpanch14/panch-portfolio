"""Generate branded 1200x630 Open Graph share cards for every article.

Renders one PNG per article into output/images/og/{slug}.png using the
site's warm-paper palette. Referenced by partial/og_article.html and
partial/jsonld_article.html as the fallback share image when a post has
no explicit `cover`.
"""

import logging
import os

from pelican import signals

logger = logging.getLogger(__name__)

CARD_WIDTH = 1200
CARD_HEIGHT = 630
MARGIN = 80

BG = "#F7F3EC"
ACCENT = "#B8441A"
TEXT = "#2C2B28"
MUTED = "#6B665E"

FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")
TITLE_FONT = os.path.join(FONT_DIR, "Lora-Bold.ttf")
LABEL_FONT = os.path.join(FONT_DIR, "DMSans-Regular.ttf")

MAX_LINES = 4

_articles = []


def collect_articles(generator):
    global _articles
    _articles = list(generator.articles)


def _wrap_title(draw, text, font, max_width):
    """Greedy word wrap measured with the actual font."""
    lines = []
    line = ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def _fit_title(draw, text, max_width):
    """Shrink the title font until it fits in MAX_LINES; ellipsize as last resort."""
    from PIL import ImageFont

    for size in range(68, 39, -4):
        font = ImageFont.truetype(TITLE_FONT, size)
        lines = _wrap_title(draw, text, font, max_width)
        if len(lines) <= MAX_LINES:
            return font, lines
    lines = lines[:MAX_LINES]
    lines[-1] = lines[-1].rstrip(".,;: ") + "…"
    return font, lines


def _draw_card(article, dest):
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (CARD_WIDTH, CARD_HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    # Accent bar across the top
    draw.rectangle([0, 0, CARD_WIDTH, 14], fill=ACCENT)

    label_font = ImageFont.truetype(LABEL_FONT, 30)
    max_width = CARD_WIDTH - 2 * MARGIN

    # Category label
    category = str(article.category).upper()
    draw.text((MARGIN, 96), category, font=label_font, fill=ACCENT)

    # Title, vertically anchored below the category. Raw YAML frontmatter
    # (local builds skip convert_frontmatter.py) can leave quotes around it.
    title = article.title.strip()
    if len(title) >= 2 and title[0] == title[-1] and title[0] in "\"'":
        title = title[1:-1]
    title_font, lines = _fit_title(draw, title, max_width)
    y = 160
    line_height = int(title_font.size * 1.25)
    for line in lines:
        draw.text((MARGIN, y), line, font=title_font, fill=TEXT)
        y += line_height

    # Footer: site name + date
    footer_y = CARD_HEIGHT - MARGIN - 30
    draw.text((MARGIN, footer_y), "panchmukesh.in", font=label_font, fill=ACCENT)
    date_text = article.date.strftime("%b %d, %Y")
    date_width = draw.textlength(date_text, font=label_font)
    draw.text((CARD_WIDTH - MARGIN - date_width, footer_y), date_text,
              font=label_font, fill=MUTED)

    img.save(dest, "PNG")


def render_cards(pelican_obj):
    try:
        import PIL  # noqa: F401
    except ImportError:
        logger.error("og_cards: Pillow is not installed; skipping OG card generation")
        return

    out_dir = os.path.join(pelican_obj.output_path, "images", "og")
    os.makedirs(out_dir, exist_ok=True)

    generated = 0
    for article in _articles:
        dest = os.path.join(out_dir, f"{article.slug}.png")
        source = article.source_path
        # Skip unchanged articles so `pelican -lr` rebuilds stay fast
        if (os.path.exists(dest) and os.path.exists(source)
                and os.path.getmtime(dest) >= os.path.getmtime(source)):
            continue
        try:
            _draw_card(article, dest)
            generated += 1
        except Exception:
            logger.exception("og_cards: failed to render card for %s", article.slug)
    if generated:
        logger.info("og_cards: generated %d share card(s)", generated)


def register():
    signals.article_generator_finalized.connect(collect_articles)
    signals.finalized.connect(render_cards)

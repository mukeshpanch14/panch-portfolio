# Panch Mukesh - Personal Website

This is my personal website built with Pelican, a static site generator written in Python.

## Features

- **About Me Page**: Professional background and skills
- **Blog**: Markdown-based blog posts with categories and tags
- **Responsive Design**: Clean, modern theme that works on all devices
- **RSS Feeds**: Automatic feed generation for blog subscribers

## Project Structure

```
panch-portfolio/
├── content/
│   ├── pages/          # Static pages (About Me, etc.)
│   └── posts/          # Blog posts in Markdown
├── output/             # Generated static site
├── themes/             # Pelican themes
├── pelicanconf.py      # Main configuration
├── publishconf.py      # Production configuration
└── Makefile           # Build automation
```

## Getting Started

### Prerequisites

- Python 3.6+
- Virtual environment (recommended)

### Installation

1. Clone this repository
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install pelican markdown
   ```

### Development

1. Activate the virtual environment:
   ```bash
   source venv/bin/activate
   ```

2. Generate the site:
   ```bash
   pelican content
   ```

3. Start the development server:
   ```bash
   pelican --listen
   ```

4. Open your browser and go to `http://localhost:8000`

### Adding Content

#### Blog Posts
Create new `.md` files in the `content/posts/` directory with the following metadata:

```markdown
Title: Your Post Title
Date: YYYY-MM-DD
Category: Category Name
Tags: tag1, tag2, tag3
Slug: your-post-slug
Status: published

# Your Post Content

Your blog post content goes here...
```

#### Pages
Create new `.md` files in the `content/pages/` directory for static pages like About Me.

### Customization

- **Theme**: Modify `THEME` in `pelicanconf.py`
- **Site Settings**: Update `pelicanconf.py` for site-wide settings
- **Social Links**: Add your social media links in the `SOCIAL` section
- **Navigation**: Customize the `LINKS` section for additional navigation

### Deployment

The site generates static files in the `output/` directory that can be deployed to any web server or static hosting service like:

- GitHub Pages
- Netlify
- AWS S3
- Any web hosting provider

## License

This project is open source and available under the [MIT License](LICENSE).

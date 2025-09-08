AUTHOR = 'Panch Mukesh'
SITENAME = 'Panch Mukesh'
SITEURL = ""

PATH = "content"

TIMEZONE = 'Asia/Kolkata'

DEFAULT_LANG = 'en'

# Static files configuration
STATIC_PATHS = ['images', 'extra']

# Feed generation
FEED_ALL_ATOM = 'feeds/all.atom.xml'
CATEGORY_FEED_ATOM = 'feeds/{slug}.atom.xml'
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

DEFAULT_PAGINATION = 10

# Additional configuration
DISPLAY_PAGES_ON_MENU = True
DISPLAY_CATEGORIES_ON_MENU = True
DISPLAY_TAGS_ON_SIDEBAR = True
DISPLAY_RECENT_POSTS_ON_SIDEBAR = True
RECENT_POST_COUNT = 5

# Theme configuration
THEME = 'themes/flex'

# Flex theme specific settings
SITELOGO = 'images/profile.png'  # You can add your profile image
SITETITLE = 'Panch Mukesh'
SITESUBTITLE = 'Personal Website & Blog'
SITEDESCRIPTION = 'Welcome to my personal website where I share my thoughts on technology, programming, and more.'
SITEURL = ''

# Flex theme navigation
MAIN_MENU = True
MENUITEMS = (
    ('About', '/pages/about.html'),
    ('Archives', '/archives.html'),
    ('Categories', '/categories.html'),
    ('Tags', '/tags.html'),
)

# Flex theme social links
SOCIAL = (
    ('github', '#'),
    ('linkedin', '#'),
    ('envelope', 'mailto:your-email@example.com'),
)

# Flex theme additional settings
COPYRIGHT_YEAR = 2025
COPYRIGHT_NAME = 'Panch Mukesh'
CC_LICENSE = {
    'name': 'Creative Commons Attribution-ShareAlike',
    'version': '4.0',
    'slug': 'by-sa'
}

# Flex theme sidebar
SIDEBAR_ON_INDEX = True
SIDEBAR_ON_ARTICLE = True
SIDEBAR_ON_PAGE = True

# Markdown extensions
MARKDOWN = {
    'extension_configs': {
        'markdown.extensions.codehilite': {'css_class': 'highlight'},
        'markdown.extensions.extra': {},
        'markdown.extensions.meta': {},
    },
    'output_format': 'html5',
}

# Use relative URLs for proper theme loading
RELATIVE_URLS = True

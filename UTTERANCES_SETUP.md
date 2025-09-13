# Utterances Comments Setup

This document explains how Utterances comments are configured for this Pelican blog.

## What is Utterances?

Utterances is a lightweight comments widget built on GitHub issues. It uses GitHub's API to create issues for each blog post and stores comments as GitHub issue comments.

## Configuration

The Utterances comments are configured in `pelicanconf.py`:

```python
# Utterances Comments Configuration
UTTERANCES_REPO = "mukeshpanch14/panch-portfolio"
UTTERANCES_ISSUE_TERM = "pathname"
UTTERANCES_LABEL = "Comments"
UTTERANCES_THEME = "github-light"
```

## How it Works

1. **Automatic Comments**: Every blog post automatically gets a comments section
2. **GitHub Integration**: Comments are stored as GitHub issues in your repository
3. **Issue Creation**: When someone visits a post, Utterances creates a GitHub issue with the post's pathname as the title
4. **Comment Storage**: All comments are stored as GitHub issue comments

## Managing Comments

As the repository owner, you have full control over comments:

### To Delete a Comment:
1. Go to your GitHub repository: https://github.com/mukeshpanch14/panch-portfolio
2. Click on "Issues" tab
3. Find the issue for the specific blog post (it will be labeled "Comments")
4. Click on the comment you want to delete
5. Click the "..." menu next to the comment
6. Select "Delete"

### To Close/Reopen Comments:
1. Go to the issue for the specific post
2. Click "Close issue" to disable comments for that post
3. Click "Reopen issue" to enable comments again

## Setup Requirements

1. **GitHub App Installation**: The Utterances GitHub app must be installed on your repository
2. **Repository Access**: The app needs permission to create issues and comments
3. **Public Repository**: Your repository must be public for Utterances to work

## Installation Steps

1. Go to https://github.com/apps/utterances
2. Click "Install" and select your repository
3. Authorize the app to access your repository
4. The comments will automatically appear on all blog posts

## Customization

You can customize the appearance by modifying the `UTTERANCES_THEME` setting in `pelicanconf.py`:

- `github-light` (default)
- `github-dark`
- `preferred-color-scheme`
- `github-dark-orange`
- `icy-dark`
- `dark-blue`
- `photon-dark`
- `boxy-light`
- `gruvbox-dark`

## Files Modified

- `pelicanconf.py`: Added Utterances configuration
- `themes/flex/templates/partial/utterances.html`: Created Utterances template
- `themes/flex/templates/article.html`: Added Utterances include

## Benefits

- ✅ Free and open source
- ✅ No external dependencies
- ✅ Comments stored in your GitHub repository
- ✅ Full moderation control
- ✅ Works with static sites
- ✅ No database required
- ✅ Automatic spam protection via GitHub

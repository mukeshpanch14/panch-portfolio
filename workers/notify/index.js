/**
 * panch-notify — Cloudflare Worker
 *
 * Routes:
 *   POST /subscribe     — store email + token in KV
 *   POST /notify        — triggered by GitHub Actions after deploy; send emails via Resend
 *   GET  /unsubscribe   — remove subscriber from KV
 *
 * Required Worker secrets (set via `wrangler secret put`):
 *   RESEND_API_KEY      — Resend API key
 *   WEBHOOK_SECRET      — shared secret validated on /notify requests
 *   ADMIN_EMAIL         — always receives new-post alerts (the blog author)
 *   FROM_EMAIL          — verified sender address on Resend, e.g. notify@panchmukesh.in
 *
 * KV namespace bound as SUBSCRIBERS (see wrangler.toml).
 */

const SITE_URL = 'https://panchmukesh.in';
const GITHUB_REPO = 'mukeshpanch14/panch-portfolio';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCorsHeaders(origin) {
  if (origin && origin.startsWith('https://panchmukesh.in')) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };
  }
  return {};
}

function jsonResponse(data, status = 200, cors = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function htmlPage(bodyContent, status = 200) {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Panch Mukesh — Blog Notifications</title>
<style>body{font-family:sans-serif;max-width:560px;margin:60px auto;padding:0 20px;color:#333}
a{color:#0066cc}</style></head>
<body>${bodyContent}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// ---------------------------------------------------------------------------
// POST /subscribe
// ---------------------------------------------------------------------------

async function handleSubscribe(request, env) {
  const origin = request.headers.get('Origin') || '';
  const cors = getCorsHeaders(origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400, cors);
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Please provide a valid email address.' }, 400, cors);
  }

  // Idempotent — already subscribed is fine
  const existing = await env.SUBSCRIBERS.get(`sub:${email}`);
  if (existing) {
    return jsonResponse({ message: "You're already subscribed!" }, 200, cors);
  }

  const token = crypto.randomUUID();
  const record = { email, token, created_at: new Date().toISOString() };

  await env.SUBSCRIBERS.put(`sub:${email}`, JSON.stringify(record));
  await env.SUBSCRIBERS.put(`token:${token}`, email);

  return jsonResponse({ message: "Subscribed! You'll get an email when a new post goes live." }, 200, cors);
}

// ---------------------------------------------------------------------------
// POST /notify  (called by GitHub Actions after a successful deploy)
// ---------------------------------------------------------------------------

async function handleNotify(request, env) {
  const secret = request.headers.get('X-Webhook-Secret');
  if (!secret || secret !== env.WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body.', { status: 400 });
  }

  const { commit_sha } = body;
  if (!commit_sha) {
    return new Response('Missing commit_sha in request body.', { status: 400 });
  }

  // ---- 1. Fetch commit metadata from GitHub API ----
  const commitRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/commits/${commit_sha}`,
    {
      headers: {
        'User-Agent': 'panch-notify-worker/1.0',
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  if (!commitRes.ok) {
    const text = await commitRes.text();
    console.error('GitHub API error:', commitRes.status, text);
    return new Response(`GitHub API error: ${commitRes.status}`, { status: 502 });
  }

  const commitData = await commitRes.json();
  const files = commitData.files || [];

  // ---- 2. Filter for newly added .md files under content/posts/ ----
  const newPostFiles = files.filter(
    f => f.status === 'added' &&
         f.filename.startsWith('content/posts/') &&
         f.filename.endsWith('.md')
  );

  if (newPostFiles.length === 0) {
    return jsonResponse({ message: 'No new posts detected; nothing to notify.' });
  }

  // ---- 3. Fetch post details (title, slug, excerpt) from GitHub contents API ----
  const posts = (
    await Promise.all(newPostFiles.map(f => fetchPostDetails(f.filename, commit_sha)))
  ).filter(Boolean);

  if (posts.length === 0) {
    return jsonResponse({ message: 'Could not read post details; skipping notifications.' });
  }

  // ---- 4. Collect subscribers ----
  const listResult = await env.SUBSCRIBERS.list({ prefix: 'sub:' });
  const subscribers = (
    await Promise.all(
      listResult.keys.map(async k => {
        const val = await env.SUBSCRIBERS.get(k.name);
        return val ? JSON.parse(val) : null;
      })
    )
  ).filter(Boolean);

  // ---- 5. Send emails ----
  const workerOrigin = new URL(request.url).origin;
  let emailsSent = 0;

  for (const post of posts) {
    // Admin always receives (no unsubscribe link)
    if (env.ADMIN_EMAIL) {
      await sendEmail(env, env.ADMIN_EMAIL, post, null);
      emailsSent++;
    }

    for (const sub of subscribers) {
      const unsubUrl = `${workerOrigin}/unsubscribe?token=${sub.token}`;
      await sendEmail(env, sub.email, post, unsubUrl);
      emailsSent++;
    }
  }

  return jsonResponse({ message: 'Notifications dispatched.', posts: posts.length, emails: emailsSent });
}

// ---- GitHub contents fetch + frontmatter parse ----

async function fetchPostDetails(filePath, sha) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${sha}`,
      {
        headers: {
          'User-Agent': 'panch-notify-worker/1.0',
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    // GitHub returns base64-encoded content with newlines
    const content = atob(data.content.replace(/\n/g, ''));

    const title = extractFrontmatterField(content, 'title') || filePathToTitle(filePath);
    const slug  = extractFrontmatterField(content, 'slug')  || filePathToSlug(filePath);
    const excerpt = extractExcerpt(content);

    return { title, slug, excerpt, url: `${SITE_URL}/${slug}.html` };
  } catch (err) {
    console.error('fetchPostDetails error:', filePath, err);
    return null;
  }
}

function extractFrontmatterField(content, field) {
  // YAML block (--- ... ---)
  const yamlBlock = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (yamlBlock) {
    const re = new RegExp(`^${field}:\\s*["']?(.+?)["']?\\s*$`, 'im');
    const m = yamlBlock[1].match(re);
    if (m) return m[1].trim();
  }
  // Pelican key-value header (Title: ...)
  const re = new RegExp(`^${field}:\\s*(.+)$`, 'im');
  const m = content.match(re);
  return m ? m[1].trim() : null;
}

function filePathToSlug(filePath) {
  // "content/posts/my-post.md" → "my-post"
  return filePath.replace(/^.*\//, '').replace(/\.md$/, '');
}

function filePathToTitle(filePath) {
  return filePathToSlug(filePath)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function extractExcerpt(content, maxLen = 220) {
  // Strip YAML/Pelican frontmatter
  let body = content
    .replace(/^---[\s\S]*?---\s*\n?/, '')
    .replace(/^(?:[A-Z][a-z-]+:\s*.+\n)+\s*\n?/, '');
  // Strip common Markdown syntax
  body = body
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  return body.length > maxLen ? body.slice(0, maxLen) + '…' : body;
}

// ---- Resend email send ----

async function sendEmail(env, to, post, unsubscribeUrl) {
  const unsubHtml = unsubscribeUrl
    ? `<p style="font-size:12px;color:#888;margin-top:28px;border-top:1px solid #eee;padding-top:12px">
         Don't want these emails?
         <a href="${unsubscribeUrl}" style="color:#888">Unsubscribe</a>
       </p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:28px 20px;color:#333;background:#fff">
  <p style="margin:0 0 4px;font-size:13px;color:#888">New post on</p>
  <h2 style="margin:0 0 16px;font-size:20px;color:#111">Panch Mukesh's Blog</h2>
  <h3 style="margin:0 0 10px">
    <a href="${post.url}" style="color:#0055cc;text-decoration:none">${escapeHtml(post.title)}</a>
  </h3>
  ${post.excerpt ? `<p style="color:#555;line-height:1.6;margin:0 0 20px">${escapeHtml(post.excerpt)}</p>` : ''}
  <a href="${post.url}"
     style="display:inline-block;background:#0055cc;color:#fff;padding:10px 22px;border-radius:5px;text-decoration:none;font-size:15px">
    Read post →
  </a>
  ${unsubHtml}
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to,
      subject: `New post: ${post.title}`,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Resend error (${to}): ${res.status} ${errText}`);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// GET /unsubscribe?token=<uuid>
// ---------------------------------------------------------------------------

async function handleUnsubscribe(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return htmlPage('<h2>Invalid link</h2><p>No token was found in this URL.</p>', 400);
  }

  const email = await env.SUBSCRIBERS.get(`token:${token}`);
  if (!email) {
    return htmlPage(
      '<h2>Already unsubscribed</h2><p>This link is invalid or has already been used.</p>'
    );
  }

  await env.SUBSCRIBERS.delete(`sub:${email}`);
  await env.SUBSCRIBERS.delete(`token:${token}`);

  return htmlPage(
    `<h2>Unsubscribed</h2>
     <p>You've been removed from the mailing list. No more emails.</p>
     <p><a href="${SITE_URL}">← Back to blog</a></p>`
  );
}

// ---------------------------------------------------------------------------
// Main fetch handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // CORS preflight
    if (method === 'OPTIONS') {
      const origin = request.headers.get('Origin') || '';
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }

    if (path === '/subscribe' && method === 'POST') return handleSubscribe(request, env);
    if (path === '/notify'    && method === 'POST') return handleNotify(request, env);
    if (path === '/unsubscribe' && method === 'GET') return handleUnsubscribe(request, env);

    return new Response('Not Found', { status: 404 });
  },
};

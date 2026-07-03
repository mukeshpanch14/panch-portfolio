/* Article-only interactivity: reading progress bar + table of contents. */
(function () {
  'use strict';

  var body = document.querySelector('.article-body');
  if (!body) return;

  /* ── Reading progress bar ──────────────────────────────── */
  var bar = document.createElement('div');
  bar.className = 'progress-bar';
  document.body.appendChild(bar);

  function updateBar() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    bar.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateBar();
      ticking = false;
    });
  }, { passive: true });
  updateBar();

  /* ── Table of contents ─────────────────────────────────── */
  // Only headings with ids (added by markdown.extensions.toc) are linkable
  var headings = body.querySelectorAll('h2[id], h3[id]');
  if (headings.length < 3) return;

  var details = document.createElement('details');
  details.className = 'toc';
  details.open = true;

  var summary = document.createElement('summary');
  summary.textContent = 'Contents';
  details.appendChild(summary);

  var list = document.createElement('ol');
  headings.forEach(function (h) {
    var li = document.createElement('li');
    li.className = 'toc__' + h.tagName.toLowerCase();
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    list.appendChild(li);
  });
  details.appendChild(list);
  body.insertBefore(details, body.firstChild);
})();

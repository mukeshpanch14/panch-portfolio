/* Sitewide interactivity: search, copy-code buttons, homepage filter chips,
   back-to-top, utterances theme sync. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var indexPromise = null;
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch('/search-index.json').then(function (r) { return r.json(); });
    }
    return indexPromise;
  }

  /* ── Sidebar search ────────────────────────────────────── */
  var searchInput = document.getElementById('site-search');
  var searchResults = document.getElementById('search-results');

  if (searchInput && searchResults) {
    searchInput.addEventListener('focus', loadIndex, { once: true });

    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim().toLowerCase();
      if (q.length < 2) {
        searchResults.hidden = true;
        searchResults.innerHTML = '';
        return;
      }
      loadIndex().then(function (posts) {
        var scored = [];
        posts.forEach(function (p) {
          var score = 0;
          if (p.title.toLowerCase().indexOf(q) !== -1) score += 3;
          if (p.tags.join(' ').toLowerCase().indexOf(q) !== -1) score += 2;
          if (p.summary.toLowerCase().indexOf(q) !== -1) score += 1;
          if (score) scored.push([score, p]);
        });
        scored.sort(function (a, b) { return b[0] - a[0]; });

        searchResults.innerHTML = '';
        scored.slice(0, 8).forEach(function (pair) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = pair[1].url;
          a.textContent = pair[1].title;
          li.appendChild(a);
          searchResults.appendChild(li);
        });
        if (!scored.length) {
          var empty = document.createElement('li');
          empty.className = 'no-results';
          empty.textContent = 'No matching posts';
          searchResults.appendChild(empty);
        }
        searchResults.hidden = false;
      });
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchResults.hidden = true;
        searchResults.innerHTML = '';
      }
    });
  }

  /* ── Copy-code buttons ─────────────────────────────────── */
  document.querySelectorAll('.article-body pre').forEach(function (pre) {
    var container = pre.closest('.highlight') || pre;
    if (container.querySelector('.copy-btn')) return;

    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(pre.innerText).then(function () {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      });
    });
    container.appendChild(btn);
  });

  /* ── Responsive tables: label each cell for mobile card view ── */
  document.querySelectorAll('.article-body table').forEach(function (table) {
    var headerCells = table.querySelectorAll('thead th');
    if (!headerCells.length) return;

    var labels = Array.prototype.map.call(headerCells, function (th) {
      return th.textContent.trim();
    });

    table.querySelectorAll('tbody tr').forEach(function (row) {
      Array.prototype.forEach.call(row.children, function (cell, i) {
        if (labels[i]) cell.setAttribute('data-label', labels[i]);
      });
    });
  });

  /* ── Homepage filter chips ─────────────────────────────── */
  var chipRow = document.getElementById('filter-chips');
  var postList = document.querySelector('.post-list');

  if (chipRow && postList) {
    var pagination = document.querySelector('.pagination');
    var filteredList = null;

    function buildCard(p) {
      var li = document.createElement('li');
      li.className = 'post-card';

      var meta = document.createElement('div');
      meta.className = 'post-card__meta';
      var cat = document.createElement('span');
      cat.className = 'post-card__category';
      cat.textContent = p.category;
      var sep = document.createElement('span');
      sep.className = 'post-card__sep';
      var date = document.createElement('time');
      date.className = 'post-card__date';
      date.textContent = p.date;
      meta.appendChild(cat);
      meta.appendChild(sep);
      meta.appendChild(date);

      var title = document.createElement('h2');
      title.className = 'post-card__title';
      var link = document.createElement('a');
      link.href = p.url;
      link.textContent = p.title;
      title.appendChild(link);

      var summary = document.createElement('p');
      summary.className = 'post-card__summary';
      summary.textContent = p.summary;

      var more = document.createElement('a');
      more.className = 'post-card__read-more';
      more.href = p.url;
      more.textContent = 'Read more →';

      li.appendChild(meta);
      li.appendChild(title);
      li.appendChild(summary);
      li.appendChild(more);
      return li;
    }

    function showOriginal() {
      postList.hidden = false;
      if (pagination) pagination.hidden = false;
      if (filteredList) filteredList.remove();
      filteredList = null;
    }

    function showFiltered(posts) {
      if (filteredList) filteredList.remove();
      filteredList = document.createElement('ul');
      filteredList.className = 'post-list';
      posts.forEach(function (p, i) {
        var card = buildCard(p);
        card.style.setProperty('--i', i);
        filteredList.appendChild(card);
      });
      if (!posts.length) {
        var empty = document.createElement('li');
        empty.className = 'post-card';
        empty.textContent = 'No posts match this filter.';
        filteredList.appendChild(empty);
      }
      postList.hidden = true;
      if (pagination) pagination.hidden = true;
      postList.parentNode.insertBefore(filteredList, postList);
    }

    chipRow.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      chipRow.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');

      var type = chip.dataset.type;
      var value = (chip.dataset.value || '').toLowerCase();
      if (type === 'all') {
        showOriginal();
        return;
      }
      loadIndex().then(function (posts) {
        showFiltered(posts.filter(function (p) {
          if (type === 'category') return p.category.toLowerCase() === value;
          return p.tags.some(function (t) { return t.toLowerCase() === value; });
        }));
      });
    });
  }

  /* ── Back to top ───────────────────────────────────────── */
  var backBtn = document.getElementById('back-to-top');
  if (backBtn) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        backBtn.classList.toggle('is-visible', window.scrollY > 600);
        ticking = false;
      });
    }, { passive: true });

    backBtn.addEventListener('click', function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ── Utterances dark-mode sync ─────────────────────────── */
  function syncUtterances() {
    var frame = document.querySelector('iframe.utterances-frame');
    if (!frame) return;
    var theme = document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'github-dark' : 'github-light';
    frame.contentWindow.postMessage({ type: 'set-theme', theme: theme }, 'https://utteranc.es');
  }

  new MutationObserver(syncUtterances).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  // Utterances posts resize messages once loaded — use that as the ready signal
  window.addEventListener('message', function (e) {
    if (e.origin === 'https://utteranc.es') syncUtterances();
  });
})();

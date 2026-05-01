/* ─────────────────────────────────────────────────────────────
   ALLBRITON.COM — portfolio site runtime
   - Loads data/projects.json
   - Renders homepage grid + tag filter
   - Renders project page from URL slug
   - Renders about page from site.json (same file)
   ───────────────────────────────────────────────────────────── */

const DATA_URL = 'data/projects.json';

/* ---------- utilities ---------- */
const el = (tag, attrs = {}, ...children) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v !== false && v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) c.forEach(cc => e.appendChild(cc.nodeType ? cc : document.createTextNode(String(cc))));
    else e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
};

async function loadData() {
  // Try fetch first (works over http/https); fall back to embedded data for file:// opens.
  try {
    const r = await fetch(DATA_URL);
    if (r.ok) return await r.json();
  } catch (_) { /* fall through */ }
  if (window.__SITE_DATA__) return window.__SITE_DATA__;
  throw new Error('Could not load projects data');
}

/* ---------- home / grid ---------- */
function renderHome(data) {
  // hero
  const hero = document.getElementById('hero');
  if (hero) {
    hero.innerHTML = '';
    const heroName = data.site.hero_name || (data.site.title || '').split(' ')[0];
    const heroIntro = data.site.hero_intro || data.site.hero_line || data.site.tagline || '';
    hero.appendChild(el('div', { class: 'hero-inner' },
      el('h1', { class: 'hero-headline' },
        el('span', {}, heroName + ' '),
        el('span', { class: 'hero-headline-muted' }, heroIntro)
      ),
      el('div', { class: 'hero-marquee' },
        el('span', {}, data.site.location),
        el('span', {}, data.projects.length + ' selected projects')
      )
    ));
  }

  // tag filter
  const tagBar = document.getElementById('tag-bar');
  if (tagBar) {
    const activeTags = new Set();
    const counts = {};
    for (const p of data.projects) for (const t of (p.tags || [])) counts[t] = (counts[t] || 0) + 1;

    const inner = el('div', { class: 'tag-bar-inner' });
    inner.appendChild(el('span', { class: 'label' }, 'Filter'));

    const allBtn = el('button', { class: 'tag active', type: 'button' }, 'All', el('span', { class: 'count' }, String(data.projects.length)));
    allBtn.addEventListener('click', () => {
      activeTags.clear();
      inner.querySelectorAll('.tag').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      applyFilter();
    });
    inner.appendChild(allBtn);

    for (const t of data.tags) {
      if (!counts[t]) continue;  // hide empty tags
      const btn = el('button', { class: 'tag', type: 'button', 'data-tag': t }, t, el('span', { class: 'count' }, String(counts[t])));
      btn.addEventListener('click', () => {
        if (activeTags.has(t)) { activeTags.delete(t); btn.classList.remove('active'); }
        else { activeTags.add(t); btn.classList.add('active'); }
        allBtn.classList.toggle('active', activeTags.size === 0);
        applyFilter();
      });
      inner.appendChild(btn);
    }
    tagBar.innerHTML = '';
    tagBar.appendChild(inner);

    function applyFilter() {
      const cards = document.querySelectorAll('[data-slug]');
      cards.forEach(c => {
        const ts = (c.dataset.tags || '').split('|').filter(Boolean);
        const show = activeTags.size === 0 || [...activeTags].every(t => ts.includes(t));
        c.classList.toggle('hidden', !show);
      });
    }
  }

  // grid
  const grid = document.getElementById('grid');
  if (grid) {
    grid.innerHTML = '';
    for (const p of data.projects) {
      const href = `project.html?p=${encodeURIComponent(p.slug)}`;
      let media;
      if (p.thumbnail.type === 'video' && p.thumbnail.src) {
        const vAttrs = {
          class: 'card-media',
          src: p.thumbnail.src,
          muted: 'muted', loop: 'loop', playsinline: 'playsinline', autoplay: 'autoplay',
          preload: 'metadata'
        };
        if (p.thumbnail.poster) vAttrs.poster = p.thumbnail.poster;
        media = el('video', vAttrs);
        // Set muted as a DOM property too — Safari/Chrome require this for autoplay
        media.muted = true;
        media.defaultMuted = true;
        // Kick playback after attach (some browsers don't honor the attribute alone)
        requestAnimationFrame(() => {
          const pr = media.play();
          if (pr && typeof pr.catch === 'function') pr.catch(() => {});
        });
      } else {
        media = el('img', { class: 'card-media', src: p.thumbnail.src, alt: p.title, loading: 'lazy' });
      }
      const card = el('a', {
        class: 'card',
        href,
        'data-slug': p.slug,
        'data-tags': (p.tags || []).join('|')
      },
        media,
        el('div', { class: 'card-meta' },
          el('div', { class: 'card-title' }, p.title)
        )
      );
      grid.appendChild(card);
    }
  }
}

/* ---------- project page ---------- */
function renderProject(data) {
  const params = new URLSearchParams(location.search);
  const slug = params.get('p');
  const p = data.projects.find(x => x.slug === slug);
  const root = document.getElementById('project-root');
  if (!p) {
    root.innerHTML = '<div class="project-header"><p>Project not found. <a href="index.html">Back to work →</a></p></div>';
    document.title = 'Not found — ' + data.site.title;
    return;
  }
  document.title = p.title + ' — ' + data.site.title;

  const idx = data.projects.indexOf(p);
  const prev = data.projects[(idx - 1 + data.projects.length) % data.projects.length];
  const next = data.projects[(idx + 1) % data.projects.length];

  root.innerHTML = '';

  // ── LIGHTBOX ──────────────────────────────────────────────
  const lightbox = el('div', { class: 'p-lightbox', role: 'dialog', 'aria-modal': 'true' });
  const lbInner = el('div', { class: 'p-lightbox-inner' });
  const lbClose = el('button', { class: 'p-lightbox-close', 'aria-label': 'Close' }, '×');
  lightbox.appendChild(lbClose);
  lightbox.appendChild(lbInner);
  document.body.appendChild(lightbox);

  function openLightbox(content) {
    lbInner.innerHTML = '';
    lbInner.appendChild(content);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    setTimeout(() => { lbInner.innerHTML = ''; }, 250);
    document.body.style.overflow = '';
  }
  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function(e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLightbox(); });

  // ── HERO (image OR self-hosted video) — display only, no lightbox ─
  if (p.hero) {
    const heroSrc = typeof p.hero === 'string' ? p.hero : p.hero.src;
    const heroIsVideo = (typeof p.hero === 'object' && p.hero.type === 'video')
      || /\.(mov|mp4|webm)(\?.*)?$/i.test(heroSrc);
    const heroEl = el('div', { class: 'p-hero' });
    if (heroIsVideo) {
      const heroVid = el('video', {
        src: heroSrc, autoplay: 'autoplay', muted: 'muted', loop: 'loop',
        playsinline: 'playsinline', preload: 'metadata', class: 'p-hero-img'
      });
      heroVid.muted = true;
      heroEl.appendChild(heroVid);
    } else {
      const heroImg = el('img', { src: heroSrc, alt: p.title, class: 'p-hero-img' });
      heroEl.appendChild(heroImg);
    }
    root.appendChild(heroEl);
  }

  // ── TWO-COLUMN LAYOUT ─────────────────────────────────────
  const layout = el('div', { class: 'p-layout' });
  const mediaCol = el('div', { class: 'p-media-col' });
  const textCol = el('div', { class: 'p-text-col' });

  // ── GRID (new structured format) ─────────────────────────
  if (p.grid && p.grid.length) {
    const grid = el('div', { class: 'p-grid' });
    for (const item of p.grid) {
      const span = item.span || 2;
      if (item.type === 'embed') {
        const card = el('div', { class: 'p-video-card', style: 'grid-column: span ' + span });
        const overlay = el('div', { class: 'p-video-overlay' });
        const playBtn = el('button', { class: 'p-play-btn', 'aria-label': 'Play video' },
          el('span', { class: 'p-play-icon' })
        );
        if (item.title) overlay.appendChild(el('div', { class: 'p-video-title' }, item.title));
        if (item.thumb) card.style.backgroundImage = 'url(' + item.thumb + ')';
        overlay.appendChild(playBtn);
        card.appendChild(overlay);
        card.addEventListener('click', (function(src) { return function() {
          let s = src;
          s += (s.includes('?') ? '&' : '?') + 'autoplay=1';
          openLightbox(el('iframe', { src: s, class: 'p-lb-video', allowfullscreen: 'allowfullscreen', allow: 'autoplay; fullscreen' }));
        }; })(item.src));
        grid.appendChild(card);
      } else if (item.type === 'video') {
        const wrap = el('div', { class: 'p-image-item', style: 'grid-column: span ' + span });
        const vid = el('video', {
          src: item.src,
          autoplay: 'autoplay',
          loop: 'loop',
          muted: 'muted',
          playsinline: 'playsinline',
          preload: 'metadata',
          class: 'p-image'
        });
        vid.muted = true;
        vid.defaultMuted = true;
        // Pin aspect ratio on the wrapper once metadata loads, so the grid row
        // sizes correctly (otherwise span-2 video rows collapse to 0 height).
        vid.addEventListener('loadedmetadata', function() {
          if (vid.videoWidth && vid.videoHeight) {
            wrap.style.aspectRatio = vid.videoWidth + ' / ' + vid.videoHeight;
          }
        });
        wrap.appendChild(vid);
        // Explicit play() — covers browsers that don't honor the autoplay attribute alone
        requestAnimationFrame(() => {
          const pr = vid.play();
          if (pr && typeof pr.catch === 'function') pr.catch(() => {});
        });
        wrap.addEventListener('click', (function(src) { return function() {
          const lbVid = el('video', { src: src, controls: 'controls', autoplay: 'autoplay', class: 'p-lb-img', style: 'max-height:90vh;background:#000;' });
          lbVid.muted = false;
          openLightbox(lbVid);
        }; })(item.src));
        grid.appendChild(wrap);
      } else {
        const wrap = el('div', { class: 'p-image-item', style: 'grid-column: span ' + span });
        const img = el('img', { src: item.src, alt: item.alt || '', loading: 'lazy', class: 'p-image' });
        wrap.appendChild(img);
        wrap.addEventListener('click', (function(src) { return function() {
          openLightbox(el('img', { src: src, alt: '', class: 'p-lb-img' }));
        }; })(item.src));
        grid.appendChild(wrap);
      }
    }
    mediaCol.appendChild(grid);
  } else {
  // Videos
  const legacyGrid = el('div', { class: 'p-grid' });
  for (const v of (p.videos || [])) {
    const card = el('div', { class: 'p-video-card', style: 'grid-column: span 2' });
    const overlay = el('div', { class: 'p-video-overlay' });
    const playBtn = el('button', { class: 'p-play-btn', 'aria-label': 'Play video' },
      el('span', { class: 'p-play-icon' })
    );
    if (v.title) overlay.appendChild(el('div', { class: 'p-video-title' }, v.title));
    overlay.appendChild(playBtn);
    card.appendChild(overlay);
    card.addEventListener('click', function() {
      let src = v.embed;
      src += (src.includes('?') ? '&' : '?') + 'autoplay=1';
      openLightbox(el('iframe', {
        src: src,
        class: 'p-lb-video',
        allowfullscreen: 'allowfullscreen',
        allow: 'autoplay; fullscreen'
      }));
    });
    legacyGrid.appendChild(card);
  }

  // Images
  for (const src of (p.gallery || [])) {
    const item = el('div', { class: 'p-image-item p-image-item--auto' });
    const img = el('img', { src: src, alt: '', loading: 'lazy', class: 'p-image' });
    // Auto-span: landscape images go full width, portrait share a column
    img.addEventListener('load', function() {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (ratio >= 1.2) {
        item.style.gridColumn = 'span 2';
      } else {
        item.style.gridColumn = 'span 1';
      }
    });
    item.appendChild(img);
    item.addEventListener('click', function() {
      openLightbox(el('img', { src: src, alt: '', class: 'p-lb-img' }));
    });
    legacyGrid.appendChild(item);
  }
  mediaCol.appendChild(legacyGrid);
  } // end legacy fallback

  // Text column
  textCol.appendChild(el('h1', { class: 'p-title' }, p.title));
  if (p.summary) {
    textCol.appendChild(el('p', { class: 'p-summary' }, p.summary));
  }
  const callouts = [];
  if (p.body && p.body.length) {
    const bodyEl = el('div', { class: 'p-body' });
    for (const para of p.body) {
      if (typeof para === 'object' && para.callout) {
        const calloutBlock = el('blockquote', { class: 'p-callout-block' },
          el('p', { class: 'p-callout' }, para.text),
          para.attribution ? el('cite', { class: 'p-callout-cite' }, para.attribution) : null
        );
        bodyEl.appendChild(calloutBlock);
      } else {
        if (!para.trim()) continue;
        if (para === para.toUpperCase() && para.length < 40) {
          bodyEl.appendChild(el('div', { class: 'p-heading-caps' }, para));
        } else {
          bodyEl.appendChild(el('p', {}, para));
        }
      }
    }
    textCol.appendChild(bodyEl);
  }
  if (p.client || p.year) {
    const meta = el('dl', { class: 'p-meta' });
    if (p.client) meta.appendChild(el('div', {}, el('dt', {}, 'Client'), el('dd', {}, p.client)));
    if (p.year) meta.appendChild(el('div', {}, el('dt', {}, 'Year'), el('dd', {}, p.year)));
    textCol.appendChild(meta);
  }

  layout.appendChild(mediaCol);
  layout.appendChild(textCol);
  root.appendChild(layout);

  // ── PREV/NEXT NAV ─────────────────────────────────────────
  root.appendChild(el('nav', { class: 'project-nav' },
    el('a', { href: 'project.html?p=' + encodeURIComponent(prev.slug) },
      el('div', { class: 'direction' }, '← Previous'),
      el('span', {}, prev.title)
    ),
    el('a', { href: 'project.html?p=' + encodeURIComponent(next.slug), style: 'text-align:right;' },
      el('div', { class: 'direction' }, 'Next →'),
      el('span', {}, next.title)
    )
  ));
}

/* ---------- about page ---------- */
function renderAbout(data) {
  const root = document.getElementById('about-root');
  if (!root) return;
  root.innerHTML = '';

  // hero — two col: left = eyebrow + headline + body copy; right = image
  root.appendChild(el('header', { class: 'about-hero' },
    el('div', { class: 'about-hero-text' },
      el('div', { class: 'eyebrow' }, 'ABOUT'),
      el('h1', {}, 'Strategy, creative direction & writing.'),
      el('p', { class: 'lead' }, "I'm a strategist, creative director and writer available for select projects. I've started brands, crashed start-ups, been in-house, and exited companies, worked at agencies both big and small and everywhere in between."),
      el('p', { class: 'lead' }, "Currently living between NYC and the North Fork of Long Island with my partner Melissa (not pictured below) and dog Rothko (pictured below).")
    ),
    el('div', { class: 'about-hero-image' },
      el('img', { src: 'assets/about/allbriton.png', alt: 'Allbriton Robbins' })
    )
  ));

  // combined experience
  const allBrands = [
    'TikTok', 'CashApp', 'Google Creative Lab', 'Venmo',
    '72andSunny LA', '72andSunny NY', 'Mother NY', 'Johannes Leonardo',
    'The Barbarian Group', 'Grey NYC', 'Havas', 'Ogilvy', 'VMLY&R', 'The Brand Union',
    'Google', 'Truth', 'Dewars', 'The Standard Hotels', 'Coca Cola', 'TBS', 'Umbo', 'Pringles',
    'Pepsi', 'E*Trade', 'Target', 'LG', 'Vans', 'Febreze', 'SleepFuel',
    'Mars', 'Unilever', 'Nestle', 'Square',
    'Mastercard', 'Visa', 'GEICO', 'USAA', 'ESPN'
  ];

  root.appendChild(el('div', { class: 'about-columns about-columns--single' },
    el('section', {},
      el('h3', {}, 'Brand Experience'),
      el('div', { class: 'chips' }, ...allBrands.map(b => el('span', { class: 'chip' }, b)))
    )
  ));

}

/* ---------- shared nav/footer ---------- */
function renderChrome(data) {
  const header = document.querySelector('.site-header .nav');
  if (header) {
    header.innerHTML = '';
    header.appendChild(el('a', { class: 'brand', href: 'index.html' }, data.site.title));
    header.appendChild(el('ul', { class: 'primary' },
      el('li', {}, el('a', { href: 'index.html' }, 'Projects')),
      el('li', {}, el('a', { href: 'about.html' }, 'About'))
    ));
  }
  const footer = document.querySelector('.site-footer .site-footer-inner');
  if (footer) {
    footer.innerHTML = '';
    footer.appendChild(el('div', {}, '© ', String(new Date().getFullYear()), ' ', data.site.title));
    footer.appendChild(el('div', {},
      el('a', { href: `mailto:${data.site.email}` }, data.site.email), ' · ',
      el('a', { href: data.site.linkedin, target: '_blank', rel: 'noopener' }, 'LinkedIn')
    ));
  }
}

/* ---------- boot ---------- */
(async () => {
  try {
    const data = await loadData();
    renderChrome(data);
    const mode = document.body.dataset.page;
    if (mode === 'home') renderHome(data);
    else if (mode === 'project') renderProject(data);
    else if (mode === 'about') renderAbout(data);
  } catch (err) {
    console.error(err);
    const msg = document.createElement('div');
    msg.style.padding = '4rem 2rem';
    msg.textContent = 'Failed to load site data: ' + err.message;
    document.body.appendChild(msg);
  }
})();

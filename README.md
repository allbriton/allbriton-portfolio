# allbriton.com

Static portfolio site for Allbriton Robbins. HTML / CSS / JS, no build step, deployed via Netlify with content edits via Decap CMS.

---

## Folder layout

```
site/                  ← repo root, also Netlify publish dir
├── index.html         Homepage (hero + project grid + tag filter)
├── project.html       Project template — reads ?p=<slug>
├── about.html         About page
│
├── css/
│   ├── tokens.css     ✱ Design tokens (color, type, spacing, motion)
│   └── site.css       Layout + components
│
├── js/
│   └── site.js        Router + renderers for home/project/about
│
├── data/
│   ├── projects.json  ✱ Single source of truth for all content
│   └── projects.js    Auto-generated mirror for file:// previews
│
├── assets/
│   ├── fonts/         PP Editorial New (display) self-hosted
│   ├── about/         Headshot + about imagery
│   └── projects/<slug>/  Per-project media
│
├── admin/             Decap CMS — content editor at /admin/
│   ├── index.html
│   └── config.yml
│
├── netlify.toml       Netlify deploy config (redirects, headers)
├── .gitignore
└── README.md
```

The two files marked ✱ are the only ones you need to edit to change the site's content or look.

---

## Editing content (no code)

Once Netlify Identity is enabled, go to `allbriton.com/admin/`, sign in, and use the visual editor. Decap commits your edits straight to GitHub and Netlify rebuilds in ~30 seconds.

**Adding a new project from the CMS:**
1. Open Projects → click the array → "Add Item".
2. Fill in slug, title, tags, etc.
3. Upload the hero/thumbnail/grid media via the file pickers.
4. Save (or use editorial workflow: Save → Review → Publish).
5. Wait ~30 seconds for the deploy and refresh the live site.

---

## Editing content (code path)

Open `data/projects.json`. Each project follows this schema:

```json
{
  "slug": "my-project",
  "title": "My Project",
  "client": "Client Name",
  "year": "2026",
  "tags": ["Creative Strategy", "B2C"],
  "thumbnail": { "type": "video", "src": "assets/projects/my-project/hero.mp4" },
  "hero":      { "type": "video", "src": "assets/projects/my-project/hero.mp4" },
  "summary": "One-sentence project blurb.",
  "body": [
    "Paragraph one.",
    { "callout": true, "text": "A pull quote.", "attribution": "Person Name" },
    "Paragraph two."
  ],
  "grid": [
    { "type": "video", "src": "assets/projects/my-project/film.mp4", "span": 2 },
    { "type": "image", "src": "assets/projects/my-project/still.jpg", "span": 1 },
    { "type": "image", "src": "assets/projects/my-project/still2.jpg", "span": 1 }
  ],
  "external": ""
}
```

**Field reference:**
- `thumbnail` / `hero` — `{ type: "image"|"video", src }`. Videos autoplay-loop muted.
- `body` — array of paragraphs. Strings are paragraphs. Objects with `callout: true` render as pull quotes; add `attribution` for author credit.
- `grid` — items in the media column. `span: 1` is half-width, `span: 2` is full-width. Vertical 9:16 video reads better at span 1.
- `tags` — must match values in the top-level `tags` array (the filter taxonomy).

After editing, regenerate the `file://` data mirror:

```bash
printf 'window.__SITE_DATA__ = ' > data/projects.js
cat data/projects.json >> data/projects.js
echo ';' >> data/projects.js
```

---

## Design tokens

All colors, fonts, type scale, spacing, and motion live in `css/tokens.css` as CSS custom properties. Change a value there and the entire site updates.

Current Honed Earth palette:

```
--color-bg:        #F0E5DB   primary background
--color-ink:       #1F1C18   headlines
--color-ink-muted: #4A4741   body copy
--color-accent:    #B8684A   terracotta
--color-accent-2:  #5A6147   olive
--color-surface:   #E4D5C4
--color-hero:      #F0E5DB
--color-line:      #8A8377
```

Fonts:
- Body: **Inter** (Google Fonts)
- Display: **PP Editorial New Ultralight** (self-hosted in `assets/fonts/`)

---

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or double-click `index.html` directly — `data/projects.js` is included as a fallback so `file://` opens work too.

---

## Deployment

The site is deployed via Netlify, auto-deploying from the `main` branch of this GitHub repo.

- **Production URL**: https://allbriton.com
- **Netlify URL**: `<site-name>.netlify.app`
- **Build settings**: no build command, publish directory = `.` (configured in `netlify.toml`)
- **Redirects**: configured in `netlify.toml` to map old Squarespace URLs (`/work/<slug>`) to new project URLs.

To deploy a change, just commit and push to `main`. Netlify watches the repo and ships in ~30 seconds.

---

## Optimizing video for the web

When adding a new video, encode for streaming with these flags:

```bash
ffmpeg -i input.mov \
  -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2" \
  -c:v libx264 -preset veryfast -crf 26 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 96k -movflags +faststart \
  output.mp4
```

What each flag does:
- `scale=...` caps at 1280×720 while preserving aspect ratio (mobile-friendly without losing quality).
- `crf 26` chooses a balanced quality target.
- `+faststart` puts metadata at the front so the browser can begin playback before the file finishes downloading.
- `aac 96k` is good enough audio for muted-by-default loops.

Existing case-study videos have been pre-optimized into `*_optimized.mp4` files; the originals are gitignored to keep the repo lean.

---

## Browser support

Evergreen Chrome / Safari / Firefox / Edge. CSS custom properties, `clamp()`, grid, flexbox. No framework, no transpilation, no build tools.

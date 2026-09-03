# Aimeri Baddouh Photography

Static site, no build step. Deployed on Netlify (pretty URLs, contact form).

## Files

- `index.html`, `portraits.html`, `moody.html`, `color.html`, `selected-work.html`, `about.html`, `thanks.html` — the pages
- `styles.css` — design system, themes (`cream`, `dark`, `marigold`, `paper`), layout
- `site.js` — menu, scroll-driven theme, justified gallery rows, lightbox (progressive enhancement; pages work without it)
- `images/<gallery>/` — original photos (source of truth, never referenced directly except for social-share images)
- `images/opt/<gallery>/` — generated responsive WebP derivatives (480 / 960 / 1440 / 1920 px wide)
- `scripts/build-images.mjs` — generates `images/opt/` and `scripts/image-manifest.json` (dimensions, average color, blurred placeholder)

## Adding a photo

1. Drop the file into `images/portraits/`, `images/product-moody/` or `images/product-pop/`.
2. Run `node scripts/build-images.mjs` (needs ImageMagick 7: `brew install imagemagick`). Only new or changed photos are processed.
3. Copy an existing `<figure class="ph">` block in the gallery page, point it at the new `images/opt/...` files, update `data-w`/`data-h`, `width`/`height`, the caption and the counter. The `background-image` placeholder and `--avg` color are in `scripts/image-manifest.json` (optional, but they make the fade-in nicer).

The gallery layout is computed from `data-w` and `data-h`, so photos are never cropped in the grid.

## Local preview

`node scripts/serve.mjs` serves the site at http://localhost:5173 with Netlify-style pretty URLs (`/about` → `about.html`).

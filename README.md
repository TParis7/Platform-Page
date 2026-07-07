# P3 Web-App Landing Page — `/platform`

Standalone mockup of the new **pulseofp3.org/platform** page (showcases the P3 web app at
`platform.pulseofp3.org`). Modeled on the `/download` page pattern, built July 6, 2026.

## What's here

| Path | What |
|------|------|
| `index.html` | The full page — self-contained (fonts from Google Fonts + Fontshare Satoshi, logos/badges/QR from the Webflow CDN) |
| `shots/*.webp` | Optimized (1600w, WebP q85) product screenshots referenced by the page |
| `shots/og.jpg` | 1200×630 social-share card |
| `shots/raw/*.png` | Original captures (not referenced — keep out of the repo if you want it lean) |
| `images/*` | Community/lifestyle photos (watermark + grid cards) — required by the page |

All product visuals are **real screenshots** captured from platform.pulseofp3.org in demo
mode (Jul 6, 2026). To refresh them later, re-run the capture script from the Cowork session.

## Publish as a standalone GitHub Pages site

1. Create repo **tparis7/Platform-Page** (public).
2. Push `index.html` + `shots/` (the `.webp` files + `og.jpg`; `shots/raw/` optional) + `images/` to the repo root.
   Remote: `https://tparis7@github.com/tparis7/Platform-Page.git`
3. Settings → Pages → deploy from `main` / root.
4. Live at `https://tparis7.github.io/Platform-Page/`.

## Webflow port (built Jul 7, 2026 — awaiting the full Webflow Data-API MCP to wire)

- `build-combined.mjs` transforms `index.html` → **`platform-combined.js`** (the injected
  page). Edit `index.html`, run `node build-combined.mjs`, push, bump the loader
  cache-buster. Transform: content classes renamed `wa-*` AND `#wa-root`-prefixed
  (out-specifies the scoped wildcard reset — the Donate trap), nav/footer verbatim from
  fs-combined.js injected as body-level siblings, Webflow chrome hidden via
  `body.wa-active`, IX2 cancelled, JSON-LD injected. Verified in a simulated Webflow page.
- `webflow/wafouchide.html` (header) + `webflow/waloader.html` (footer) = the two
  page-scoped scripts to register. Standing Rules apply: register → clear site-level →
  apply to page → verify site-level 404 → staging-only publish.
- `og-card.html` → renders `shots/og.jpg` (1200×630). The Webflow page's og:image must be
  set in Designer (Data API has no image field) or via raw meta tags in Page Settings →
  Custom Code.

## Still to do

- **Amplitude**: every trackable CTA carries `data-wa-event` / `data-wa-source`; swap the
  `waTrack()` stub for the Amplitude Browser SDK (project 665873).

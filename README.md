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

## Still to do (next sessions)

- **Amplitude**: every trackable CTA already carries `data-wa-event` / `data-wa-source`
  attributes and there's a `waTrack()` console stub at the bottom of `index.html`.
  Wiring = add the Amplitude Browser SDK snippet (project 665873) and swap the stub body
  for `amplitude.track(...)`.
- **Webflow port**: convert to `webapp-combined.js` (JS + GitHub-injection, self-contained
  nav/footer pattern per Donate/Freedom-To-Thrive; nav/footer must be re-parented to
  body-level siblings, rules copied verbatim from `fs-combined.js`). Slug `/platform` on the
  Design Sandbox site. Follow the Standing Rules (page-scoped scripts, staging-only publish,
  slug-revert gotcha, OG image via Designer).
- The `mockup-badge` style block is unused (no badge shown); the OG image URL in `<head>`
  assumes the `tparis7.github.io/Platform-Page` repo name — update if the repo is named differently.

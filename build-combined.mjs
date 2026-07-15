// Build platform-combined.js (the Webflow-injected page) from index.html.
//
// Transform rules (lessons from the Donate page saga, see CLAUDE.md):
// - Content classes are RENAMED with a `wa-` prefix (not just #wa-root-scoped)
//   so Webflow's own stylesheet can never leak into or out of the content.
// - .p3-nav / .pp-mob-* / .p3-footer markup + CSS stay char-for-char verbatim
//   and are injected as BODY-LEVEL SIBLINGS of #wa-root (they inherit
//   Webflow's site-level body Satoshi/30px metrics — nesting breaks that).
// - The standalone page's Satoshi/Fontshare shim is dropped (the live site
//   provides Satoshi via Webflow).
// - Webflow's native chrome is hidden via body.wa-active > *:not(...) and IX2
//   body animations are cancelled.
//
// Usage: node build-combined.mjs   (writes platform-combined.js next to it)
import { readFileSync, writeFileSync } from "node:fs";

const CDN = "https://tparis7.github.io/Platform-Page/";
// Asset cache-buster: bump this whenever shots/ or images/ change so browsers
// refetch them. combined.js itself is busted by the loader's ?v= (Webflow
// Page Settings); this covers the image URLs combined.js references.
const ASSET_VER = "20260715a";
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

// ---- extract pieces --------------------------------------------------------
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];

function extractBlock(startMarker, endMarker) {
  const s = body.indexOf(startMarker);
  const e = body.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`block not found: ${startMarker}`);
  return body.slice(s, e + endMarker.length);
}

const navHtml = extractBlock('<div class="p3-nav" id="p3nav">', "</div>\n\n<!-- Mobile fullscreen overlay menu -->")
  .replace("\n\n<!-- Mobile fullscreen overlay menu -->", "");
const overlayHtml = extractBlock('<div class="pp-mob-overlay" id="ppMobOverlay">', "</div>\n\n<!-- ===== HERO");
const overlayClean = overlayHtml.slice(0, overlayHtml.lastIndexOf("</div>") + 6);
const footerHtml = extractBlock('<footer class="p3-footer">', "</footer>");
const contentStart = body.indexOf("<!-- ===== HERO ===== -->");
const contentEnd = body.indexOf("<!-- ===== FOOTER");
const contentHtml = body.slice(contentStart, contentEnd);

// ---- collect + rename content class tokens ---------------------------------
// Tokens come from class attributes in the CONTENT + nav/overlay/footer; only
// non-p3/pp tokens get the wa- prefix (nav/footer/overlay classes stay put).
const tokens = new Set();
for (const m of body.matchAll(/class="([^"]+)"/g)) {
  for (const t of m[1].split(/\s+/)) {
    if (t && !t.startsWith("p3-") && !t.startsWith("pp-") && !t.startsWith("w-")) tokens.add(t);
  }
}
const renames = [...tokens].sort((a, b) => b.length - a.length);

function renameClassesInHtml(s) {
  return s.replace(/class="([^"]+)"/g, (_, cls) => {
    const out = cls
      .split(/\s+/)
      .map((t) => (tokens.has(t) ? `wa-${t}` : t))
      .join(" ");
    return `class="${out}"`;
  });
}

function renameClassesInCss(s) {
  let out = s;
  for (const t of renames) {
    out = out.replaceAll(new RegExp(`\\.${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "g"), `.wa-${t}`);
  }
  return out;
}

// ---- CSS transforms ---------------------------------------------------------
let outCss = css;
// scope the wildcard reset to the content root (nav/footer live outside it)
outCss = outCss.replace(
  "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
  "#wa-root, #wa-root *, #wa-root *::before, #wa-root *::after { box-sizing: border-box; margin: 0; padding: 0; }",
);
outCss = outCss.replace("html { scroll-behavior: smooth; }", "");
// strip the standalone page's bare element rules FIRST (they'd leak site-wide
// on Webflow), then re-add them scoped to the content root
outCss = outCss.replace(/^img \{ max-width: 100%; display: block; \}\n/m, "");
outCss = outCss.replace(/^a \{ text-decoration: none; color: inherit; \}\n/m, "");
outCss = outCss.replace(
  /body \{[^}]*\}/,
  "#wa-root { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a1a; background: #fff; line-height: 1.6; overflow-x: hidden; -webkit-font-smoothing: antialiased; }\n#wa-root img { max-width: 100%; display: block; }\n#wa-root a { text-decoration: none; color: inherit; }",
);
outCss = outCss.replace(":root {", "#wa-root {");
// live site provides Satoshi via Webflow's body styles — drop the shim
outCss = outCss.replace(
  /\.p3-nav, \.pp-mob-overlay, \.p3-footer \{ font-family: 'Satoshi'[^}]*\}\n/,
  "",
);
// drop the unused mockup badge
outCss = outCss.replace(/\.mockup-badge \{[\s\S]*?\}\n/, "");
// reduced-motion wildcard → scoped
outCss = outCss.replace(
  "* { transition-duration: 0.01ms !important; }",
  "#wa-root * { transition-duration: 0.01ms !important; }",
);
outCss = renameClassesInCss(outCss);
// Prefix every content rule with #wa-root so it out-specifies the scoped
// wildcard reset (#wa-root * = 1,0,1 beats bare .wa-x = 0,1,0 — the Donate
// wildcard-reset trap). Nav/footer (.p3-/.pp-) rules stay verbatim.
outCss = outCss.replace(/([^{}]+)\{/g, (m, prelude) => {
  // comments (section headers etc.) can precede the selector inside the
  // matched prelude — only transform the part after the last comment
  const cut = prelude.lastIndexOf("*/");
  const head = cut === -1 ? "" : prelude.slice(0, cut + 2);
  const selPart = cut === -1 ? prelude : prelude.slice(cut + 2);
  const trimmed = selPart.trim();
  if (trimmed.startsWith("@") || trimmed === "") return m; // media queries / stray
  const prefixed = trimmed
    .split(",")
    .map((s) => {
      const sel = s.trim();
      return sel.startsWith(".wa-") ? `#wa-root ${sel}` : sel;
    })
    .join(", ");
  const lead = selPart.slice(0, selPart.length - selPart.trimStart().length);
  return `${head}${lead}${prefixed} {`;
});
// hide Webflow's native chrome; whitelist our injected body-level pieces
outCss += `
/* Hide Webflow's native page chrome once the injected page is live */
body.wa-active > *:not(#wa-root):not(.p3-nav):not(.pp-mob-overlay):not(.p3-footer):not(script):not(style):not(link) { display: none !important; }
`;

// ---- HTML transforms --------------------------------------------------------
function toCdn(s) {
  // absolutize + append the asset cache-buster to every shots/ + images/ URL
  return s
    .replace(/src="shots\/([a-z0-9._-]+)"/g, `src="${CDN}shots/$1?v=${ASSET_VER}"`)
    .replace(/src="images\/([a-z0-9._-]+)"/g, `src="${CDN}images/$1?v=${ASSET_VER}"`)
    .replace(/url\("images\/([a-z0-9._-]+)"\)/g, `url("${CDN}images/$1?v=${ASSET_VER}")`);
}
const content = toCdn(renameClassesInHtml(contentHtml));
outCss = toCdn(outCss);

// ---- assemble ---------------------------------------------------------------
function assertSafe(name, s) {
  if (s.includes("`") || s.includes("${")) throw new Error(`${name} contains template-literal chars`);
  return s;
}

const js = `/* platform-combined.js v1.0.0 — pulseofp3.org/platform
   Generated from Website Folder/Platform Page/index.html by build-combined.mjs.
   Do not hand-edit: edit index.html, re-run the build, push, bump the loader
   cache-buster. Serves from ${CDN}platform-combined.js */
(function () {
  'use strict';
  if (document.getElementById('wa-root')) return;

  // Fonts (Inter + Space Grotesk) — skip if another page script already loaded them
  var FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap';
  if (!document.querySelector('link[href*="Space+Grotesk"]')) {
    var fl = document.createElement('link');
    fl.rel = 'stylesheet';
    fl.href = FONTS;
    document.head.appendChild(fl);
  }

  var style = document.createElement('style');
  style.textContent = ${JSON.stringify(outCss)};
  document.head.appendChild(style);

  // Content root
  var root = document.createElement('div');
  root.id = 'wa-root';
  root.innerHTML = ${JSON.stringify(content)};
  document.body.appendChild(root);

  // Nav + mobile overlay + footer as BODY-LEVEL SIBLINGS of #wa-root — they
  // must inherit Webflow's body Satoshi/30px metrics (see Donate-page lesson).
  var chrome = document.createElement('div');
  chrome.innerHTML = ${JSON.stringify(assertSafe("nav", navHtml) + "\n" + assertSafe("overlay", overlayClean) + "\n" + assertSafe("footer", footerHtml))};
  while (chrome.firstElementChild) document.body.appendChild(chrome.firstElementChild);

  // Cancel Webflow IX2 body animations, then reveal (releases the FOUC guard)
  if (document.body.getAnimations) {
    document.body.getAnimations().forEach(function (a) { a.cancel(); });
  }
  document.body.classList.add('wa-active');

  // SEO: JSON-LD (Google renders JS, so this is crawlable)
  var ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'The P3 Web App — Go Deeper on the Big Screen',
    url: 'https://www.pulseofp3.org/platform',
    description: 'Everything from the P3 app, plus web-only tools — Conversations with your mentor, the Pulse AI career coach, and Career Compass. Same account, bigger screen.',
    publisher: {
      '@type': 'Organization',
      name: 'The Pulse of Perseverance Project',
      url: 'https://www.pulseofp3.org',
    },
  });
  document.head.appendChild(ld);

  // Nav scroll behavior — same threshold as the live homepage (50px)
  var nav = document.getElementById('p3nav');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 50); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger menu
  var btn = document.getElementById('ppMobMenu');
  var ov = document.getElementById('ppMobOverlay');
  if (btn && ov) {
    btn.addEventListener('click', function () {
      var open = btn.classList.toggle('open');
      ov.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    ov.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        btn.classList.remove('open');
        ov.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Analytics stub — swap for Amplitude (project 665873) when we wire it
  function waTrack(name, props) {
    if (window.console && console.debug) console.debug('[wa-event]', name, props || {});
  }
  document.querySelectorAll('[data-wa-event]').forEach(function (el) {
    el.addEventListener('click', function () {
      waTrack(el.getAttribute('data-wa-event'), { source: el.getAttribute('data-wa-source') || null });
    });
  });
})();
`;

writeFileSync(new URL("./platform-combined.js", import.meta.url), js);
console.log(`platform-combined.js written (${Math.round(js.length / 1024)} KB, ${renames.length} classes renamed)`);

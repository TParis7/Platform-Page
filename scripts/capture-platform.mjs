// Capture a P3 web-app screen in demo mode from the LOCAL dev server, at the
// /platform shot geometry (1600x1000 viewport, deviceScaleFactor 1 - dsf 2
// wedges captureScreenshot on media-heavy screens; see memory
// reference-headless-chrome-capture-recipe). One fresh headless Chrome per shot.
//
//   node capture-platform.mjs <route> <mentee|mentor> <out.png> [prepJS]
//
// prepJS runs in the page after settle (e.g. to open a thread or hide a card).
import { spawn } from "node:child_process";
import fs from "node:fs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL || "http://localhost:5173";
const [route, role = "mentee", out = "shot.png", prepJS = ""] = process.argv.slice(2);
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--window-size=1600,${Number(process.env.VIEW_H) || 1000}`,
  "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--autoplay-policy=no-user-gesture-required",
  `--user-data-dir=/tmp/p3cap-${port}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1800);
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error("timeout " + method)); } }, 20000); });
try {
  await send("Page.enable");
  const VIEW_H = Number(process.env.VIEW_H) || 1000;
  await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: VIEW_H, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${BASE}/login` });
  await sleep(3500);
  await send("Runtime.evaluate", { expression: `sessionStorage.setItem('p3-demo-mode','1'); sessionStorage.setItem('p3-demo-role','${role}'); 1` });
  await send("Page.navigate", { url: `${BASE}${route}` });
  await sleep(Number(process.env.SETTLE_MS) || 7000);
  if (prepJS) {
    const r = await send("Runtime.evaluate", { expression: prepJS, returnByValue: true, awaitPromise: true });
    console.log("prep:", JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.text ?? null));
    await sleep(Number(process.env.PREP_SETTLE_MS) || 2500);
  }
  // Wait for every image to decode, or the frame ships blank tiles.
  await send("Runtime.evaluate", { expression: "Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => document.images.length)", awaitPromise: true, returnByValue: true });
  await sleep(600);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  const info = await send("Runtime.evaluate", { expression: "JSON.stringify({path: location.pathname, w: innerWidth, h: innerHeight, h1: document.querySelector('h1')?.textContent})", returnByValue: true });
  console.log(out, info.result?.result?.value);
} finally {
  ws.close(); chrome.kill();
}

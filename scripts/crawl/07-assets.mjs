// Download the public CSS and fonts the pages actually load (from the saved network logs / <link> tags), plus
// fonts and theme images referenced by url() inside that CSS -> legacy/assets/{css,fonts,images}/<host>/<path>.
// Read-only GET; polite (sequential, >=500 ms). Resumable (skips existing files). Manifest: legacy/assets/manifest.csv
//   NODE_USE_ENV_PROXY=1 node scripts/crawl/07-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { LEGACY, UA, sleep, mkdir, writeCsv } from './lib.mjs';

const OUT = path.join(LEGACY, 'assets');
const HOSTS = new Set(['www.hishairclinic.hk', 'fonts.googleapis.com', 'fonts.gstatic.com', 'theratio.s3.amazonaws.com']);
const EXT = path.join(LEGACY, 'cache', 'extract');
const want = new Map(); // url -> {kind, pages:Set}
const add = (u, kind, page) => {
  let x; try { x = new URL(u); } catch { return; }
  if (!HOSTS.has(x.hostname) || !/^https?:$/.test(x.protocol)) return;
  x.hash = '';
  const key = x.hostname === 'fonts.googleapis.com' ? x.href : x.origin + x.pathname; // drop ?ver= for same-host files
  if (!want.has(key)) want.set(key, { url: x.href, kind, pages: new Set() });
  want.get(key).pages.add(page);
};
for (const f of fs.readdirSync(EXT)) {
  const d = JSON.parse(fs.readFileSync(path.join(EXT, f), 'utf8'));
  for (const n of d.netlog) if (n.type === 'stylesheet') add(n.url, 'css', d.slug); else if (n.type === 'font') add(n.url, 'font', d.slug);
  for (const l of d.links) if (l.rel === 'stylesheet') add(l.href, 'css', d.slug);
}
const rows = [];
const done = new Set();
async function get(entry, kind) {
  const x = new URL(entry.url);
  let rel = decodeURIComponent(x.pathname).replace(/^\//, '');
  if (x.hostname === 'fonts.googleapis.com') rel = 'css-' + crypto.createHash('sha1').update(x.search).digest('hex').slice(0, 10) + '.css';
  const dest = path.join(OUT, kind === 'css' ? 'css' : kind === 'font' ? 'fonts' : 'images', x.hostname, rel);
  let status = 'cached', bytes = 0, ct = '';
  if (!fs.existsSync(dest)) {
    const r = await fetch(entry.url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(45000) }).catch((e) => ({ ok: false, status: 'ERR ' + e.message }));
    status = r.status;
    if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); mkdir(path.dirname(dest)); fs.writeFileSync(dest, b); bytes = b.length; ct = r.headers.get('content-type') || ''; }
    await sleep(500);
  } else bytes = fs.statSync(dest).size;
  rows.push({ url: entry.url, kind, status, bytes, saved_as: path.relative(LEGACY, dest), pages: entry.pages ? entry.pages.size : '' });
  return fs.existsSync(dest) ? dest : null;
}
console.log('queued', want.size);
const cssFiles = [];
for (const e of want.values()) { done.add(e.url); const d = await get(e, e.kind); if (d && e.kind === 'css') cssFiles.push([d, e.url]); }
// second pass: url() references inside the CSS (fonts, theme images)
const extra = new Map();
for (const [file, base] of cssFiles) {
  const css = fs.readFileSync(file, 'utf8');
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    const ref = m[2].trim(); if (ref.startsWith('data:') || ref.startsWith('#')) continue;
    let abs; try { abs = new URL(ref, base); } catch { continue; }
    abs.hash = ''; abs.search = '';
    if (!HOSTS.has(abs.hostname)) continue;
    const isFont = /\.(woff2?|ttf|otf|eot)$/i.test(abs.pathname), isImg = /\.(png|jpe?g|gif|svg|webp)$/i.test(abs.pathname) && /\/wp-content\/(themes|plugins)\//.test(abs.pathname);
    if (!isFont && !isImg) continue;
    if (!done.has(abs.href)) extra.set(abs.href, { url: abs.href, kind: isFont ? 'font' : 'image', pages: null });
  }
}
console.log('url() references to fetch:', extra.size);
for (const e of extra.values()) { done.add(e.url); await get(e, e.kind); }
mkdir(OUT);
writeCsv(path.join(OUT, 'manifest.csv'), rows, ['url', 'kind', 'status', 'bytes', 'saved_as', 'pages']);
const bad = rows.filter((r) => r.status !== 200 && r.status !== 'cached');
console.log('files', rows.length, 'total MB', (rows.reduce((a, r) => a + r.bytes, 0) / 1048576).toFixed(1), 'non-200', bad.length, bad.slice(0, 5).map((b) => b.status + ' ' + b.url));

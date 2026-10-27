// Shared helpers for the legacy-site crawl. READ-ONLY: GET/HEAD only.
// Run with:  NODE_USE_ENV_PROXY=1 node scripts/crawl/<script>.mjs   (the env proxy flag is only needed in sandboxes)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const LEGACY = path.join(ROOT, 'legacy');
export const CACHE = path.join(LEGACY, 'cache', 'http');
export const ORIGIN = 'https://www.hishairclinic.hk';
export const UA = 'HIS-Rebuild-Audit/1.0';
let DELAY_MS = 500;
let CONCURRENCY = 2;
/** Only for non-live targets (e.g. a Cloudflare preview); the live site always uses the polite defaults. */
export function setPacing({ delayMs, concurrency }) { if (delayMs != null) DELAY_MS = delayMs; if (concurrency != null) CONCURRENCY = concurrency; }

fs.mkdirSync(CACHE, { recursive: true });

export const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const mkdir = (p) => fs.mkdirSync(p, { recursive: true });

// ---- rate limiter: max 2 in flight, request starts spaced >= 500ms ----
let inflight = 0;
let lastStart = 0;
const waiters = [];
async function acquire() {
  if (inflight >= CONCURRENCY) await new Promise((r) => waiters.push(r));
  inflight++;
  const wait = Math.max(0, lastStart + DELAY_MS - Date.now());
  lastStart = Date.now() + wait;
  if (wait) await sleep(wait);
}
function release() {
  inflight--;
  const w = waiters.shift();
  if (w) w();
}

const TEXTY = /text|json|xml|javascript|svg/i;

/** Single HTTP hop, no redirect following. Cached on disk by method+url. */
export async function hop(url, { method = 'GET', cache = true, accept } = {}) {
  const key = sha1(method + ' ' + url + ' ' + (accept || ''));
  const meta = path.join(CACHE, key + '.json');
  if (cache && fs.existsSync(meta)) {
    const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
    const bodyPath = path.join(CACHE, key + '.body');
    m.body = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath, 'utf8') : '';
    m.cached = true;
    return m;
  }
  let attempt = 0;
  for (;;) {
    await acquire();
    let res, body = '', err;
    try {
      res = await fetch(url, {
        method,
        redirect: 'manual',
        headers: { 'user-agent': UA, ...(accept ? { accept } : {}) },
        signal: AbortSignal.timeout(45000),
      });
      const ct = res.headers.get('content-type') || '';
      if (method === 'GET' && (TEXTY.test(ct) || !ct)) body = await res.text();
      else if (method === 'GET') await res.arrayBuffer(); // drain, binary not kept
    } catch (e) {
      err = String(e.cause?.code || e.cause?.message || e.message);
    } finally {
      release();
    }
    if (err) {
      if (++attempt <= 3) { await sleep(2000 * attempt); continue; }
      return { url, method, status: 0, error: err, headers: {}, body: '' };
    }
    if ((res.status === 429 || res.status === 503) && attempt < 5) {
      const ra = Number(res.headers.get('retry-after')) || 0;
      attempt++;
      await sleep(Math.max(ra * 1000, 5000 * 2 ** attempt));
      continue;
    }
    const headers = {};
    for (const [k, v] of res.headers) headers[k] = v;
    const out = { url, method, status: res.status, headers, fetchedAt: new Date().toISOString() };
    if (cache) {
      fs.writeFileSync(meta, JSON.stringify(out));
      if (body) fs.writeFileSync(path.join(CACHE, key + '.body'), body);
    }
    return { ...out, body };
  }
}

/** Follow redirects manually. Returns chain of hops. */
export async function chase(url, opts = {}) {
  const chain = [];
  let cur = url;
  for (let i = 0; i < 10; i++) {
    const r = await hop(cur, opts);
    chain.push({ url: cur, status: r.status, location: r.headers.location || '', ct: r.headers['content-type'] || '', r });
    if (r.status >= 300 && r.status < 400 && r.headers.location) {
      cur = new URL(r.headers.location, cur).href;
      continue;
    }
    break;
  }
  const last = chain[chain.length - 1];
  return {
    chain,
    status: last.status,
    finalUrl: last.url,
    last: last.r,
    chainText: chain.map((h) => `${h.status} ${h.url}`).join(' -> '),
  };
}

// ---- tiny regex HTML helpers (discovery only; heavy extraction runs in Playwright) ----
export const decodeEnt = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export function metaTags(html) {
  const out = [];
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const t = m[0];
    const get = (a) => (t.match(new RegExp(`\\b${a}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')) || [])[2] ?? (t.match(new RegExp(`\\b${a}\\s*=\\s*'([^']*)'`, 'i')) || [])[1];
    out.push({ name: (get('name') || get('property') || get('http-equiv') || '').toLowerCase(), content: get('content') ?? '' });
  }
  return out;
}
export function linkTags(html) {
  const out = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const t = m[0];
    const get = (a) => (t.match(new RegExp(`\\b${a}\\s*=\\s*"([^"]*)"`, 'i')) || t.match(new RegExp(`\\b${a}\\s*=\\s*'([^']*)'`, 'i')) || [])[1];
    out.push({ rel: (get('rel') || '').toLowerCase(), href: get('href') ? decodeEnt(get('href')) : '', hreflang: get('hreflang') || '', type: get('type') || '' });
  }
  return out;
}
export function hrefs(html) {
  const out = new Set();
  for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)')/gi)) out.add(decodeEnt(m[2] ?? m[3]));
  return [...out];
}
export const titleOf = (html) => decodeEnt((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]).trim();

export const isInternal = (u) => {
  try { const h = new URL(u).hostname; return h === 'www.hishairclinic.hk' || h === 'hishairclinic.hk'; } catch { return false; }
};

/** Path part exactly as it appears in a URL string (no normalisation). */
export const rawPath = (u) => u.replace(/^https?:\/\/[^/]+/i, '').replace(/[?#].*$/, '');

export function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function writeCsv(file, rows, cols) {
  mkdir(path.dirname(file));
  fs.writeFileSync(file, [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n');
}
export function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  const [head, ...rest] = rows;
  return rest.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

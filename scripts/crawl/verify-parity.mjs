// Step 7: URL-parity test harness. Reads legacy/urls.csv and checks that every legacy URL — in its exact
// percent-encoded form, its decoded UTF-8 form, and an upper-case-hex form — still resolves on a target site:
//   * legacy 200  -> target must answer 200 on that path, or a single 301 to the same canonical path that answers 200
//   * legacy 301  -> target must answer a single permanent redirect (301, or Cloudflare's 308) to the legacy target path (which then answers 200)
// Read-only (GET). Writes failures to a CSV and exits 1 if there are any.
//
//   node scripts/crawl/verify-parity.mjs [--base https://preview.pages.dev] [--out legacy/reports/parity-failures.csv]
//        [--scope default|all] [--limit N] [--strict-title] [--fast]
// Default base: $PARITY_BASE, else the live site (use that to prove the harness: expect 0 failures).
// NODE_USE_ENV_PROXY=1 is needed only in proxied sandboxes.
import path from 'node:path';
import { LEGACY, ORIGIN, hop, readCsv, writeCsv, titleOf, setPacing } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : (args[i + 1] ?? true); };
const BASE = String(opt('base', process.env.PARITY_BASE || ORIGIN)).replace(/\/$/, '');
const OUT = path.resolve(String(opt('out', path.join(LEGACY, 'reports', 'parity-failures.csv'))));
const SCOPE = opt('scope', 'default');
const LIMIT = Number(opt('limit', 0)) || Infinity;
const STRICT_TITLE = args.includes('--strict-title');
if (args.includes('--fast') && BASE !== ORIGIN) setPacing({ delayMs: 0, concurrency: 8 }); // never for the live site

// Types that are not "pages that must keep working" (checked elsewhere): API/embeds, assets, junk params, raw probes.
const OUT_OF_SCOPE = new Set(['oembed', 'rest-api', 'upload-file', 'tracking-param', 'probe']);
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const pathOf = (u) => { const x = new URL(u, BASE + '/'); return x.pathname + x.search; };
const norm = (p) => dec(p).replace(/%[0-9a-f]{2}/gi, (m) => m.toUpperCase());   // hex-case-insensitive comparison
const rawPath = (u) => u.replace(/^https?:\/\/[^/]+/i, '');

const rows = readCsv(path.join(LEGACY, 'urls.csv')).filter((r) => {
  if (!/^https:\/\/www\.hishairclinic\.hk/.test(r.url_as_found)) return false;       // host variants are covered by Cloudflare/DNS, not the app
  if (SCOPE !== 'all' && OUT_OF_SCOPE.has(r.post_type)) return false;
  if (r.status !== '200' && r.status !== '301') return false;                          // legacy 404s etc. are not parity targets
  return true;
}).slice(0, LIMIT);

const skippedMultiHop = [];
const failures = [];
let checks = 0, passed = 0, titleWarnings = 0;
async function follow(url) {
  const chain = [];
  let cur = url;
  for (let i = 0; i < 6; i++) {
    const r = await hop(cur, { cache: false });
    chain.push({ url: cur, status: r.status, loc: r.headers.location || '', body: r.body });
    if (r.status >= 300 && r.status < 400 && r.headers.location) cur = new URL(r.headers.location, cur).href; else break;
  }
  return chain;
}

for (const r of rows) {
  if ((r.redirect_chain.match(/->/g) || []).length > 1) { skippedMultiHop.push(r.url_as_found); continue; } // legacy itself is a >1-hop chain (e.g. Elementor kit ?p=6): not a target to reproduce
  const legacyEncoded = rawPath(r.url_as_found);
  const legacyRedirects = r.status === '301' || (r.redirect_chain && r.redirect_chain.includes('->'));
  const expectedPath = pathOf(legacyRedirects ? r.final_url : r.url_as_found);
  const forms = [['encoded-as-found', legacyEncoded]];
  if (/%[0-9A-Fa-f]{2}/.test(legacyEncoded) && !r.url_as_found.includes('?')) {
    forms.push(['decoded-utf8', dec(legacyEncoded)]);
    forms.push(['upper-hex', legacyEncoded.replace(/%[0-9a-f]{2}/gi, (m) => m.toUpperCase())]);
  }
  for (const [form, p] of forms) {
    checks++;
    const chain = await follow(BASE + p);
    const first = chain[0], last = chain[chain.length - 1];
    let problem = '';
    const hops = chain.length - 1;
    if (last.status !== 200) problem = `final status ${last.status}`;
    else if (hops > 1) problem = `${hops} redirect hops (max 1)`;
    else if (hops === 1 && ![301, 308].includes(first.status)) problem = `redirect is ${first.status}, must be a permanent 301/308`;
    else if (norm(pathOf(last.url)) !== norm(expectedPath)) problem = `ends at ${dec(pathOf(last.url))}, expected ${dec(expectedPath)}`;
    else if (!legacyRedirects && hops === 1 && form === 'encoded-as-found') problem = 'canonical legacy URL must answer 200 directly, got a redirect';
    if (!problem && r.title && /html/i.test('text/html') && last.body && titleOf(last.body) !== r.title && !legacyRedirects) {
      titleWarnings++;
      if (STRICT_TITLE) problem = `title differs: "${titleOf(last.body)}" vs legacy "${r.title}"`;
    }
    if (problem) failures.push({ legacy_url: r.url_as_found, form, tested_url: BASE + p, post_type: r.post_type, legacy_status: r.status, expected: expectedPath, got_chain: chain.map((c) => `${c.status} ${c.url}`).join(' -> '), problem });
    else passed++;
  }
  if (checks % 50 === 0) console.error(`  ${checks} checks, ${failures.length} failures`);
}

writeCsv(OUT, failures, ['legacy_url', 'form', 'tested_url', 'post_type', 'legacy_status', 'expected', 'got_chain', 'problem']);
console.log(`base: ${BASE}\nlegacy URLs: ${rows.length}  checks (encoded/decoded/upper-hex forms): ${checks}\nskipped (legacy chain already >1 hop): ${skippedMultiHop.length}${skippedMultiHop.length ? ' → ' + skippedMultiHop.join(', ') : ''}\npassed: ${passed}  failed: ${failures.length}  title differences (warning${STRICT_TITLE ? '→failure' : ''}): ${titleWarnings}\nfailures CSV: ${OUT}`);
const byProblem = failures.reduce((a, f) => ((a[f.problem.replace(/\d+/g, 'N').slice(0, 50)] = (a[f.problem.replace(/\d+/g, 'N').slice(0, 50)] || 0) + 1), a), {});
for (const [k, v] of Object.entries(byProblem)) console.log(`  ${v} × ${k}`);
process.exit(failures.length ? 1 : 0);

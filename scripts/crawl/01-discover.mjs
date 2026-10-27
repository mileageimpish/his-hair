// Step 1: discover URLs (sitemaps + REST + link crawl + probes) and write legacy/urls.csv.
// Read-only (GET/HEAD). Resumable: every HTTP response is cached in legacy/cache/http.
//   NODE_USE_ENV_PROXY=1 node scripts/crawl/01-discover.mjs
import fs from 'node:fs';
import path from 'node:path';
import {
  LEGACY, ORIGIN, hop, chase, mkdir, writeCsv, metaTags, linkTags, hrefs, titleOf, isInternal, rawPath, sha1,
} from './lib.mjs';

const OUT = {
  sitemaps: path.join(LEGACY, 'seo', 'sitemaps'),
  wpjson: path.join(LEGACY, 'wp-json'),
};
mkdir(OUT.sitemaps); mkdir(OUT.wpjson);
const log = (...a) => console.log(...a);
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const CJK = /[㐀-鿿豈-﫿]/;
const keyOf = (u) => { const x = new URL(u); return dec(x.pathname) + x.search; };

/** @type {Map<string, any>} key -> record */
const urls = new Map();
function add(u, source, extra = {}) {
  if (!isInternal(u)) return null;
  u = u.replace(/#.*$/, '');
  const k = keyOf(u);
  let r = urls.get(k);
  if (!r) {
    r = { url_as_found: u, sources: new Set(), depth: '', post_type: '', wp_id: '', in_sitemap: 'n', lastmod: '' };
    urls.set(k, r);
  }
  r.sources.add(source);
  for (const [a, b] of Object.entries(extra)) if (b !== undefined && b !== '' && (r[a] === '' || r[a] === undefined)) r[a] = b;
  return r;
}

// ---------- A. robots + sitemaps ----------
log('A. robots & sitemaps');
const robots = await hop(ORIGIN + '/robots.txt');
fs.mkdirSync(path.join(LEGACY, 'seo'), { recursive: true });
fs.writeFileSync(path.join(LEGACY, 'seo', 'robots.txt'), robots.body);

const sitemapFiles = [];
async function readSitemap(u, depth = 0) {
  const r = await chase(u);
  const name = path.basename(new URL(u).pathname) || 'sitemap.xml';
  sitemapFiles.push({ url: u, status: r.status, final: r.finalUrl, chain: r.chainText });
  if (r.status !== 200) return;
  fs.writeFileSync(path.join(OUT.sitemaps, name), r.last.body);
  for (const m of r.last.body.matchAll(/<(url|sitemap)>([\s\S]*?)<\/\1>/g)) {
    const loc = (m[2].match(/<loc>([^<]*)<\/loc>/) || [])[1]?.trim();
    const lastmod = (m[2].match(/<lastmod>([^<]*)<\/lastmod>/) || [])[1] || '';
    if (!loc) continue;
    if (m[1] === 'sitemap') { if (depth < 3) await readSitemap(loc, depth + 1); }
    else add(loc, 'sitemap', { lastmod }).in_sitemap = 'y', urls.get(keyOf(loc.replace(/#.*$/, ''))).sitemap_file = name;
  }
}
for (const s of ['/sitemap_index.xml', '/sitemap.xml', '/wp-sitemap.xml']) await readSitemap(ORIGIN + s);
log('  sitemap urls:', urls.size);

// ---------- B. REST ----------
log('B. REST API');
const rest = { root: null, namespaces: [], types: {}, collections: {} };
const rootRes = await chase(ORIGIN + '/wp-json/');
rest.root = rootRes.status;
let rootJson = null;
try { rootJson = JSON.parse(rootRes.last.body); } catch {}
if (rootJson) {
  fs.writeFileSync(path.join(OUT.wpjson, 'root.json'), JSON.stringify(rootJson, null, 1));
  rest.namespaces = rootJson.namespaces || [];
  rest.name = rootJson.name; rest.description = rootJson.description; rest.gmt_offset = rootJson.gmt_offset; rest.timezone = rootJson.timezone_string;
}
async function restGet(route, qs, save, { saveBody = true } = {}) {
  const items = []; let page = 1, total = 0, totalPages = 1, status = 0;
  do {
    const u = `${ORIGIN}/wp-json/${route}?${qs}&per_page=100&page=${page}`;
    const r = await hop(u);
    status = r.status;
    if (r.status !== 200) break;
    total = Number(r.headers['x-wp-total'] || 0); totalPages = Number(r.headers['x-wp-totalpages'] || 1);
    let j = []; try { j = JSON.parse(r.body); } catch {}
    if (saveBody && save) fs.writeFileSync(path.join(OUT.wpjson, `${save}-p${page}.json`), JSON.stringify(j, null, 1));
    if (Array.isArray(j)) items.push(...j);
    page++;
  } while (page <= totalPages);
  return { status, total, items };
}
if (rest.namespaces.includes('wp/v2')) {
  const typesRaw = await hop(ORIGIN + '/wp-json/wp/v2/types'); // not paginated
  try { rest.types = JSON.parse(typesRaw.body); fs.writeFileSync(path.join(OUT.wpjson, 'types.json'), JSON.stringify(rest.types, null, 1)); } catch {}
  const taxRaw = await hop(ORIGIN + '/wp-json/wp/v2/taxonomies');
  try { fs.writeFileSync(path.join(OUT.wpjson, 'taxonomies.json'), JSON.stringify(JSON.parse(taxRaw.body), null, 1)); rest.taxonomies = JSON.parse(taxRaw.body); } catch {}
  const bases = new Map([['pages', 'page'], ['posts', 'post'], ['categories', 'category'], ['tags', 'post_tag'], ['media', 'attachment']]);
  for (const [name, def] of Object.entries(rest.types)) {
    if (def.rest_base && !bases.has(def.rest_base) && !['nav_menu_item', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_global_styles', 'wp_font_family', 'wp_font_face'].includes(name)) bases.set(def.rest_base, name);
  }
  for (const [name, def] of Object.entries(rest.taxonomies || {})) if (def.rest_base && !bases.has(def.rest_base)) bases.set(def.rest_base, name);
  for (const [base, type] of bases) {
    const r = await restGet('wp/v2/' + base, '', base);
    rest.collections[base] = { type, status: r.status, total: r.total, fetched: r.items.length };
    log(`  /wp/v2/${base}: ${r.status} total=${r.total}`);
    for (const it of r.items) {
      if (type === 'attachment') continue; // media handled in step 5
      if (it.link) add(it.link, 'rest', { post_type: type, wp_id: it.id });
    }
    if (type !== 'attachment') for (const it of r.items) if (it.link) { const x = urls.get(keyOf(it.link)); if (x) { x.post_type = x.post_type || type; x.wp_id = x.wp_id || it.id; x.sources.add('rest'); if (it.modified_gmt) x.modified = it.modified_gmt; if (it.date_gmt) x.published = it.date_gmt; } }
  }
  // users: record exposure only, never store body
  const u = await hop(ORIGIN + '/wp-json/wp/v2/users?per_page=1');
  rest.users = { status: u.status, total: u.headers['x-wp-total'] || '' };
  log('  users endpoint:', u.status);
} else log('  wp/v2 namespace not found / REST disabled');
fs.writeFileSync(path.join(OUT.wpjson, '_summary.json'), JSON.stringify(rest, null, 1));

// ---------- C. link crawl (source HTML) ----------
log('C. link crawl');
const ASSET_RE = /\.(jpe?g|png|gif|webp|svg|avif|ico|pdf|mp4|mov|webm|mp3|zip|docx?|xlsx?|pptx?|css|js|woff2?|ttf|eot)(\?.*)?$/i;
const queue = [[ORIGIN + '/', 0]];
const crawled = new Set();
const extraSeeds = [];
const rl = path.join(LEGACY, 'cache', 'rendered-links.json'); // written by step 2 (links only visible after JS)
if (fs.existsSync(rl)) for (const u of JSON.parse(fs.readFileSync(rl, 'utf8'))) extraSeeds.push(u);
for (const [k, r] of urls) if (r.sources.has('sitemap') || r.sources.has('rest')) queue.push([r.url_as_found, 1]);
// NB: depth is measured from the homepage via links only; sitemap/REST seeds get their depth only if a link reaches them.
const depthOf = new Map([[keyOf(ORIGIN + '/'), 0]]);
const linkQ = [[ORIGIN + '/', 0]];
const seenLinkK = new Set();
const pageInfo = new Map(); // key -> {html}
let qi = 0;
const work = [[ORIGIN + '/', 0, true]];
for (const u of extraSeeds) { add(u, 'crawl-rendered'); }
const toVisit = new Map(); // key -> [url, depth]
toVisit.set(keyOf(ORIGIN + '/'), [ORIGIN + '/', 0]);
add(ORIGIN + '/', 'crawl').depth = 0;
const visited = new Set();
while (true) {
  const next = [...toVisit.entries()].find(([k]) => !visited.has(k));
  if (!next) break;
  const [k, [u, d]] = next; visited.add(k);
  if (ASSET_RE.test(rawPath(u)) || /\/wp-(content|includes|json|admin)\//i.test(u) || /\/feed\/?$/i.test(rawPath(u))) continue;
  if (new URL(u).search) continue; // query-string URLs recorded, not followed
  const r = await chase(u);
  if (r.status !== 200 || !/html/i.test(r.last.headers['content-type'] || '')) continue;
  const html = r.last.body;
  const hs = new Set(hrefs(html));
  for (const l of linkTags(html)) if (l.href && /alternate|next|prev|canonical|shortlink/.test(l.rel)) hs.add(l.href);
  for (const h of hs) {
    if (/^(mailto:|tel:|javascript:|#|data:|sms:|whatsapp:)/i.test(h)) continue;
    let abs; try { abs = new URL(h, r.finalUrl).href; } catch { continue; }
    if (!isInternal(abs)) continue;
    abs = abs.replace(/#.*$/, '');
    const rec = add(abs, 'crawl');
    const ak = keyOf(abs);
    if (rec.depth === '' ) rec.depth = d + 1;
    if (!toVisit.has(ak)) toVisit.set(ak, [abs, d + 1]);
  }
}
for (const u of extraSeeds) { const k = keyOf(u); if (!toVisit.has(k)) toVisit.set(k, [u, 99]); }
log('  urls after crawl:', urls.size);

// ---------- D. probes ----------
log('D. probes');
const probes = [];
const probePaths = ['/feed/', '/comments/feed/', '/?s=test', '/author/', '/category/', '/tag/', '/page/2/', '/wp-sitemap.xml', '/robots.txt', '/ads.txt', '/app-ads.txt', '/llms.txt', '/humans.txt', '/security.txt', '/.well-known/', '/.well-known/security.txt', '/xmlrpc.php', '/wp-json/', '/portfolio/', '/ot_portfolio/', '/blog/', '/en/', '/en', '/zh-cn/', '/zh-hk/', '/zh/', '/zh-hant/', '/zh-hans/', '/tc/', '/sc/', '/?lang=en', '/?lang=zh-hans', '/readme.html', '/license.txt', '/wp-login.php', '/wp-admin/', '/sitemap.xml', '/main-sitemap.xsl', '/favicon.ico', '/index.php', '/home/', '/404-test-does-not-exist/', '/?attachment_id=1', '/?feed=rss2'];
for (const p of probePaths) {
  const u = ORIGIN + p;
  // wp-login/wp-admin: HEAD only, note existence; never followed further
  const method = /^\/wp-(login|admin)/.test(p) ? 'HEAD' : 'GET';
  const r = method === 'HEAD' ? await (async () => { const h = await hop(u, { method: 'HEAD' }); return { chainText: `${h.status} ${u}` + (h.headers.location ? ' -> ' + h.headers.location : ''), status: h.status, finalUrl: h.headers.location || u, last: h }; })() : await chase(u);
  probes.push({ probe: p, status: r.status, final_url: r.finalUrl, chain: r.chainText, content_type: r.last.headers?.['content-type'] || '' });
  if (!/^\/wp-(login|admin)/.test(p)) add(u, 'probe');
}
// ?p=<id> for each known id
const ids = [...urls.values()].filter((r) => r.wp_id && r.post_type !== 'attachment');
for (const r of ids) {
  const u = `${ORIGIN}/?p=${r.wp_id}`;
  const c = await chase(u);
  probes.push({ probe: `/?p=${r.wp_id}`, status: c.chain[0].status, final_url: c.finalUrl, chain: c.chainText, content_type: c.last.headers['content-type'] || '', expected: r.url_as_found, matches_pretty: dec(c.finalUrl) === dec(r.url_as_found) ? 'y' : 'n' });
  add(u, 'probe', { post_type: r.post_type, wp_id: r.wp_id });
}
writeCsv(path.join(LEGACY, 'probes.csv'), probes, ['probe', 'status', 'final_url', 'chain', 'content_type', 'expected', 'matches_pretty']);

// ---------- E. host / slash / case variants on sample URLs ----------
log('E. variants');
const samples = [];
const pick = (pred) => [...urls.values()].find(pred);
samples.push(ORIGIN + '/');
for (const r of [pick((r) => /\/about-us\/$/.test(r.url_as_found)), pick((r) => r.post_type === 'page' && CJK.test(dec(r.url_as_found))), pick((r) => r.post_type === 'post'), pick((r) => r.post_type === 'ot_portfolio')]) if (r) samples.push(r.url_as_found);
const variants = [];
for (const s of samples) {
  const x = new URL(s);
  const p = x.pathname;
  const forms = [];
  for (const scheme of ['https', 'http']) for (const host of ['www.hishairclinic.hk', 'hishairclinic.hk']) {
    forms.push([`${scheme}://${host}${p}`, `${scheme} ${host === 'www.hishairclinic.hk' ? 'www' : 'non-www'}`]);
  }
  const base = `https://www.hishairclinic.hk`;
  if (p !== '/') {
    forms.push([base + p.replace(/\/$/, ''), 'no trailing slash']);
    forms.push([base + p + (p.endsWith('/') ? '' : '/'), 'with trailing slash']);
    forms.push([base + p.replace(/%[0-9a-f]{2}/gi, (m) => m.toUpperCase()), 'uppercase hex']);
    forms.push([base + p.replace(/%[0-9a-f]{2}/gi, (m) => m.toLowerCase()), 'lowercase hex']);
    if (/%[0-9a-f]{2}/i.test(p)) forms.push([base + '/' + dec(p).slice(1), 'decoded UTF-8 path (client will re-encode)']);
    forms.push([base + p.replace(/[a-z]+/g, (m) => m.toUpperCase()).replace(/%[0-9A-F]{2}/g, (m) => m), 'uppercase ASCII letters']);
  }
  for (const [u, label] of forms) {
    const c = await chase(u);
    variants.push({ sample: s, variant: label, tested_url: u, hops: c.chain.length - 1, status_first: c.chain[0].status, final_status: c.status, final_url: c.finalUrl, chain: c.chainText });
  }
}
writeCsv(path.join(LEGACY, 'url-variants.csv'), variants, ['sample', 'variant', 'tested_url', 'hops', 'status_first', 'final_status', 'final_url', 'chain']);

/** Label URLs that are not WP post objects (archives, feeds, endpoints, files...). */
function classify(u, r) {
  const p = dec(rawPath(u)); const q = new URL(u).search;
  if (r.sitemap_file && /ot_portfolio/.test(r.sitemap_file)) return 'ot_portfolio';
  if (r.sitemap_file && /portfolio_cat/.test(r.sitemap_file)) return 'portfolio_cat';
  if (/\/wp-json\/oembed\//.test(p)) return 'oembed';
  if (/\/wp-json\//.test(p)) return 'rest-api';
  if (/\/(comments\/)?feed\/?$/.test(p) || /[?&]feed=/.test(q)) return 'feed';
  if (/\/wp-content\//.test(p)) return 'upload-file';
  if (/\/page\/\d+\/?$/.test(p)) return 'pagination';
  if (/^\/author\//.test(p)) return 'author-archive';
  if (/^\/category\//.test(p)) return 'category-archive';
  if (/^\/tag\//.test(p)) return 'tag-archive';
  if (/^\/portfolio-category\//.test(p)) return 'portfolio_cat';
  if (/^\/portfolio\/?$/.test(p)) return 'portfolio-archive';
  if (/^\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/?$/.test(p)) return 'post';
  if (/fbclid|utm_|gclid/.test(q)) return 'tracking-param';
  if (q) return 'query-string';
  if (r.sources.has('probe')) return 'probe';
  return 'other';
}

// ---------- F. fetch every URL, build urls.csv ----------
log('F. fetching all', urls.size, 'urls');
const rows = [];
let n = 0;
for (const [k, r] of urls) {
  n++;
  const u = r.url_as_found;
  const isAsset = ASSET_RE.test(rawPath(u)) || /\/wp-content\//.test(u);
  const c = await chase(u, { method: isAsset ? 'HEAD' : 'GET' });
  const first = c.chain[0];
  const hd = c.last.headers || {};
  const html = (!isAsset && /html/i.test(hd['content-type'] || '')) ? c.last.body || '' : '';
  const metas = html ? metaTags(html) : [];
  const robotsMeta = (metas.find((m) => m.name === 'robots') || {}).content || '';
  const xrt = hd['x-robots-tag'] || '';
  const canon = html ? (linkTags(html).find((l) => l.rel === 'canonical') || {}).href || '' : '';
  const htmlLang = html ? (html.match(/<html[^>]*\blang\s*=\s*"([^"]*)"/i) || [, ''])[1] : '';
  const title = html ? titleOf(html) : '';
  const decPath = dec(rawPath(u));
  const lang = /^\/en(\/|$)/.test(decPath) ? 'en' : (CJK.test(title) || CJK.test(decPath)) ? 'zh-HK' : /^en/i.test(htmlLang) && html ? 'en' : (html ? 'unknown' : '');
  let bodyClassId = '';
  if (html && !r.wp_id) { const m = html.match(/\b(?:page-id|postid)-(\d+)/); if (m) bodyClassId = m[1]; }
  // hex case + encoded/decoded parity
  const encPath = rawPath(u);
  const hexes = encPath.match(/%[0-9A-Fa-f]{2}/g) || [];
  const hexCase = !hexes.length ? 'n/a' : hexes.every((h) => h === h.toLowerCase()) ? 'lower' : hexes.every((h) => h === h.toUpperCase()) ? 'upper' : 'mixed';
  const row = {
    url_as_found: u,
    url_decoded: dec(u),
    url_percent_encoded: encPath.startsWith('/') && !isAsset ? ORIGIN + encPath + (new URL(u).search || '') : u,
    source: [...r.sources].sort().join('+'),
    post_type: r.post_type && r.post_type !== 'probe' ? r.post_type : classify(u, r),
    wp_id: r.wp_id || bodyClassId,
    language_guess: lang,
    status: first.status,
    final_url: c.finalUrl,
    redirect_chain: c.chain.length > 1 ? c.chainText : '',
    content_type: (hd['content-type'] || '').split(';')[0],
    in_sitemap: r.in_sitemap,
    noindex: /noindex/i.test(robotsMeta + ' ' + xrt) ? 'y' : 'n',
    canonical: canon,
    depth: r.depth,
    hex_case: hexCase,
    trailing_slash: encPath.endsWith('/') ? 'y' : 'n',
    title,
    html_lang: htmlLang,
    lastmod: r.lastmod || '',
    sitemap_file: r.sitemap_file || '',
    robots_meta: robotsMeta,
    x_robots_tag: xrt,
    encoded_equals_decoded: '', upper_hex_status: '', no_slash_status: '',
    published: r.published || '', modified: r.modified || '',
  };
  // Both forms must return the same page (CJK slugs only, 200 pages only)
  if (hexes.length && c.status === 200 && html) {
    const dTitle = title;
    const decodedForm = ORIGIN + dec(encPath);
    const upperForm = ORIGIN + encPath.replace(/%[0-9a-f]{2}/gi, (m) => m.toUpperCase());
    const d = await chase(decodedForm);
    const up = hexCase === 'upper' ? { status: c.status, last: c.last, chain: c.chain } : await chase(upperForm);
    row.encoded_equals_decoded = `${d.status}${d.chain.length > 1 ? ' via ' + (d.chain.length - 1) + ' hop(s)' : ''}; same title: ${titleOf(d.last.body || '') === dTitle ? 'y' : 'n'}`;
    row.upper_hex_status = `${up.status}${up.chain.length > 1 ? ' via ' + (up.chain.length - 1) + ' hop(s)' : ''}`;
  }
  if (!isAsset && encPath !== '/' && encPath.endsWith('/') && !new URL(u).search) {
    const ns = await chase(ORIGIN + encPath.slice(0, -1));
    row.no_slash_status = `${ns.chain[0].status}${ns.chain[0].location ? ' -> ' + ns.chain[0].location : ''}`;
  }
  rows.push(row);
  if (n % 20 === 0) log(`  ${n}/${urls.size}`);
}
rows.sort((a, b) => a.url_decoded.localeCompare(b.url_decoded));
const COLS = ['url_as_found', 'url_decoded', 'url_percent_encoded', 'source', 'post_type', 'wp_id', 'language_guess', 'status', 'final_url', 'redirect_chain', 'content_type', 'in_sitemap', 'noindex', 'canonical', 'depth', 'hex_case', 'trailing_slash', 'encoded_equals_decoded', 'upper_hex_status', 'no_slash_status', 'title', 'html_lang', 'robots_meta', 'x_robots_tag', 'lastmod', 'sitemap_file', 'published', 'modified'];
writeCsv(path.join(LEGACY, 'urls.csv'), rows, COLS);
fs.writeFileSync(path.join(LEGACY, 'seo', 'sitemap-fetch-log.json'), JSON.stringify(sitemapFiles, null, 1));
log('wrote legacy/urls.csv rows:', rows.length);

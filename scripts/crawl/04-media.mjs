// Step 5: media inventory -> legacy/media.csv. Combines the REST media library (all attachments, with sizes),
// every upload referenced on a crawled page (img, CSS background, video, links) and HEAD-checks them (incl. resized variants).
// Downloads nothing unless --download is passed AND the library total is under 500 MB; files go to legacy/uploads/ (git-ignored).
//   NODE_USE_ENV_PROXY=1 node scripts/crawl/04-media.mjs [--download]
import fs from 'node:fs';
import path from 'node:path';
import { LEGACY, ORIGIN, hop, writeCsv, mkdir, UA } from './lib.mjs';

const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const isUpload = (u) => /^https?:\/\/(www\.)?hishairclinic\.hk\/wp-content\/uploads\//i.test(u);
const norm = (u) => u.replace(/^http:\/\//i, 'https://').replace('://hishairclinic.hk', '://www.hishairclinic.hk').split('#')[0].split('?')[0];
const kindOf = (u, mime = '') => /image\//.test(mime) || /\.(jpe?g|png|gif|webp|svg|avif|ico)$/i.test(u) ? 'image' : /pdf/.test(mime) || /\.pdf$/i.test(u) ? 'pdf' : /video\//.test(mime) || /\.(mp4|mov|webm)$/i.test(u) ? 'video' : /\.css$/i.test(u) ? 'css' : /\.js$/i.test(u) ? 'js' : 'other';

/** @type {Map<string, any>} */
const items = new Map();
const get = (u) => { const k = norm(u); if (!items.has(k)) items.set(k, { url: k, kind: kindOf(k), mime: '', in_library: 'n', library_id: '', size_bytes: '', width: '', height: '', alt_text: '', is_variant_of: '', pages: new Set(), refs: new Set() }); return items.get(k); };

// 1. REST media library
const variantOf = new Map();
const libDir = path.join(LEGACY, 'wp-json');
for (const f of fs.readdirSync(libDir).filter((x) => /^media-p\d+\.json$/.test(x))) {
  for (const m of JSON.parse(fs.readFileSync(path.join(libDir, f), 'utf8'))) {
    const it = get(m.source_url);
    Object.assign(it, { mime: m.mime_type, kind: kindOf(m.source_url, m.mime_type), in_library: 'y', library_id: m.id, size_bytes: m.media_details?.filesize ?? '', width: m.media_details?.width ?? '', height: m.media_details?.height ?? '', alt_text: m.alt_text ?? '', parent_post: m.post || '' });
    it.refs.add('library');
    for (const [name, s] of Object.entries(m.media_details?.sizes || {})) if (norm(s.source_url) !== it.url) variantOf.set(norm(s.source_url), { orig: it.url, name, w: s.width, h: s.height, mime: s.mime_type, size: s.filesize });
  }
}
const libraryCount = items.size;

// 2. usage on pages
const EXT = path.join(LEGACY, 'cache', 'extract');
let pagesScanned = 0;
for (const f of fs.readdirSync(EXT).filter((x) => x.endsWith('.json'))) {
  const ex = JSON.parse(fs.readFileSync(path.join(EXT, f), 'utf8')); pagesScanned++;
  const use = (u, ref) => { if (!u || !isUpload(u)) return; const it = get(u); it.pages.add(ex.final); it.refs.add(ref); };
  for (const i of ex.imgs) { use(i.src, 'img'); use(i.attr_src && new URL(i.attr_src, ex.final).href, 'img'); use(i.data_src && new URL(i.data_src, ex.final).href, 'img-lazy'); }
  for (const b of ex.bgs) use(b, 'css-bg');
  for (const m of ex.media) { use(m.src, 'media'); use(m.poster, 'media'); }
  for (const a of ex.anchors) use(a.href, 'link');
  for (const l of ex.links) use(l.href, 'head-link');
  for (const s of ex.scripts) if (s.src) use(s.src, 'script');
  for (const x of ex.metas['og:image'] || []) use(x, 'og:image');
}
for (const [v, info] of variantOf) { const it = items.get(v); if (it) { it.is_variant_of = info.orig; it.width ||= info.w; it.height ||= info.h; it.mime ||= info.mime || ''; if (info.size) it.size_bytes ||= info.size; } }

// 3. which URLs to HEAD: every library original, every page-used URL, and 2 resized variants per library item
const toCheck = new Set([...items.keys()]);
for (const [v, info] of variantOf) if (['thumbnail', 'medium', 'medium_large', 'large'].includes(info.name)) { if (!items.has(v)) get(v).is_variant_of = info.orig; toCheck.add(v); }
console.log(`library items: ${libraryCount}; page-used/other upload URLs: ${items.size - libraryCount}; HEAD checks: ${toCheck.size}; pages scanned: ${pagesScanned}`);

const libBytes = [...items.values()].filter((i) => i.in_library === 'y').reduce((a, i) => a + (Number(i.size_bytes) || 0), 0);
console.log(`library originals total (REST filesize): ${(libBytes / 1048576).toFixed(1)} MB`);

for (const k of toCheck) {
  const it = items.get(k);
  const r = await hop(k.replace(/[^\x20-\x7e]/g, encodeURIComponent), { method: 'HEAD' });
  it.status = r.status;
  it.content_length = r.headers['content-length'] || '';
  it.content_type = (r.headers['content-type'] || '').split(';')[0];
  it.redirect_to = r.headers.location || '';
  if (!it.size_bytes && it.content_length) it.size_bytes = it.content_length;
}
const rows = [...items.values()].map((i) => ({
  url: i.url, decoded_url: dec(i.url), kind: i.kind, mime: i.mime || i.content_type || '', in_library: i.in_library, library_id: i.library_id, is_variant_of: i.is_variant_of,
  size_bytes: i.size_bytes, width: i.width, height: i.height, alt_text_in_library: i.alt_text, status_head: i.status ?? 'unchecked', redirect_to: i.redirect_to || '',
  how_referenced: [...i.refs].sort().join('+'), pages_count: i.pages.size, pages: [...i.pages].slice(0, 12).map(dec).join(' | '),
})).sort((a, b) => a.url.localeCompare(b.url));
writeCsv(path.join(LEGACY, 'media.csv'), rows, Object.keys(rows[0]));
const bad = rows.filter((r) => r.status_head !== 200 && r.status_head !== 'unchecked');
console.log(`media.csv rows ${rows.length}; non-200: ${bad.length}`);
for (const b of bad.slice(0, 15)) console.log('  ', b.status_head, b.url);

const total = rows.filter((r) => r.in_library === 'y').reduce((a, r) => a + (Number(r.size_bytes) || 0), 0);
fs.writeFileSync(path.join(LEGACY, 'cache', 'media-summary.json'), JSON.stringify({ libraryCount, totalLibraryBytes: total, rows: rows.length, nonOk: bad.length }, null, 1));
if (process.argv.includes('--download')) {
  if (total > 500 * 1048576) { console.log('Library is over 500 MB — NOT downloading; ask the owner.'); process.exit(0); }
  const up = path.join(LEGACY, 'uploads');
  let n = 0;
  for (const r of rows.filter((x) => x.in_library === 'y' && x.status_head === 200)) {
    const dest = path.join(up, dec(new URL(r.url).pathname.replace(/^\/wp-content\/uploads\//, '')));
    if (fs.existsSync(dest)) continue;
    mkdir(path.dirname(dest));
    const res = await fetch(r.url.replace(/[^\x20-\x7e]/g, encodeURIComponent), { headers: { 'user-agent': UA } });
    if (res.ok) fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    await new Promise((x) => setTimeout(x, 500));
    if (++n % 50 === 0) console.log('  downloaded', n);
  }
  console.log('downloaded', n, 'files to legacy/uploads/ (git-ignored)');
}

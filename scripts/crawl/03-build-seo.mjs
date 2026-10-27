// Step 3 (+ mixed-language report): turn legacy/cache/extract/*.json into legacy/seo.csv, legacy/images.csv,
// and legacy/reports/mixed-language-pages.md. Offline: no network requests.
//   node scripts/crawl/03-build-seo.mjs
import fs from 'node:fs';
import path from 'node:path';
import { LEGACY, writeCsv, readCsv, mkdir } from './lib.mjs';

const EXT = path.join(LEGACY, 'cache', 'extract');
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const isInternal = (u) => /^https?:\/\/(www\.)?hishairclinic\.hk(\/|$)/i.test(u);
const CJK_RE = /[㐀-鿿豈-﫿]/g;
const urlRows = new Map(readCsv(path.join(LEGACY, 'urls.csv')).map((r) => [r.url_as_found, r]));

const rows = [], imgRows = [], mixed = [];
function typesOf(node, out = new Set()) {
  if (Array.isArray(node)) node.forEach((n) => typesOf(n, out));
  else if (node && typeof node === 'object') {
    if (node['@type']) [].concat(node['@type']).forEach((t) => out.add(t));
    for (const v of Object.values(node)) if (typeof v === 'object') typesOf(v, out);
  }
  return out;
}
function datesOf(node, key, out = []) {
  if (Array.isArray(node)) node.forEach((n) => datesOf(n, key, out));
  else if (node && typeof node === 'object') { if (node[key]) out.push(node[key]); Object.values(node).forEach((v) => typeof v === 'object' && datesOf(v, key, out)); }
  return out;
}

for (const f of fs.readdirSync(EXT).filter((x) => x.endsWith('.json')).sort()) {
  const ex = JSON.parse(fs.readFileSync(path.join(EXT, f), 'utf8'));
  const m = (k) => (ex.metas[k] || [])[0] ?? '';
  const textFile = path.join(LEGACY, 'text', ex.slug + '.md');
  const text = fs.existsSync(textFile) ? fs.readFileSync(textFile, 'utf8').replace(/^<!--.*?-->\s*/s, '') : '';
  const cjk = (text.match(CJK_RE) || []).length;
  const latinWords = (text.replace(CJK_RE, ' ').match(/[A-Za-z][A-Za-z'’-]*/g) || []).length;
  const ld = []; for (const s of ex.jsonld) { try { ld.push(JSON.parse(s)); } catch {} }
  const ldTypes = [...typesOf(ld)];
  const canonical = (ex.links.find((l) => l.rel === 'canonical') || {}).href || '';
  const hreflang = ex.links.filter((l) => /alternate/.test(l.rel) && l.hreflang).map((l) => `${l.hreflang}=${l.href}`);
  const internal = ex.anchors.filter((a) => isInternal(a.href) && !/^#/.test(a.raw || ''));
  const outbound = [...new Set(ex.anchors.filter((a) => !isInternal(a.href) && /^https?:/i.test(a.href)).map((a) => a.href))];
  const h1s = ex.headings.filter((h) => h.level === 1);
  const src = fs.existsSync(path.join(LEGACY, 'html', 'source', ex.slug + '.html')) ? fs.readFileSync(path.join(LEGACY, 'html', 'source', ex.slug + '.html'), 'utf8') : '';
  const cm = ex.comments.join('\n') + '\n' + src.slice(0, 400000);
  const plugin = [/Rank Math/i.test(cm) && 'Rank Math', /Yoast/i.test(cm) && 'Yoast', /All in One SEO|AIOSEO/i.test(cm) && 'AIOSEO', /SEOPress/i.test(cm) && 'SEOPress'].filter(Boolean).join('+') || 'none detected';
  const pub = m('article:published_time') || datesOf(ld, 'datePublished')[0] || '';
  const mod = m('article:modified_time') || m('og:updated_time') || datesOf(ld, 'dateModified')[0] || '';
  const ratio = cjk / Math.max(1, cjk + latinWords);
  const contentLang = cjk + latinWords < 20 ? 'n/a (little text)' : ratio > 0.5 ? 'zh' : ratio < 0.05 ? 'en' : 'mixed';
  const colloq = (text.match(/[嘅咗唔冇嚟咁哋啲喺佢嘢乜]/g) || []).length;
  const ur = urlRows.get(ex.url);
  const og = (k) => m('og:' + k);
  rows.push({
    url: ex.url, final_url: ex.final, slug: ex.slug, post_type: ex.post_type, status: ex.status,
    title: ex.title, title_chars: [...ex.title].length, meta_description: m('description'), description_chars: [...m('description')].length,
    canonical, canonical_matches_final: canonical ? (dec(canonical) === dec(ex.final) ? 'y' : 'n') : 'missing',
    robots_meta: m('robots'), x_robots_tag: ex.http_headers['x-robots-tag'] || '', html_lang: ex.html_lang, hreflang: hreflang.join(' | '),
    og_title: og('title'), og_description: og('description'), og_type: og('type'), og_url: og('url'), og_image: og('image'), og_image_alt: og('image:alt'), og_locale: og('locale'), og_site_name: og('site_name'),
    twitter_card: m('twitter:card'), twitter_title: m('twitter:title'), twitter_description: m('twitter:description'), twitter_image: m('twitter:image'),
    h1: h1s.map((h) => h.text).join(' | '), h1_count: h1s.length,
    heading_outline: ex.headings.map((h) => `${'  '.repeat(h.level - 1)}h${h.level}: ${h.text}`).join('\n'),
    word_count: cjk + latinWords, cjk_chars: cjk, latin_words: latinWords, colloquial_cantonese_chars: colloq, content_language: contentLang,
    internal_links_total: internal.length, internal_links_in_body: internal.filter((a) => a.region === 'body').length, outbound_links_count: outbound.length, outbound_links: outbound.join(' | '),
    images: ex.imgs.length, images_missing_alt_attr: ex.imgs.filter((i) => !i.has_alt_attr).length, images_empty_alt: ex.imgs.filter((i) => i.has_alt_attr && !(i.alt || '').trim()).length, images_lazy: ex.imgs.filter((i) => i.loading === 'lazy' || i.data_src).length,
    jsonld_blocks: ex.jsonld.length, jsonld_types: ldTypes.join(' | '), schema_file: ex.jsonld.length ? 'schema/' + ex.slug + '.json' : '',
    seo_plugin: plugin, generator_meta: (ex.metas.generator || []).join(' | '),
    date_published: pub, date_modified: mod, rest_published_gmt: ur?.published || '', rest_modified_gmt: ur?.modified || '',
    body_class_page_id: ex.page_id,
  });
  for (const i of ex.imgs) imgRows.push({ page: ex.final, src: i.src, alt: i.alt ?? '', has_alt_attr: i.has_alt_attr ? 'y' : 'n', width_attr: i.width_attr ?? '', height_attr: i.height_attr ?? '', natural_size: i.natural, loading: i.loading, data_src: i.data_src, srcset: i.srcset ? 'y' : 'n' });

  // mixed-language detection: runs of >=4 consecutive English words inside a page that is otherwise Chinese
  const runs = [...text.matchAll(/[A-Za-z][A-Za-z'’.-]*(?:[ ,]+[A-Za-z][A-Za-z'’.-]*){3,}/g)].map((x) => x[0]);
  const skip = /^(Scalp Micropigmentation|SCALP MICRO-?PIGMENTATION|Before Treatment)/i;
  const real = runs.filter((r) => !skip.test(r) && !/^https?|^www\./i.test(r));
  if (cjk > 20 && (real.length || (m('og:locale') && /en/i.test(m('og:locale'))))) {
    const lines = text.split('\n').filter((l) => real.some((r) => l.includes(r)));
    mixed.push({ url: ex.final, title: ex.title, cjk, latinWords, runs: real.length, sample: lines.slice(0, 3).map((l) => l.slice(0, 220)) });
  }
}
const COLS = Object.keys(rows[0] || { url: 1 });
rows.sort((a, b) => dec(a.final_url).localeCompare(dec(b.final_url)));
writeCsv(path.join(LEGACY, 'seo.csv'), rows, COLS);
writeCsv(path.join(LEGACY, 'images.csv'), imgRows, ['page', 'src', 'alt', 'has_alt_attr', 'width_attr', 'height_attr', 'natural_size', 'loading', 'data_src', 'srcset']);

mkdir(path.join(LEGACY, 'reports'));
mixed.sort((a, b) => b.runs - a.runs);
const md = [
  '# Pages mixing Chinese and English in one document',
  '',
  `Detected from the visible main-content text (\`legacy/text/*.md\`): a page that has Chinese body copy **and** at least one run of 4+ consecutive English words (brand terms like "Scalp Micropigmentation" excluded). Text is quoted exactly as found. ${mixed.length} of ${rows.length} pages flagged. Generated by \`scripts/crawl/03-build-seo.mjs\`.`,
  '',
  'CLAUDE.md rule: never mix languages on a page. These need an owner decision (translate/split into /en/ documents, or keep as-is for parity in v1 and flag).',
  '',
  '| Page | Title | CJK chars | Latin words | English runs | Sample (exact) |',
  '|---|---|---:|---:|---:|---|',
  ...mixed.map((r) => `| ${dec(r.url)} | ${r.title.replace(/\|/g, '\\|')} | ${r.cjk} | ${r.latinWords} | ${r.runs} | ${r.sample.map((s) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')).join('<br>')} |`),
  '',
  '## Language overview of every page',
  '',
  '| content_language | pages |',
  '|---|---:|',
  ...Object.entries(rows.reduce((a, r) => ((a[r.content_language] = (a[r.content_language] || 0) + 1), a), {})).map(([k, v]) => `| ${k} | ${v} |`),
  '',
  `Pages with \`<html lang>\`: ${[...new Set(rows.map((r) => r.html_lang))].join(', ')}. Pages using colloquial Cantonese characters (嘅 咗 唔 冇 etc.) in body copy: ${rows.filter((r) => r.colloquial_cantonese_chars > 0).length}.`,
  '',
].join('\n');
fs.writeFileSync(path.join(LEGACY, 'reports', 'mixed-language-pages.md'), md);
console.log('seo.csv rows', rows.length, '| images', imgRows.length, '| mixed-language pages', mixed.length);

// Refine urls.csv language_guess using the actual body language (title-based guess calls English posts "zh-HK"
// because the site-name suffix is Chinese). Idempotent; re-run 01-discover.mjs resets it, then run this again.
{
  const file = path.join(LEGACY, 'urls.csv');
  const urlList = readCsv(file);
  const byFinal = new Map(rows.map((r) => [dec(r.final_url), r]));
  const map = { zh: 'zh-HK', en: 'en', mixed: 'zh-HK+en (mixed)' };
  let changed = 0;
  for (const u of urlList) {
    const s = byFinal.get(dec(u.final_url));
    if (!s || String(s.status) !== '200' || !map[s.content_language]) continue;
    if (u.language_guess !== map[s.content_language]) { u.language_guess = map[s.content_language]; changed++; }
  }
  writeCsv(file, urlList, Object.keys(urlList[0]));
  console.log('urls.csv language_guess refined for', changed, 'rows');
}

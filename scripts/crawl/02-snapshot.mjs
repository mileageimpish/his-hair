// Steps 2-4 (data capture): for every 200 HTML page save source/rendered HTML, screenshots, text, and a JSON
// extract (SEO, schema, network log, cookies, forms, contact points, floating buttons) into legacy/cache/extract/.
// Read-only: loads pages like a visitor, never clicks, types, or submits anything. One page at a time, >=1.5s apart.
//   NODE_USE_ENV_PROXY=1 node scripts/crawl/02-snapshot.mjs [--limit N] [--only substring] [--headed]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { LEGACY, ORIGIN, UA, chase, sha1, sleep, mkdir, readCsv, writeCsv } from './lib.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf('--' + n); return i < 0 ? null : args[i + 1] ?? true; };
const LIMIT = Number(opt('limit')) || Infinity;
const ONLY = opt('only');
const HEADED = args.includes('--headed');
const FORCE = args.includes('--force'); // re-capture even if outputs exist
const dirs = {
  src: path.join(LEGACY, 'html', 'source'), ren: path.join(LEGACY, 'html', 'rendered'), shot: path.join(LEGACY, 'screenshots'),
  text: path.join(LEGACY, 'text'), schema: path.join(LEGACY, 'schema'), ext: path.join(LEGACY, 'cache', 'extract'),
};
Object.values(dirs).forEach(mkdir);
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

// ---- choose pages ----
const rows = readCsv(path.join(LEGACY, 'urls.csv'));
const SKIP_TYPES = new Set(['probe', 'rest-api', 'oembed', 'feed', 'tracking-param', 'query-string', 'upload-file']);
const seen = new Set();
const pages = [];
for (const r of rows) {
  const is404Probe = r.url_as_found.endsWith('/404-test-does-not-exist/');
  if (!is404Probe && !(r.status === '200' && r.content_type === 'text/html' && !SKIP_TYPES.has(r.post_type))) continue;
  const key = dec(r.final_url);
  if (seen.has(key) || !/^https:\/\/www\.hishairclinic\.hk\//.test(r.final_url)) continue;
  seen.add(key);
  pages.push({ url: r.url_as_found, final: r.final_url, post_type: r.post_type, is404: is404Probe });
}
const ASCII = (s) => s.replace(/[^\x20-\x7e]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40);
function slugFor(final) {
  const p = new URL(final);
  const decoded = dec(p.pathname).replace(/^\/|\/$/g, '');
  const ascii = ASCII(decoded);
  return (decoded === '' ? 'home' : (ascii || 'zh') ) + (decoded === '' ? '' : '-' + sha1(p.pathname + p.search).slice(0, 8));
}
for (const p of pages) p.slug = slugFor(p.final);
console.log('pages to snapshot:', pages.length);

// ---- in-page extraction (runs inside the browser; pure DOM reads) ----
const EXTRACT = () => {
  const abs = (u) => { try { return new URL(u, location.href).href; } catch { return u; } };
  const txt = (e) => (e?.textContent || '').replace(/\s+/g, ' ').trim();
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') ?? null;
  const metas = {};
  for (const m of document.querySelectorAll('meta[name],meta[property],meta[http-equiv]')) {
    const k = (m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('http-equiv')).toLowerCase();
    (metas[k] ||= []).push(m.getAttribute('content'));
  }
  const links = [...document.querySelectorAll('link[rel]')].map((l) => ({ rel: l.rel, href: l.href, hreflang: l.hreflang, type: l.type }));
  const hdgs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({ level: +h.tagName[1], text: txt(h), visible: !!(h.offsetWidth || h.offsetHeight) }));
  const anchors = [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.href, raw: a.getAttribute('href'), text: txt(a).slice(0, 120), rel: a.rel, target: a.target, region: a.closest('header,.elementor-location-header') ? 'header' : a.closest('footer,.elementor-location-footer') ? 'footer' : a.closest('nav') ? 'nav' : 'body' }));
  const imgs = [...document.querySelectorAll('img')].map((i) => ({ src: i.currentSrc || i.src, attr_src: i.getAttribute('src'), data_src: i.getAttribute('data-src') || i.getAttribute('data-lazy-src') || '', alt: i.getAttribute('alt'), has_alt_attr: i.hasAttribute('alt'), width_attr: i.getAttribute('width'), height_attr: i.getAttribute('height'), natural: `${i.naturalWidth}x${i.naturalHeight}`, loading: i.getAttribute('loading') || '', srcset: !!i.srcset }));
  const bgs = [];
  for (const e of document.querySelectorAll('*')) {
    const b = getComputedStyle(e).backgroundImage;
    if (b && b !== 'none') for (const m of b.matchAll(/url\(["']?([^"')]+)["']?\)/g)) if (!m[1].startsWith('data:')) bgs.push(abs(m[1]));
  }
  const media = [...document.querySelectorAll('video,audio,source')].map((v) => ({ tag: v.tagName, src: v.currentSrc || v.src || '', poster: v.poster || '' }));
  const iframes = [...document.querySelectorAll('iframe')].map((f) => ({ src: f.src || f.getAttribute('data-src') || f.getAttribute('data-lazy-src') || '', title: f.title, visible: !!(f.offsetWidth || f.offsetHeight) }));
  const scripts = [...document.querySelectorAll('script')].map((s) => ({ src: s.src, id: s.id, type: s.type, inline: s.src ? '' : s.textContent.slice(0, 20000) }));
  const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent);
  // forms (never submitted)
  const forms = [...document.querySelectorAll('form')].map((f) => {
    const labelFor = (el) => (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`) ? txt(document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) : el.closest('label') ? txt(el.closest('label')) : el.getAttribute('aria-label') || el.placeholder || '');
    return {
      id: f.id, cls: f.className, action: f.getAttribute('action'), method: f.method, enctype: f.enctype,
      fields: [...f.querySelectorAll('input,textarea,select,button')].map((el) => ({ tag: el.tagName, type: el.type, name: el.name, id: el.id, label: labelFor(el), placeholder: el.placeholder || '', required: el.required || el.getAttribute('aria-required') === 'true', value: el.type === 'hidden' || el.type === 'submit' || el.tagName === 'BUTTON' ? (el.value || txt(el)).slice(0, 120) : '', options: el.tagName === 'SELECT' ? [...el.options].map((o) => o.text) : undefined })),
      captcha: !!f.querySelector('.g-recaptcha,[class*=recaptcha],[data-sitekey],.h-captcha,.cf-turnstile'),
      honeypot: [...f.querySelectorAll('input')].filter((i) => /honeypot|hp|_wpcf7_ak|ak_hp|website_url/i.test(i.name + i.className + i.id)).map((i) => i.name),
      outer_attrs: [...f.attributes].map((a) => `${a.name}=${a.value}`.slice(0, 200)),
      visible: !!(f.offsetWidth || f.offsetHeight),
      in_region: f.closest('header,.elementor-location-header') ? 'header' : f.closest('footer,.elementor-location-footer') ? 'footer' : 'body',
    };
  });
  // floating / sticky UI
  const floating = [];
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = e.getBoundingClientRect();
    const hrefs = [...e.querySelectorAll('a[href]')].map((a) => a.href);
    if (e.tagName === 'A') hrefs.push(e.href);
    if (!(e.offsetWidth && e.offsetHeight) && !hrefs.length && !txt(e)) continue;
    floating.push({ tag: e.tagName, id: e.id, cls: String(e.className).slice(0, 150), position: cs.position, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vw: innerWidth, vh: innerHeight, text: txt(e).slice(0, 150), hrefs: [...new Set(hrefs)], z: cs.zIndex });
  }
  // Joinchat (WhatsApp) plugin: settings hold the number and prefilled message; the button may be zero-sized until its delay
  const jcEl = document.querySelector('.joinchat');
  const joinchat = jcEl ? {
    attrs: [...jcEl.attributes].map((a) => `${a.name}=${a.value}`.slice(0, 1500)),
    button: (() => { const b = jcEl.querySelector('.joinchat__button'); if (!b) return null; const r = b.getBoundingClientRect(); const c = getComputedStyle(jcEl); return { text: txt(b), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vw: innerWidth, vh: innerHeight, container_position: c.position, container_display: c.display, bottom: c.bottom, right: c.right, left: c.left }; })(),
    box_text: txt(jcEl.querySelector('.joinchat__box')).slice(0, 600),
    inline_settings: window.joinchat_obj?.settings || null,
  } : null;
  const html = document.documentElement;
  const bodyCls = document.body.className;
  const pageId = (bodyCls.match(/\b(?:page-id|postid)-(\d+)/) || [])[1] || '';
  const consent = [...document.querySelectorAll('[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[id*=cmplz],[class*=cmplz],[id*=gdpr i],[class*=gdpr i],[id*=cookiebot i],[id*=onetrust i],[class*=cli-]')].filter((e) => e.offsetWidth && e.offsetHeight).map((e) => ({ id: e.id, cls: String(e.className).slice(0, 100), text: txt(e).slice(0, 300) }));
  const comments = [];
  const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT);
  while (walker.nextNode()) comments.push(walker.currentNode.nodeValue.trim().slice(0, 300));
  const globals = {};
  for (const k of ['dataLayer', 'gtag', 'ga', 'GoogleAnalyticsObject', 'fbq', '_fbq', 'google_tag_manager', 'hj', 'clarity', 'elementorFrontend', 'elementorFrontendConfig', 'wpcf7', 'jQuery', 'wp', 'Swiper', 'google', 'gaGlobal', 'ym', 'lintrk', 'twq', '_paq', 'zE', 'Tawk_API', 'Intercom', 'tidioChatApi', 'LiveChatWidget', 'FB', 'ttq']) globals[k] = typeof window[k] !== 'undefined';
  let dl = null; try { dl = (window.dataLayer || []).map((x) => { try { return JSON.parse(JSON.stringify(x)); } catch { return String(x); } }).slice(0, 40); } catch {}
  let gtm = null; try { gtm = Object.keys(window.google_tag_manager || {}); } catch {}
  return {
    final_url: location.href, title: document.title, html_lang: html.lang, html_dir: html.dir, html_class: html.className.slice(0, 300), body_class: bodyCls, page_id: pageId,
    metas, links, joinchat, headings: hdgs, anchors, imgs, bgs: [...new Set(bgs)], media, iframes, scripts, jsonld, forms, floating, consent, comments, globals, dataLayer: dl, gtm_containers: gtm,
    elementor: { data_elementor_type: [...document.querySelectorAll('[data-elementor-type]')].map((e) => e.getAttribute('data-elementor-type')), widgets: [...new Set([...document.querySelectorAll('[data-widget_type]')].map((e) => e.getAttribute('data-widget_type')))], elementor_els: document.querySelectorAll('[class*="elementor-"]').length },
    body_text_len: document.body.innerText.length,
  };
};

// ---- visible main-content text -> markdown-ish ----
const TO_MD = () => {
  const SKIP = 'script,style,noscript,template,svg,iframe,header,footer,nav,#site-header,#site-footer,#side-panel,.mmenu-wrapper,.joinchat,.elementor-location-header,.elementor-location-footer,#wpadminbar,[class*=cookie],[id*=cookie],.skip-link,.screen-reader-text,[aria-hidden=true]';
  const out = [];
  const vis = (e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && (e.offsetWidth || e.offsetHeight || e.getClientRects().length); };
  const inline = (n) => (n.innerText ?? n.textContent ?? '').replace(/[ \t]*\n[ \t]*/g, ' ').replace(/\s+/g, ' ').trim();
  function walk(e) {
    if (e.nodeType !== 1) return;
    if (e.matches(SKIP) || !vis(e)) return;
    const t = e.tagName;
    if (/^H[1-6]$/.test(t)) { const s = inline(e); if (s) out.push('\n' + '#'.repeat(+t[1]) + ' ' + s + '\n'); return; }
    if (t === 'P') { const s = inline(e); if (s) out.push(s + '\n'); return; }
    if (t === 'LI') { const s = inline(e); if (s) out.push('- ' + s); return; }
    if (t === 'BLOCKQUOTE') { const s = inline(e); if (s) out.push('> ' + s + '\n'); return; }
    if (t === 'TR') { const s = [...e.children].map(inline).join(' | '); if (s.replace(/[| ]/g, '')) out.push('| ' + s + ' |'); return; }
    if (t === 'IMG') { const a = e.getAttribute('alt'); if (a) out.push(`![${a}]`); return; }
    if (t === 'A' && e.children.length === 0 && /\b(button|btn)\b/.test(e.className)) { const s = inline(e); if (s) out.push(`[${s}](${e.getAttribute('href') || ''})\n`); return; }
    const kids = [...e.childNodes];
    const hasBlock = kids.some((k) => k.nodeType === 1 && /^(DIV|SECTION|ARTICLE|P|H[1-6]|UL|OL|LI|TABLE|TR|FIGURE|BLOCKQUOTE|MAIN|ASIDE|FORM|BUTTON|A)$/.test(k.tagName));
    if (!hasBlock) { const s = inline(e); if (s) out.push(s + '\n'); return; }
    for (const k of kids) {
      if (k.nodeType === 3) { const s = k.textContent.replace(/\s+/g, ' ').trim(); if (s) out.push(s + '\n'); }
      else walk(k);
    }
  }
  const root = document.body; // header/footer/nav are skipped by SKIP; side-panels live inside the header template
  walk(root);
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0; const step = Math.max(300, innerHeight * 0.6);
      const t = setInterval(() => { scrollBy(0, step); y += step; if (y >= document.documentElement.scrollHeight + step || y > 60000) { clearInterval(t); res(); } }, 450);
    });
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(800);
}

// Full-page shot: the theme's scroll-reveal animations leave sections faded in a plain fullPage capture, so the
// viewport is stretched to the page height (capped by Chromium's 16k texture limit) and given time to reveal.
async function shot(page, file, width) {
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.min(Math.max(H, 600), 15000) });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: file, fullPage: true, timeout: 90000 });
}

async function gotoSettled(page, url) {
  const netlog = [];
  const onReq = (r) => netlog.push({ url: r.url(), type: r.resourceType(), method: r.method(), t: Date.now() });
  const onRes = (r) => { const e = netlog.find((x) => x.url === r.url() && x.status === undefined); if (e) { e.status = r.status(); e.ct = r.headers()['content-type'] || ''; } };
  page.on('request', onReq); page.on('response', onRes);
  const resp = await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  page.off('request', onReq); page.off('response', onRes);
  return { resp, netlog };
}

const browser = await chromium.launch({ headless: !HEADED, ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) });
const renderedLinks = new Set();
const pageMap = [];
let done = 0;
for (const pg of pages) {
  if (ONLY && !pg.final.includes(ONLY)) continue;
  if (done >= LIMIT) break;
  const f = {
    src: path.join(dirs.src, pg.slug + '.html'), ren: path.join(dirs.ren, pg.slug + '.html'),
    dsk: path.join(dirs.shot, pg.slug + '-desktop.png'), mob: path.join(dirs.shot, pg.slug + '-mobile.png'),
    text: path.join(dirs.text, pg.slug + '.md'), ext: path.join(dirs.ext, pg.slug + '.json'),
  };
  const complete = [f.src, f.ren, f.dsk, f.mob, f.text, f.ext].every((x) => fs.existsSync(x));
  pageMap.push({ url: pg.url, final_url: pg.final, slug: pg.slug, source_html: path.relative(LEGACY, f.src), rendered_html: path.relative(LEGACY, f.ren), desktop_png: path.relative(LEGACY, f.dsk), mobile_png: path.relative(LEGACY, f.mob), text_md: path.relative(LEGACY, f.text), schema_json: '', post_type: pg.post_type });
  if (complete && !FORCE) { try { for (const a of JSON.parse(fs.readFileSync(f.ext, 'utf8')).anchors) renderedLinks.add(a.href); } catch {} continue; }
  done++;
  console.log(`[${done}] ${decodeURIComponent(pg.final)}`);
  try {
    // raw source as served (cached GET from discovery)
    const c = await chase(pg.final);
    fs.writeFileSync(f.src, c.last.body || '');
    const srcHeaders = c.last.headers;
    // Desktop pass
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'zh-HK' });
    const page = await ctx.newPage();
    const { resp, netlog } = await gotoSettled(page, pg.final);
    const cookiesAtLoad = await ctx.cookies();       // before any scrolling/interaction
    const lsAtLoad = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    await autoScroll(page);
    await page.waitForTimeout(500);
    const ex = await page.evaluate(EXTRACT);
    const floatingDesktop = ex.floating;
    const md = await page.evaluate(TO_MD);
    fs.writeFileSync(f.ren, '<!DOCTYPE html>\n' + await page.evaluate(() => document.documentElement.outerHTML));
    await shot(page, f.dsk, 1440);
    fs.writeFileSync(f.text, `<!-- ${pg.final} -->\n\n` + md + '\n');
    // schema
    if (ex.jsonld.length) {
      const parsed = ex.jsonld.map((s) => { try { return JSON.parse(s); } catch { return { _unparseable: s }; } });
      fs.writeFileSync(path.join(dirs.schema, pg.slug + '.json'), JSON.stringify(parsed.length === 1 ? parsed[0] : parsed, null, 2));
      pageMap[pageMap.length - 1].schema_json = 'schema/' + pg.slug + '.json';
    }
    await ctx.close();
    await sleep(700);
    // Mobile pass (fresh context so responsive JS/lazy assets behave like a phone)
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'zh-HK' });
    const mpage = await mctx.newPage();
    await gotoSettled(mpage, pg.final);
    await autoScroll(mpage);
    const floatingMobile = (await mpage.evaluate(EXTRACT)).floating;
    const mobileOverflow = await mpage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    await shot(mpage, f.mob, 390);
    await mctx.close();
    fs.writeFileSync(f.ext, JSON.stringify({
      url: pg.url, final: pg.final, slug: pg.slug, post_type: pg.post_type, status: resp.status(), http_headers: srcHeaders, source_len: (c.last.body || '').length,
      cookies_at_load: cookiesAtLoad.map(({ name, domain, path: p, expires, httpOnly, secure, sameSite }) => ({ name, domain, path: p, expires, httpOnly, secure, sameSite })),
      storage_at_load: lsAtLoad, netlog: netlog.map(({ url, type, status, ct }) => ({ url, type, status, ct })), floating_desktop: floatingDesktop, floating_mobile: floatingMobile, mobile_horizontal_overflow: mobileOverflow,
      ...ex, floating: undefined,
    }));
    for (const a of ex.anchors) renderedLinks.add(a.href);
  } catch (e) {
    console.log('  FAILED', e.message.slice(0, 200));
  }
  await sleep(1500);
}
await browser.close();
writeCsv(path.join(LEGACY, 'page-map.csv'), pageMap, ['url', 'final_url', 'slug', 'post_type', 'source_html', 'rendered_html', 'desktop_png', 'mobile_png', 'text_md', 'schema_json']);
const internal = [...renderedLinks].filter((u) => /^https?:\/\/(www\.)?hishairclinic\.hk\//.test(u));
fs.writeFileSync(path.join(LEGACY, 'cache', 'rendered-links.json'), JSON.stringify(internal));
console.log('done. page-map rows:', pageMap.length, 'rendered internal links:', internal.length);

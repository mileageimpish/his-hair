// Read the *computed* design values from the template pages (colours, fonts, type scale, spacing, buttons, layout widths,
// CSS custom properties) -> legacy/assets/design-tokens.json and legacy/reports/design-tokens.md. Read-only page loads
// (19 desktop 1440 + 4 mobile 390), one at a time. Breakpoints are parsed offline from legacy/assets/css.
//   NODE_USE_ENV_PROXY=1 node scripts/crawl/08-design-tokens.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { LEGACY, UA, sleep, readCsv, mkdir } from './lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const templates = readCsv(path.join(LEGACY, 'templates.csv'));
const MOBILE = new Set(['home', 'service-page', 'post-classic', 'contact']);

const SAMPLE = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const px = (v) => (v && v.endsWith('px') ? Math.round(parseFloat(v) * 10) / 10 : v);
  const inChrome = (e) => !!e.closest('#side-panel,.mmenu-wrapper,.joinchat,.goog-te-banner-frame,#goog-gt-tt');
  const tallies = { color: {}, bg: {}, font: {}, type: {}, radius: {}, shadow: {}, border: {} };
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || inChrome(e) || ['SCRIPT', 'STYLE', 'svg', 'path', 'IMG', 'IFRAME'].includes(e.tagName)) continue;
    const cs = getComputedStyle(e);
    const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      bump(tallies.color, cs.color);
      bump(tallies.font, cs.fontFamily.split(',')[0].replace(/["']/g, '').trim());
      bump(tallies.type, [cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), px(cs.fontSize), cs.fontWeight, px(cs.lineHeight), cs.letterSpacing === 'normal' ? 'normal' : px(cs.letterSpacing), cs.textTransform, cs.fontStyle].join('|'));
    }
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bump(tallies.bg, cs.backgroundColor);
    if (cs.borderRadius !== '0px') bump(tallies.radius, cs.borderRadius);
    if (cs.boxShadow !== 'none') bump(tallies.shadow, cs.boxShadow);
    if (cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none') bump(tallies.border, `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`);
  }
  const pick = (sel, props) => { const e = [...document.querySelectorAll(sel)].find((x) => vis(x) && !inChrome(x)); if (!e) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); const o = { selector: sel, text: (e.textContent || '').trim().slice(0, 40), width: Math.round(r.width), height: Math.round(r.height) }; for (const p of props) o[p] = cs[p]; return o; };
  const T = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'color', 'marginTop', 'marginBottom', 'textAlign'];
  const B = ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'color', 'backgroundColor', 'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderRadius', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'boxShadow', 'transition'];
  const samples = {
    body: pick('body', [...T, 'backgroundColor']), h1: pick('h1', T), h2: pick('h2', T), h3: pick('h3', T), h4: pick('h4', T), h5: pick('h5', T), h6: pick('h6', T),
    p: pick('main p, .elementor p, article p, p', T), a_body: pick('.elementor a:not(.elementor-button), article a, main a', [...T, 'textDecorationLine']),
    button: pick('a.octf-btn-dark, .elementor-button, button[type=submit]', B), button_alt: pick('a.octf-btn:not(.octf-btn-dark)', B),
    header: pick('#site-header, header', ['backgroundColor', 'position', 'paddingTop', 'paddingBottom', 'boxShadow', 'borderBottom']), nav_link: pick('#site-header nav a, .main-menu a, header nav a', T),
    footer: pick('#site-footer, footer', ['backgroundColor', 'color', 'paddingTop', 'paddingBottom', 'fontSize']), footer_link: pick('#site-footer a, footer a', T),
    input: pick('input[type=text], input[type=email], textarea, input[type=search]', ['fontFamily', 'fontSize', 'color', 'backgroundColor', 'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderRadius', 'paddingTop', 'paddingLeft', 'height']),
    card: pick('.post-box, article', ['backgroundColor', 'borderRadius', 'boxShadow', 'paddingTop', 'paddingLeft']),
  };
  const layout = { viewport: [innerWidth, innerHeight], doc_width: document.documentElement.scrollWidth };
  for (const sel of ['.elementor-section.elementor-section-boxed > .elementor-container', '.container', '.site-content', '#site-header .container, #site-header > div']) { const e = [...document.querySelectorAll(sel)].find(vis); if (e) layout[sel] = { width: Math.round(e.getBoundingClientRect().width), maxWidth: getComputedStyle(e).maxWidth, paddingLeft: getComputedStyle(e).paddingLeft }; }
  // CSS custom properties declared on :root / kit class (same-origin sheets only)
  const vars = {};
  for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } for (const r of rules) if (r.selectorText && /^(:root|\.elementor-kit-\d+|body)$/.test(r.selectorText.trim())) for (const p of r.style) if (p.startsWith('--')) vars[p] = r.style.getPropertyValue(p).trim(); }
  const faces = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/["']/g, '')}|${f.weight}|${f.style}`);
  return { tallies, samples, layout, vars, faces: [...new Set(faces)] };
};

const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
const results = [];
for (const t of templates) {
  for (const [dev, w, h] of [['desktop', 1440, 900], ...(MOBILE.has(t.template) ? [['mobile', 390, 844]] : [])]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: UA, locale: 'zh-HK', isMobile: dev === 'mobile', deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'load', timeout: 90000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); } scrollTo(0, 0); });
      await page.waitForTimeout(1200);
      results.push({ template: t.template, url: t.url, device: dev, ...(await page.evaluate(SAMPLE)) });
      console.log('ok', t.template, dev);
    } catch (e) { console.log('FAILED', t.template, dev, e.message.slice(0, 100)); }
    await ctx.close(); await sleep(1500);
  }
}
await browser.close();

// ---- breakpoints from downloaded CSS (offline) ----
const bp = {};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(path.join(LEGACY, 'assets', 'css')).filter((x) => x.endsWith('.css'))) {
  const css = fs.readFileSync(f, 'utf8');
  for (const m of css.matchAll(/@media[^{]*?\((min|max)-width:\s*(\d+(?:\.\d+)?)px\)/g)) { const k = `${m[1]}-width:${m[2]}px`; bp[k] = (bp[k] || 0) + 1; }
}
const out = { generated: new Date().toISOString(), pages: results, breakpoints: bp };
fs.writeFileSync(path.join(LEGACY, 'assets', 'design-tokens.json'), JSON.stringify(out, null, 1));

// ---- summary markdown ----
const hex = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return c; const [r, g, b, a] = m[1].split(',').map((x) => parseFloat(x)); const h = (n) => Math.round(n).toString(16).padStart(2, '0'); return `#${h(r)}${h(g)}${h(b)}${a !== undefined && a < 1 ? ` (α${a})` : ''}`; };
const agg = (key, dev = 'desktop') => { const t = {}; for (const r of results.filter((x) => x.device === dev)) for (const [k, n] of Object.entries(r.tallies[key])) t[k] = (t[k] || 0) + n; return Object.entries(t).sort((a, b) => b[1] - a[1]); };
const md = ['# Design tokens (computed from the live site)', '', `Measured ${new Date().toISOString().slice(0, 10)} from ${results.filter((r) => r.device === 'desktop').length} template pages at 1440 px and ${results.filter((r) => r.device === 'mobile').length} at 390 px. Raw data: \`legacy/assets/design-tokens.json\`; the real stylesheets, fonts and theme images are in \`legacy/assets/{css,fonts,images}\` (manifest.csv). Counts = number of text/box elements using the value, summed across the template pages (sitewide chrome such as the side panel excluded). Use as reference for the Astro rebuild — Theratio is a purchased theme: check its licence before copying files.`, ''];
const tbl = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const colorRows = (key) => { const m = {}; for (const [c, n] of agg(key)) { const h = hex(c); m[h] = (m[h] || 0) + n; } return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([c, n]) => [`\`${c}\``, n]); };
md.push('## Text colours', '', tbl(['Colour', 'Uses'], colorRows('color')), '', '## Background colours', '', tbl(['Colour', 'Uses'], colorRows('bg')), '', '## Fonts (first family of computed font-family)', '', tbl(['Family', 'Uses'], agg('font').slice(0, 8).map(([f, n]) => [f, n])), '');
const faces = [...new Set(results.flatMap((r) => r.faces))].sort();
md.push(`Font faces actually loaded: ${faces.map((f) => '`' + f + '`').join(', ')}.`, '', '## Type scale — family | size px | weight | line-height | letter-spacing | transform | style', '', tbl(['Combination', 'Uses'], agg('type').slice(0, 24).map(([k, n]) => [k.replace(/\|/g, ' · '), n])), '');
const home = results.find((r) => r.template === 'home' && r.device === 'desktop'), homeM = results.find((r) => r.template === 'home' && r.device === 'mobile');
const first = (name, dev) => results.find((r) => r.device === dev && r.samples[name])?.samples[name];
const sRow = (name) => { const d = first(name, 'desktop'), m = first(name, 'mobile'); if (!d) return null; return [name, `${d.fontFamily?.split(',')[0].replace(/["']/g, '')}`, `${d.fontSize} / ${d.lineHeight}`, d.fontWeight, hex(d.color), m ? `${m.fontSize} / ${m.lineHeight}` : '—']; };
md.push('## Element samples (first template page where the element exists; mobile = 390 px)', '', tbl(['Element', 'Family', 'Desktop size / line-height', 'Weight', 'Colour', 'Mobile size / line-height'], ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a_body', 'nav_link', 'footer_link'].map(sRow).filter(Boolean)), '');
for (const k of ['button', 'button_alt']) { const b = first(k, 'desktop'); if (b) md.push(`### ${k === 'button' ? 'Primary button (a.octf-btn.octf-btn-dark)' : 'Secondary button (a.octf-btn)'}`, '', '```json', JSON.stringify(Object.fromEntries(Object.entries(b).filter(([x]) => !['selector', 'text'].includes(x))), null, 1), '```', ''); }
for (const k of ['header', 'footer', 'input', 'card']) if (home?.samples[k]) md.push(`### ${k}`, '', '```json', JSON.stringify(home.samples[k], null, 1), '```', '');
md.push('## Radii, shadows, borders (most used)', '', tbl(['Radius', 'Uses'], agg('radius').slice(0, 6)), '', tbl(['Box-shadow', 'Uses'], agg('shadow').slice(0, 5).map(([k, n]) => [`\`${k.slice(0, 70)}\``, n])), '', tbl(['Border', 'Uses'], agg('border').slice(0, 6).map(([k, n]) => [`\`${hex(k.replace(/rgba?\([^)]*\)/, (c) => c))}\``, n])), '');
md.push('## Layout widths (home, desktop)', '', '```json', JSON.stringify(home?.layout, null, 1), '```', '', '## CSS custom properties found (Elementor kit / :root)', '', '```', Object.entries(Object.assign({}, ...results.map((r) => r.vars))).map(([k, v]) => `${k}: ${v}`).join('\n') || '(none exposed to same-origin rules)', '```', '', '## Media-query breakpoints used in the stylesheets (count of rules)', '', tbl(['Query', 'Rules'], Object.entries(bp).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([k, n]) => [k, n])), '');
mkdir(path.join(LEGACY, 'reports'));
fs.writeFileSync(path.join(LEGACY, 'reports', 'design-tokens.md'), md.join('\n'));
console.log('written design-tokens.json and reports/design-tokens.md');

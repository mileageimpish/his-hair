#!/usr/bin/env node
/**
 * Checks the built site in dist/ against the HIS-7 deployment rules.
 * Usage: node scripts/verify-build.mjs <production|preview>
 * Run after `pnpm build` with the same SITE_ENV / CF_PAGES_BRANCH.
 */
import fs from 'node:fs';
import path from 'node:path';

const mode = process.argv[2];
if (mode !== 'production' && mode !== 'preview') {
  console.error('usage: verify-build.mjs <production|preview>');
  process.exit(2);
}

const dist = path.resolve('dist');
const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};
const read = (rel) => {
  const file = path.join(dist, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
};
const htmlFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith('.html') ? [p] : [];
  });

// robots.txt
const robots = read('robots.txt');
check(robots !== null, 'robots.txt is missing');
if (robots !== null) {
  const blocksAll = /^Disallow:\s*\/\s*$/m.test(robots);
  if (mode === 'preview') check(blocksAll, 'preview robots.txt must contain "Disallow: /"');
  else check(!blocksAll, 'production robots.txt must not contain "Disallow: /"');
}

// _headers noindexes every pages.dev hostname
const headers = read('_headers');
check(headers !== null, '_headers is missing');
if (headers !== null) {
  for (const host of ['https://:project.pages.dev/*', 'https://:version.:project.pages.dev/*']) {
    const re = new RegExp(`^${host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n\\s+X-Robots-Tag:\\s*noindex`, 'm');
    check(re.test(headers), `_headers must set X-Robots-Tag: noindex on ${host}`);
  }
}

// /_parity/ is preview-only
const parity = fs.existsSync(path.join(dist, '_parity', 'index.html'));
if (mode === 'preview') check(parity, '/_parity/ must be built on previews');
else check(!parity, '/_parity/ must not be built in production');

// Every page: <html lang>, no client JS, robots meta only on previews
const pages = htmlFiles(dist);
check(pages.length > 0, 'no HTML pages built');
for (const file of pages) {
  const rel = path.relative(dist, file);
  const html = fs.readFileSync(file, 'utf8');
  check(/<html[^>]*\slang="[^"]+"/.test(html), `${rel}: <html> has no lang attribute`);
  check(!/<script\b/i.test(html), `${rel}: ships a <script> (no client JS without a feature that needs it)`);
  const noindexMeta = /<meta name="robots" content="noindex/.test(html);
  if (mode === 'preview') check(noindexMeta, `${rel}: preview page lacks robots noindex meta`);
  else check(!noindexMeta, `${rel}: production page has robots noindex meta`);
}

if (failures.length) {
  console.error(`verify-build (${mode}): ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`verify-build (${mode}): OK, ${pages.length} page(s) checked`);

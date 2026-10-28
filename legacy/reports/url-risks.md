# URL risks for the migration (and v1-safe handling)

Source: `legacy/urls.csv` (837 distinct URLs found), `url-variants.csv`, `probes.csv`, `seo.csv`. Crawled 2026-10-26 against https://www.hishairclinic.hk (site was still being edited that day: newest post dated 2026-10-26).
v1 rule (CLAUDE.md): same URLs, no structure changes without a Linear decision. "Handling" below is the v1-safe default; anything that changes a URL needs a decision-log entry.

## At a glance

| Group | Count | Status today | Must keep? |
|---|---:|---|---|
| Pages (`/slug/`) | 21 (20 in sitemap + `/404-2/`) | 200 | yes, except `/404-2/` (decision) |
| Posts, date-based (`/YYYY/MM/DD/slug/`) | 72 | 200 | yes, exact |
| Portfolio items (`/portfolio/slug/`, CPT `ot_portfolio`) | 27 | 200 | yes, exact |
| Archives: `/portfolio/`, `/portfolio-category/見證專訪/`, `/category/news/`, `/author/admin2122his/` (+ `/page/N/` variants: 34) | 4 + 34 | 200 | decision (see 4, 5) |
| Tag archives (`/tag/<x>/`, 9) and `/category/uncategorized/` | 10 | 200, `noindex`, "Nothing Found" | no (soft 404s) |
| Feeds (`/feed/`, `/comments/feed/`, per-post, per-archive) | 79 | 200 RSS | decision (see 6) |
| Shortlinks `/?p=<id>` | 131 | 301 → pretty URL | see 3 |
| Uploads referenced by pages | 2,291 URLs checked | all 200 | keep serving (see 9) |
| REST / oEmbed endpoints | 92 + 232 | 200 | no |

Cloudflare Pages `_redirects` limit is 2,100 rules (2,000 static + 100 dynamic). **The 837 URLs fit even if every one were a rule**; the realistic v1 list is ≈ 50–150 rules (see "Redirects needed"). The only thing that would blow the limit is mapping uploads one-by-one (2,291+ URLs) — serve them as files instead (risk 9).

## Risks, ranked

### 1. Percent-encoded Chinese slugs — must match byte for byte (HIGH)
- 194 URLs contain percent-encoding. WordPress/Rank Math emit **lower-case hex** (`%e8%b3%87%e8%a8%8a`) in links, canonical tags, sitemap and `Link` headers (181 URLs lower; 13 were first found with upper-case hex in links). Canonical tag string == served URL string for every page (0 mismatches).
- The live site returns the **same page (same `<title>`) for all three forms**: lower-hex, UPPER-hex and raw UTF-8 (`/資訊/`): 120/122 checked URLs 200 directly; the 2 exceptions are `/…/page/1/` which 301 to the base. It never redirects between hex cases.
- Longest path segment is 100 bytes (decoded), longest encoded path 211 chars — no filesystem/URL length problem (limit 255 bytes per segment).
- **Handling:** emit/canonicalise **lower-case hex** everywhere (canonical, sitemap, hreflang, internal links, `_redirects`). Build output folders with the decoded Chinese names and confirm on the Cloudflare preview that lower-hex, UPPER-hex and raw-UTF-8 requests all return 200 (the harness `scripts/crawl/verify-parity.mjs` tests exactly this; it passes on the live site today). Cloudflare Pages `_redirects` rules with non-ASCII sources must be tested on the preview before relying on them.
- Slugs are **truncated mid-title** by WordPress (e.g. `/2026/10/12/香港紋髮（smp）療程規劃：髮線、色調、密度與合/`). Never regenerate slugs from titles — store the existing slug verbatim in Sanity (as `slug.current`, decoded) and add a validation that forbids edits after publish.
- Full-width punctuation is part of real slugs (`？ ！ （ ） ｜ 『 』 「 」 ，`) and one contains the ASCII `-` plus digits (`…掌握smp-改善禿頭的最佳方法！4`). Test these specifically.

### 2. Date-based post permalinks (HIGH)
- All 72 posts live at `/YYYY/MM/DD/<slug>/`. The date is part of the URL, so **the publish date in Sanity must equal the legacy URL date** (the date shown in the URL, in HK time; check posts published near midnight). A post's `?p=` shortlink and `/feed/` child URLs hang off the same path.
- **Handling:** Astro route `[year]/[month]/[day]/[slug]`; store `publishedAt` (legacy date, immutable) and `slug`; generate the URL from them. Do not let ChatGPT/Sanity edits change either field after launch (validation + read-only after publish).

### 3. Query-string URLs `/?p=<id>` and others (MEDIUM)
- `/?p=<id>` → 301 → pretty URL for all 131 known IDs (one extra: `/?p=6` → `?elementor_library=default-kit` → `/`, a 2-hop chain to an Elementor-internal post; harmless). `/?feed=rss2` → `/feed/`. `/?s=test` (site search) returns 200. `/?lang=en`, `/?lang=zh-hans` return 200 and **ignore** the parameter. `/?attachment_id=1`, other tiny IDs → 404. Facebook `?fbclid=` URLs (4 found in old post bodies) are redirected with the query preserved.
- **Cloudflare Pages `_redirects` cannot match query strings**, so `/?p=<id>` cannot be done there.
- **Handling (v1-safe):** the `?p=` shortlinks are advertised in `<link rel="shortlink">` of each page, so some external references may exist. Options, in order of preference: (a) a small Pages Function / Redirect Rule (Cloudflare Rules, not `_redirects`) mapping the 131 IDs → pretty URLs using a generated JSON table; (b) drop them and accept 404 (needs an explicit decision). Search (`?s=`): no search in a static site — decide whether to drop (the form is on 106 pages). Unknown query strings must still serve the page (static hosting ignores them: good).

### 4. Pagination and archive URLs (MEDIUM)
- `/資訊/page/2…8/` (blog index = a *page* with a loop), `/category/news/page/2…8/`, `/portfolio/page/2…5/`, `/portfolio-category/見證專訪/page/2…5/`, `/page/2/` (a **duplicate of the homepage**, 200, canonical → `/`), `/author/admin2122his/page/2…8/`. 23 of these are indexable but **not in the sitemap**; `/…/page/1/` 301s to the base.
- Page size and number of pages change as posts are added, so these URLs are unstable by nature.
- **Handling:** keep `/資訊/` and `/portfolio/` (+ `/portfolio-category/見證專訪/`) with the same `page/N/` scheme and page size (so existing URLs stay 200), 301 `…/page/1/` → base, drop `/page/2/` (301 → `/`), and treat `/category/news/…` and the author archive per risk 5. Add `rel=prev/next`-free self-canonicals as today.

### 5. Author archive, user enumeration, leftover template content (MEDIUM)
- `/author/admin2122his/` (+8 pages) is public (`noindex`), and the author name `Admin2122HIS` is published in JSON-LD (`Person`, `twitter:data1`) on every page. `/wp-json/wp/v2/users` is public (200). `/author/` → 301 `/`.
- Theme-demo leftovers: 9 tag archives (`architecture, art, building, exterior, furniture, house, interior, livingroom, trends`) returning **200 "Nothing Found" + `noindex`** (soft 404s), `/category/uncategorized/` (200, noindex, no canonical), a published page `/404-2/` (200, noindex, not in sitemap), and the theme is "for Interior Design & Architecture companies".
- **Handling:** do not carry these into the build. Recommend 404 (or 410) for tags, `uncategorized`, `/404-2/`, and 301 `/author/admin2122his/` → `/` (or `/about-us/`); all need a decision-log entry because they are legacy 200s. Remove the author name from structured data.

### 6. Feeds (MEDIUM–LOW)
- 79 feed URLs return 200 `application/rss+xml`: `/feed/`, `/comments/feed/`, one per post (`/YYYY/MM/DD/slug/feed/`, 72), and a few per archive. The site-wide `<link rel="alternate">` points at `/feed/` and `/comments/feed/`.
- **Handling:** v1: generate `/feed/` (full blog RSS, Astro RSS) at the same URL; `/comments/feed/` → 301 `/feed/` (comments are not used); per-post feeds → 301 to the post (72 static rules) or let them 404 — owner decision. `/?feed=rss2` is covered by the Function in risk 3.

### 7. Trailing-slash, case and host variants (MEDIUM)
Observed on the live site (`url-variants.csv`):
- `http://hishairclinic.hk/…` and `https://hishairclinic.hk/…` → **one** 301 → `https://www.hishairclinic.hk/…` (good; path preserved).
- **`http://www.hishairclinic.hk/<any sub-page>` serves 200 over plain HTTP with no redirect** (only the homepage redirects). Duplicate content over HTTP today; Cloudflare "Always Use HTTPS" will fix it (a behaviour *change*, safe).
- No-slash → 301 to slash for every WordPress URL tested (247 redirects). Exceptions: `/smp-assessment` returns **200 without redirect** (duplicate of `/smp-assessment/`) and `/wp-json` (200); the 13 other no-slash probes were non-existent paths (404). Cloudflare Pages normalises slashes with its own redirect (expected **308**, not 301 — verify on the preview; the harness accepts 301/308).
- Upper-case ASCII (`/ABOUT-US/`) returns **200** (case-insensitive match, no redirect, canonical tag points to lower case). Cloudflare Pages is case-sensitive: `/ABOUT-US/` will 404. Low value; decide whether to add redirects (only if Search Console shows such URLs).
- `/home/` → 301 `/`; `/index.php` → 301 `/`; `/blog/` (and `/blog`) → 301 `/資訊/` — **this one is a rule in the Redirection plugin** (`x-redirect-by: redirection`). Only these were discoverable; the plugin's other rules require an admin export (open question).
- **Handling:** put these in `_redirects`; keep trailing slashes (`trailingSlash: 'always'`); canonical host = `https://www.`.

### 8. Sitemap vs reality (LOW)
- Rank Math sitemap index → 5 sitemaps, 122 URLs (72 posts, 27 portfolio items + the `/portfolio/` archive, 20 pages, 1 category, 1 portfolio_cat), **all 200, indexable, self-canonical**; `lastmod` present. `/sitemap.xml` and `/wp-sitemap.xml` 301 → `/sitemap_index.xml`. Sitemap files are sent with `X-Robots-Tag: noindex` (normal for Rank Math).
- Indexable but not in sitemap: the 23 pagination URLs above, plus `/portfolio/` is in neither the sitemap nor flagged (200, indexable). `/404-2/` and `/category/uncategorized/` are noindex and excluded (consistent).
- **Orphan:** `/斑禿治療/` is in the sitemap but **no page links to it** (the only such URL; crawl depth 0–4 for all others). Keep the URL; ask the owner whether it should be linked from the SMP 治療 menu.
- `/smp-assessment/` is indexable but has **no canonical tag, no JSON-LD**, and is not in the main nav (reached from CTAs).
- **Handling:** new sitemap at the same path `/sitemap_index.xml` (+ 301 from `/sitemap.xml`, `/wp-sitemap.xml`) so Search Console's submitted URL keeps working.

### 9. Uploads / media URLs (MEDIUM)
- Library: 614 attachments reported by the API (only 566 returned; 48 are filtered out of the response), 105.6 MB of originals (downloaded to `legacy/uploads/`, git-ignored). Pages reference 2,291 distinct `/wp-content/uploads/…` URLs including resized variants (`-300x200.jpg`, `-scaled.jpg`) and Elementor CSS; **all return 200** (HEAD checked, `media.csv`). `/favicon.ico` → 302 → a JPG in uploads.
- **Handling:** keep **serving the same `/wp-content/uploads/**` paths as static files** (originals + the variants actually referenced) in v1 so old image links, social cards and Google Images URLs keep working; do not create one redirect per image (that would exceed Cloudflare's 2,100-rule limit). Put a real 200 `/favicon.ico` in place. Sanity/CDN image delivery can come in v2 with a wildcard redirect.

### 10. Attachment pages, WP internals, endpoints (LOW)
- No attachment pages found (`?attachment_id=1` → 404). `/xmlrpc.php` → 405, `/wp-login.php` → 200, `/wp-admin/` → 302 login, `/readme.html` and `/license.txt` → 200 (reveal the WordPress version), `/wp-json/` → 200 with `X-Robots-Tag: noindex`, `/robots.txt` 200, `/.well-known/*`, `/ads.txt`, `/llms.txt`, `/humans.txt` → 404, `/en/` and every language path (`/zh-cn/`, `/zh-hk/`, `/tc/`, `/sc/`…) → **404**.
- **Handling:** none of these are carried over. `/wp-admin`, `/wp-login.php`, `/xmlrpc.php`, REST and oEmbed URLs will 404 after cutover (fine, but see "Admin links" in open-questions). Keep `robots.txt` content equivalent plus the sitemap line.

### 11. The `/smp-assessment/` page is a JavaScript app (MEDIUM)
- 200 page (English-only shell + inline JS with `en`/`zh` copy), no `content.rendered` in REST (empty), answers sent to `/wp-json/his-smp/v1/track` (custom plugin). The no-slash URL also answers 200 (no canonical redirect).
- **Handling:** v1 must reproduce the page and quiz client-side from the saved inline script (kept in `legacy/html/source/smp-assessment-*.html`); the `track` endpoint needs a replacement (or removal by decision). The copy inside the script is covered in `content-flags.md` §7.

### 12. Soft-404 / error behaviour (LOW)
- Real 404s return **404** (`/404-test-does-not-exist/`; the 404 template is a themed page). The only soft-404-like pages are the tag/category leftovers (risk 5). Keep a proper `404.astro` that returns 404.

### 13. Language and locale signals (LOW for URLs, relevant for SEO tags)
- No `hreflang` anywhere; `<html lang="zh-TW">`, `og:locale zh_TW`, JSON-LD `inLanguage zh-TW`. CLAUDE.md wants `zh-Hant-HK`. Changing `lang` is a visible tag change, not a URL change — flagged, to be decided.

## Redirects needed in v1 (to put in `_redirects` / Redirect Rules)

| Rule | Count |
|---|---:|
| `/blog/` (+ no-slash) → `/資訊/` | 1–2 |
| `/home/`, `/index.php`, `/author/`, `/page/2/` → `/` | 4 |
| `/…/page/1/` → base (5 archives) | 5 |
| `/sitemap.xml`, `/wp-sitemap.xml` → `/sitemap_index.xml` | 2 |
| `/comments/feed/` → `/feed/` | 1 |
| per-post feeds → post (optional, decision) | 72 |
| tag/category/author leftovers → 404/410 or `/` (decision) | ≈ 12 |
| `/?p=<id>` shortlinks (Function / Redirect Rules, not `_redirects`) | 131 |
| Redirection-plugin rules not yet seen | unknown (export needed) |
| **Total static `_redirects` rules** | **≈ 25–130** — far below 2,100 |

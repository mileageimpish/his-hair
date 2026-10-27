# Legacy-site crawl (hishairclinic.hk)

Read-only audit tooling for the WordPress site. Only `GET`/`HEAD` requests are made; nothing is submitted, logged into, or changed.
Politeness: UA `HIS-Rebuild-Audit/1.0`, ≤2 concurrent requests, ≥500 ms between request starts (Playwright page loads run one page at a time, ≥1.5 s apart), back-off on 429/503.
All output goes to `legacy/`. Every HTTP response is cached in `legacy/cache/http/`, and each snapshotted page is cached in `legacy/cache/extract/`, so every script is re-runnable and resumable (delete a cache file to refetch it; pass `--force` to `02-snapshot.mjs` to recapture).

Run from the repo root. In a proxied sandbox prefix `NODE_USE_ENV_PROXY=1` (not needed on a normal machine).

| Order | Script | What it does | Network |
|---|---|---|---|
| 1 | `01-discover.mjs` | Sitemaps, REST API (saved to `legacy/wp-json/`), link crawl, standard-path probes, host/slash/case variants → `legacy/urls.csv`, `probes.csv`, `url-variants.csv`, `seo/` | yes |
| 2 | `02-snapshot.mjs [--limit N] [--only text] [--force] [--headed]` | Playwright/Chromium per 200 HTML page: raw + rendered HTML, desktop (1440) and mobile (390) full-page screenshots, visible text, JSON-LD, plus a JSON extract (network log, cookies, forms, floating UI, …) → `legacy/html`, `screenshots`, `text`, `schema`, `page-map.csv` | yes |
| 2b | `01-discover.mjs` again | Re-run after step 2 so links that only exist after JS are included (`legacy/cache/rendered-links.json`) | cached + new |
| 3 | `03-build-seo.mjs` | `legacy/seo.csv`, `images.csv`, `reports/mixed-language-pages.md` | no |
| 4 | `04-media.mjs [--download]` | `legacy/media.csv`; HEAD-checks originals and resized variants; downloads to `legacy/uploads/` only with `--download` and only if the library is < 500 MB | yes |
| 5 | `05-tech-tracking.mjs` | `reports/tech-and-tracking.md`, `forms.csv`, `contact-points.csv`, `third-party.csv` | a few HEADs |
| 6 | `06-content-flags.mjs` | `reports/content-flags.md` (prices, superlatives, medical wording, testimonials, awards, NAP) | no |
| 7 | `07-assets.mjs` | Downloads the CSS, fonts and theme images the pages load (from the saved network logs, plus `url()` references) → `legacy/assets/` | yes |
| 8 | `08-design-tokens.mjs` | Computed colours, fonts, type scale, buttons, widths, breakpoints from the 19 template pages → `legacy/assets/design-tokens.json`, `reports/design-tokens.md` | yes |
| – | `verify-parity.mjs [--base URL]` | For every legacy URL (encoded, decoded-UTF-8 and upper-hex forms) checks the target returns 200, or a single 301 to the expected target. Writes `reports/parity-failures.csv`; exits non-zero on failures. Default base: `$PARITY_BASE` or the live site. | yes |

Dependencies: Node ≥ 22 and Playwright (resolved from the global install; no `package.json` dependency added). Everything else uses Node built-ins.

`legacy/cache/` is git-ignored (re-creatable, large).

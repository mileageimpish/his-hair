# Legacy site audit — summary

Crawled **2026-10-26** from https://www.hishairclinic.hk (WordPress). Read-only: GET/HEAD only, UA `HIS-Rebuild-Audit/1.0`, ≤2 concurrent requests, ≥500 ms spacing; no blocking or bot detection was met, so no headed-browser fallback was needed (Chromium headless was used for rendering). Nothing was submitted, logged into or modified. Scripts: `scripts/crawl/` (re-runnable, cached). Detail reports sit next to this file.

## Counts

| Item | Count |
|---|---:|
| Distinct URLs found (sitemap + REST + link crawl + probes) | **837** (122 in the sitemap) |
| HTML pages snapshotted (200, rendered + source + text + 2 screenshots each) | 165 |
| Pages (WP `page`) | 21 (20 in sitemap + `/404-2/`) |
| Posts (all at `/YYYY/MM/DD/slug/`) | 72 |
| Portfolio items (CPT `ot_portfolio`, `/portfolio/slug/`) | 27 (+ the `/portfolio/` archive page; the sitemap lists 28 URLs) |
| Taxonomy archives | categories 2 (`news`, `uncategorized`), portfolio category 1, tags 9 (theme-demo leftovers) |
| Pagination URLs (`/…/page/N/`) | 34 |
| Media library | 614 reported / 566 returned by API; 105.6 MB originals (downloaded, git-ignored); 2,291 referenced upload URLs, **all 200** |
| Languages | 1 real language: zh-HK (declared `zh-TW`). No `/en/`, no `/zh-cn/`. |
| Forms | 1 contact form (CF7), 1 newsletter form (Mailchimp for WP), core search form |
| JSON-LD | pages/portfolio/archives yes (Rank Math graph); **posts (72): none** |

## Site map overview

```
/                       home (Elementor page + Slider Revolution hero)
/about-us/              /smp-assessment/ (English JS quiz, own en/zh toggle)
SMP 治療: /男士專用脫髮療程/ /什麼是smp？/ /植髮與疤痕/ /脫髮療程/ /比較smp與其他療程/
常見問題: /外觀/ /smp基本須知/ /中國人髮質與脫髮/
案例相集: /頭部治療/ /密度治療/ /疤痕治療/          報導及專訪: /傳媒報導/ /見證專訪/
/顧客體驗/ (testimonials)   /聯絡我們/ (CF7 + Google Map)
/斑禿治療/ — in the sitemap but **linked from nowhere** (the only orphan; depth ∅)
/資訊/ (blog index, 8 pages) → 72 posts  /YYYY/MM/DD/slug/   (category /category/news/)
/portfolio/ (4 pages) → 27 items /portfolio/slug/   /portfolio-category/見證專訪/ (5 pages)
leftovers: /404-2/, /tag/* (9), /category/uncategorized/, /author/admin2122his/ (8 pages)
```

## Answers to the open questions

**Is it built with Elementor? What does REST return for `content.rendered`?**
Yes — Elementor **3.8.0** (Oct 2022) on WordPress **6.1** with the purchased theme **Theratio 1.1.3.2** (OceanThemes, "Interior Design & Architecture"; no child theme), whose custom Elementor widgets (`ilogo`, `imenu`, `iheading`, `ibeforeafter`, `itestimonials`, `ipost_carousel`, …) build the header/footer/side-panel and most blocks; **Slider Revolution 6.6.5** drives the home hero. `data-elementor-type` is on 164/165 pages. REST `content.rendered` is **usable text** for 91 of 93 pages/posts (Elementor-rendered HTML with readable text; layout/widget settings are not in it). The two empty ones: `/smp-assessment/` (JS app) and `/資訊/` (the blog index — the theme template renders the post loop). Portfolio items are not in REST at all. `_elementor_data` is not public → needs the WXR/DB. See `tech-and-tracking.md` §1.

**Analytics/tracking tags; do they fire before consent?**
**None installed**: no GA4, Universal Analytics, GTM, Google Ads, Meta Pixel, Hotjar or Clarity (searched in source, rendered DOM and the network log of all 165 pages; no `dataLayer`/`gtag`/`fbq` globals). There is **no consent banner**. What loads with no consent: Google Fonts, the Google Translate widget (GTranslate), and a **YouTube embed (`www.youtube.com`) that sets 4 third-party cookies** (`YSC`, `VISITOR_INFO1_LIVE`, `__Secure-YNID`, `__Secure-ROLLOUT_TOKEN`) plus `doubleclick.net` requests (made by the embed). Zero first-party cookies; `localStorage` key `joinchat_views`. Maps API/iframe only on `/聯絡我們/`. (`tech-and-tracking.md` §2–3)

**Floating WhatsApp/call button? Numbers and prefilled messages?**
Yes — **Joinchat** plugin (`creame-whatsapp-me` 4.5.11) on 164/165 pages: green round 60×60 px button, `position: fixed`, bottom 20 px / right 20 px (desktop and mobile), tooltip "立即查詢", appears after 3 s, opens `wa.me/85290326957` (= **+852 9032 6957**). **No prefilled message** (`message_send` empty). There is **no floating call button**; the landline **+852 3188 9740** is a `tel:` link in the footer/side-panel/contact page (written two ways: `tel:+852 3188 9740` and `tel:+85231889740`). Email `jonathan@hishairclinic.hk` (mailto) — the quiz uses `jonathan@hishairclinic.com`. The `/smp-assessment/` quiz builds a WhatsApp message in JS: "Hi Jonathan, I completed the SMP assessment." / "Jonathan 你好，我剛完成紋髮（SMP）網上評估。" + the answer summary. 10 old posts contain `wa.me` links with `fbclid` junk. (`tech-and-tracking.md` §4)

**Which forms, and where?**
1. **Contact Form 7** (form 5) — `/聯絡我們/` only: name\*, email\*, message; no CAPTCHA/honeypot; AJAX via `/wp-json/contact-form-7/v1/contact-forms/5/feedback`; recipient/success text unknown (admin). 2. **Mailchimp for WP** `mc4wp-form-1` — footer of 162 pages: EMAIL\* + honeypot `_mc4wp_honeypot`. 3. WordPress core **search** (`?s=`) on 106 pages. 4. Not a site form: Google Translate voting form. Booking = WhatsApp / the `/smp-assessment/` quiz (events POSTed to custom `/wp-json/his-smp/v1/track`). Nothing was submitted. (`forms.csv`)

**English pages? URLs? Language switcher? zh-CN? hreflang?**
There are **no separate English or zh-CN pages**: `/en/`, `/zh-cn/`, `/zh-hk/`, `/tc/`, `/sc/` … all **404**; `?lang=` is ignored. A language switcher **exists but is machine translation**: GTranslate shows "簡 / 繁 / EN" in the header (`doGTranslate('zh-TW|en')` etc., Google Translate in the browser, URLs never change). **No `hreflang` on any page.** `<html lang="zh-TW">`, `og:locale zh_TW`. English-language *content* exists inside the zh site: `/smp-assessment/` (English shell with en/zh toggle), the English post `/2025/11/10/baldness-is-no-longer-a-worry-his-helps-you-change-your-life/` and 7 English-titled portfolio interviews.

**Which pages mix Chinese and English?**
69 of 165 pages have a 4+ word English run inside Chinese copy (`mixed-language-pages.md`); the substantive ones: the seven bilingual "旅程" journey posts of 2026-10-06…26 (English headings/paragraphs under each Chinese section), `/about-us/` and `/顧客體驗/` (English client testimonials), the home page (an English video title + testimonial), 7 portfolio items, `/2025/11/10/baldness-…/`, and the sitewide address block (English only). 10 pages are classed "mixed" overall, 1 "en", 154 "zh". Many zh pages use colloquial Cantonese (嘅 咗 唔) mixed with written Chinese.

**Is the Zhuhai entity mentioned anywhere?**
**No** — 0 of 165 pages mention 珠海 / Zhuhai / 拱北 / 橫琴, and `hishairclinic.com` appears only as the mailto in the quiz script (`content-flags.md` §6).

**JSON-LD? Types? Sensible for a non-medical SMP studio?**
Rank Math emits one `@graph` on 92 pages (pages, portfolio, archives): `HealthAndBeautyBusiness`+`Organization`, `WebSite`, `WebPage`, `Person`, `Article`, `ImageObject`, `CollectionPage`/`ProfilePage`/`SearchAction` on archives. **Posts (72) have none.** Type choice (`HealthAndBeautyBusiness`, not `MedicalClinic`) is appropriate for an SMP studio. Problems: **no address, phone or geo** anywhere in the business entity; opening hours `Mon–Sun 09:00–17:00` unexplained; the **home page is typed `Article`**; a `Person` for username `Admin2122HIS` on every page; `inLanguage zh-TW`; archives marked `ProfilePage`. Raw blocks: `legacy/schema/*.json`.

**noindex, canonicals elsewhere, sitemap/URL mismatches?**
`noindex`: 20 pages — 9 tag archives, `/category/uncategorized/`, `/404-2/`, the author archive + 7 `/page/N/`, and the 404 template (all sensible; the first four are 200 "Nothing Found" soft 404s). Canonical pointing elsewhere: only `/page/2/` → `/` (a duplicate of the home page). 21 pages carry no canonical tag: the 20 `noindex` pages plus **`/smp-assessment/`, which is indexable but has no canonical and no JSON-LD**. Sitemap (122 URLs) vs reality: every sitemap URL is 200/indexable/self-canonical; **23 indexable pagination URLs are not in the sitemap**; sitemap `lastmod` is present. `/sitemap.xml` and `/wp-sitemap.xml` 301 → `/sitemap_index.xml`. Both encodings of Chinese slugs return the same page. (`url-risks.md`)

**Total URLs, and does it fit Cloudflare Pages' 2,100 redirect-rule limit?**
**837 URLs** found (372 are "must-keep" parity targets: pages, posts, portfolio, archives, feeds, shortlinks). Even 1 rule per URL (837) fits under 2,100. Realistic v1 rule count is **≈ 25–130** static rules (see `url-risks.md`). Two caveats: (a) `/?p=<id>` shortlinks (131) can't be matched by `_redirects` (query strings) → Function/Redirect Rule; (b) the 2,291 upload URLs would **not** fit as per-file redirects → serve `/wp-content/uploads/**` as static files.

## Harness

`scripts/crawl/verify-parity.mjs` tested against the live site: see the final line of this section.

**Live-site run (2026-10-26):** 372 legacy URLs → 759 checks (as-found encoded, decoded UTF-8 and upper-case-hex forms) → **759 passed, 0 failed, exit 0**; 1 URL skipped because the legacy URL is itself a 2-hop chain (`/?p=6` → `?elementor_library=default-kit` → `/`, an Elementor-internal post). Negative test against a wrong base path: failures reported, CSV written, exit 1. Usage: `node scripts/crawl/verify-parity.mjs --base https://<preview>.pages.dev` (add `NODE_USE_ENV_PROXY=1` in a proxied sandbox; `--fast` is only honoured for non-live bases). Output: `legacy/reports/parity-failures.csv`.

## What to commit

See `legacy/CRAWL-README.md` (column "Commit?") — text/CSVs/reports yes; HTML and screenshots LFS or external; `uploads/` and `cache/` never.

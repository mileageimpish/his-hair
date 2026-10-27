# Open questions and what we need from the owner

Things the crawl could not determine (everything public is already captured). Grouped by Linear issue.

## HIS-2 — export / content

1. **WXR export + database dump (needed).** Not available from the public site: the 28 portfolio items (`ot_portfolio`, not in REST), Elementor's `_elementor_data` (layout, widget settings, before/after slider settings, Slider Revolution slides), menus, theme options, the Contact Form 7 form definition and mail settings, comments, Rank Math per-page SEO meta (focus keywords, schema choices), and the 48 attachments the media API hides (614 reported, 566 returned). Please run Tools → Export → All content, plus an **All-in-One WP Migration** export (that plugin is installed) and tell us where it is stored (CLAUDE.md "TO BE FILLED IN").
2. **Is the media library complete?** We downloaded the 566 files the API returns (107 MB, `legacy/uploads/`, git-ignored) and verified 2,291 referenced upload URLs return 200. The 48 hidden attachments may be unattached or private; confirm whether any are needed.
3. **Theme + child-theme files and plugin list from the server.** Theme is `theratio` 1.1.3.2 (a purchased "Interior Design & Architecture" theme by OceanThemes) with no child theme — all customisation either lives in Elementor, "Additional CSS", or edits to the parent theme. A zip of `wp-content/themes/theratio` and the Customizer "Additional CSS" are needed for exact v1 colours/fonts.
4. **The custom `his-smp/v1` plugin/code** (REST namespace). It receives quiz events at `/wp-json/his-smp/v1/track` and probably serves the assessment page/shortcode. Who wrote it, where is its source, and what happens to the tracked events (stored? emailed?).
5. **Language setup (HIS-2 bullet).** No multilingual plugin (no WPML/Polylang/TranslatePress namespace). The "簡 / 繁 / EN" links are the **GTranslate** plugin = browser-side Google Translate (URL never changes, no crawlable English/zh-CN pages). Confirm that is all there is.

## HIS-3 — redirects, metadata, Search Console, GBP

6. **Redirection-plugin rules.** Only `/blog/` → `/資訊/` is observable (`x-redirect-by: redirection`). Export all rules from Tools → Redirection → Import/Export (JSON/CSV), and any `.htaccess` rules. Without it we cannot guarantee every historic redirect is preserved.
7. **Search Console access (optional, cheap)** — Performance → Pages export (clicks/impressions) and Links → top linked pages, only to rank which URLs matter for redirects. Also to check whether Google has indexed unexpected URLs (upper-case slugs, `?p=` shortlinks, `/page/N/`, HTTP versions).
8. **Google Business Profile details** for `siteSettings`: legal/trading name, address, phone(s), hours, categories. Live site conflicts (see `content-flags.md` §6):
   - Names: `HIS (香港著色紋髮中心)` (og:site_name, JSON-LD, contact page H2) vs `HIS 香港紋髮 SMP 中心` (titles) vs `HIS 香港著色紋髮中心` (blog posts) vs `HIS Hair Clinic` / `His Hair Clinic` (5 posts) vs `HIS SMP`.
   - Phones: landline `+852 3188 9740` (tel link, footer, side panel) and WhatsApp mobile `+852 9032 6957` (`wa.me/85290326957`, Joinchat). The `tel:` link is written two ways (`+852 3188 9740` with spaces, `+85231889740`).
   - Email: `jonathan@hishairclinic.hk` everywhere, **but the assessment quiz uses `jonathan@hishairclinic.com`**.
   - Address: `Hollywood Plaza, Room 1513A/ 15th floor, 610 Nathan Road, Mong Kok, Kowloon, Hong Kong` (English only, even on Chinese pages; the Google Map embed on 聯絡我們 searches the Chinese form).
   - Hours: JSON-LD claims **Monday–Sunday 09:00–17:00**, but no hours appear in the page text. Is that right?
   - JSON-LD has **no address, phone or geo** at all.
9. **Zhuhai entity and UK parent (hishairclinic.com).** Neither appears anywhere in page content (0 of 165 pages mention 珠海/Zhuhai/拱北/橫琴; `hishairclinic.com` appears only as the quiz's mailto). One post is titled "探索英國his：頭髮護理的專業領航者" (2026/02/06) and posts mention "UK trained since 2009". Does the Zhuhai entity exist, should it appear, and is `.com` still in use?
10. **Titles/descriptions.** Titles end with ` - HIS 香港紋髮 SMP 中心` (Rank Math template). 41 of 165 crawled pages have no meta description (all are archive/tag/pagination, plus 1 post and 1 page; see `seo.csv`). Duplicate titles exist between `/` and `/page/2/`, and between archive pages and their `/page/N/`. Decide whether to keep v1 text as-is (parity) or fix in v2.

## HIS-4 — URLs and templates

11. **Decisions needed on legacy URLs** (see `url-risks.md`): tag archives / `uncategorized` / `/404-2/` (soft 404s), author archive and username `admin2122his`, per-post feeds, `?p=` shortlinks, site search `?s=`, case-insensitive URLs, `/smp-assessment` no-slash.
12. **Content freeze.** The site changed during this audit (7 new bilingual "journey" posts dated 2026-10-06…10-26; `home` modified 2026-10-19). Tell us when content freezes for migration, or we re-run `scripts/crawl/` before cutover (it is resumable/cached; delete `legacy/cache/http` to refetch).
13. **Googlebot view.** The server sends `Vary: User-Agent`; this audit used the honest UA `HIS-Rebuild-Audit/1.0` and did not spoof others. If a cache/security plugin serves different HTML to Googlebot, only Search Console's URL Inspection (live test) would show it.
14. **Templates identified (for screenshots / v1 build):** home; page (Elementor page); service-like pages; blog index `/資訊/` and archives; post (dated); portfolio archive, portfolio category, portfolio item; contact (CF7 + Google Map); about; assessment (JS app); 404; author/tag leftovers. All 165 HTML pages have desktop + mobile screenshots (`legacy/screenshots/`, `legacy/page-map.csv`).

## HIS-5 — forms, tracking, integrations

15. **Contact Form 7 (only form on the site, `/聯絡我們/`)**: recipient address(es), mail template, success/error text, any anti-spam (Akismet/reCAPTCHA keys are not visible; no CAPTCHA or honeypot field found). Needs WP-admin or the WXR.
16. **Mailchimp for WP newsletter form (footer of 162 pages)**: which Mailchimp audience/account, who owns it, confirmation (double opt-in?) text, privacy wording (none shown on the form). Is the newsletter still used?
17. **Booking:** there is no booking tool. "Free assessment" CTAs go to `/smp-assessment/` (quiz) and WhatsApp. Confirm that is the intended funnel and whether the quiz's WhatsApp message (`Hi Jonathan, I completed the SMP assessment.` + summary) must be kept verbatim.
18. **Analytics:** none installed (no GA4/UA/GTM/Meta Pixel/Google Ads/Hotjar/Clarity). Confirm that is intended, or whether tags live in a service we cannot see (e.g. a server-side setup, Search Console only). If analytics is wanted, that is a *new* feature (v2) and needs a consent decision.
19. **Cookies/consent:** YouTube embeds set 4 third-party cookies on page load (162 of 165 pages carry the same YouTube video in the page chrome) and there is no consent banner or privacy/cookie policy page. Decision needed: keep parity, or switch to `youtube-nocookie.com` / click-to-play in v1 (a visible behaviour change).
20. **Social/video accounts:** Facebook `hishairclinichk`, Instagram `his_hair_clinic_hk`, YouTube channel `UCAZKEKkrGbaqj3ZJwRq33gg`; many of the 28 portfolio items are YouTube client testimonials (list of video IDs in `tech-and-tracking.md`). Confirm the channel is owned by the clinic.

## Compliance / content review (for owner and lawyer)

21. `content-flags.md` lists every price-related wording (no figures found anywhere; "一口價", "報價" and "免費" only), superlatives (153 sentences, e.g. 首位香港SMP專家, 專家), medical-sounding wording (治療, 療程, 診所, clinic, treatment…, 413 page/term pairs), 28 client testimonial/video pages and the before/after imagery, and credentials ("2009年起全職從業", "英國受訓", "UK trained since 2009"). **None of the 28 portfolio (client video testimonial) items has a "results vary"-style sentence on its own page**; 76 of the 105 posts/pages listed in table 4a do contain one (e.g. 實際效果因人而異) — mostly in newer copy. Please confirm consent for client names/photos/videos, the basis for "首位" and "UK trained", and whether wording like 治療/診所 is acceptable for a non-medical SMP studio.
22. **Machine translation:** the EN/簡 switch machine-translates the whole site in the visitor's browser. CLAUDE.md forbids machine-translated published content. Keep the widget for parity, or remove it and plan real `/en/` and `/zh-cn/` documents (v2)?
23. **Mixed-language pages** (69 flagged; the strongest are the seven 2026-10 "journey" posts, the English-only post `/2025/11/10/baldness-is-no-longer-a-worry-…/`, `/about-us/`, `/顧客體驗/`, the English-titled portfolio items and the `/smp-assessment/` page): confirm for each whether it stays as-is in v1 (parity) or moves to the English locale.

## Housekeeping

24. **Security of the old site until cutover:** WordPress 6.1 (Nov 2022), Elementor 3.8.0 (Oct 2022), Slider Revolution 6.6.5, CF7 5.6.4, Mailchimp for WP 4.8.11, public `/wp-json/wp/v2/users`, public `readme.html`, `xmlrpc.php` present (405), a public `wp-login.php`, an author slug that looks like a login (`admin2122his`), no security headers, HTTP sub-pages not redirected. Not touched by this audit; the owner may want a hosting-side fix before the new site is live.
25. **Google Maps API key** present in the contact page's embed (a browser key, redacted in the report). Restrict it by referrer in Google Cloud before the old site goes away or it will keep being billed/abused.

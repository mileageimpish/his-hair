# WordPress export received 2026-10-28 — what is in it, what is still missing

Files (raw copies are on branch `legacy-assets` under `wp-export/`, Git LFS; they contain the author's email and two trackback IPs, so they are **not** on the working branches):

| File | Contents |
|---|---|
| `hissmp.WordPress.2026-10-28.xml` (3.4 MB) | WXR 1.2, "All content": 788 items |
| `elementor-kit.zip` (100 KB) | Elementor 3.8.0 Kit export |
| `redirection-2026-10-29.json` (53 KB) | Redirection plugin 5.3.5 export: 56 rules |
| `additional-css.txt` (1 KB) | Customizer → Additional CSS |
| `www-hishairclinic-hk-20261029-….wpress` (32 MB) | All-in-One WP Migration, **themes + languages only** (no database, no plugins, no media) |
| `theme-theratio.tar.gz` (6 MB) | Derived by us from the `.wpress`: the full `themes/theratio` folder (95 PHP files, templates, JS, CSS, fonts) |

## WXR (788 items)

72 posts · 21 pages (+1 draft, +2 trashed: `sample-page`, `coming-soon`) · **27 portfolio items** (`ot_portfolio`; matches the 27 live `/portfolio/<slug>/` URLs exactly) · 614 attachments (the **full media list**, including the 48 the REST API hid) · 29 menu items · 7 Elementor library items · 5 header builders + 2 footer builders (theme CPTs `ot_header_builders` / `ot_footer_builders`) · 5 Contact Form 7 forms · 1 Mailchimp-for-WP form · 1 `custom_css` · 1 `wp_global_styles` · 1 author · 2 comments (trackbacks).
- `_elementor_data` (the real Elementor layout JSON) is present on 59 items.
- Rank Math meta is present per item (`rank_math_focus_keyword` on 90, SEO score, primary category …).
- Not in WXR: Slider Revolution sliders (own tables), Redirection rules (own tables — supplied separately), Rank Math global settings, plugin settings.

## Redirection plugin (56 rules)

All `301`, URL → URL, no regex, no query strings, groups "Redirections" and "Modified Posts". They are **old Joomla-era URLs** (`/about-me.html`, `/index.php/smp/…`, `/smp/2019-09-27-….html`, `/news/…`) plus 15 "Modified Posts" rules (an old dated post URL → the current dated URL, e.g. `/2023/12/21/均衡飲食防脫髮/` → `/2023/12/05/均衡飲食防脫髮/`) and `/blog/` → `/資訊/`. Tested against the live site on 2026-10-29: **all 56 answer 301 and end at a 200**. These must be carried into `_redirects`; they are in `legacy/redirection-rules.csv` (with the live result per rule). They raise the realistic v1 static rule count from the earlier estimate to about 80–190 — still far below Cloudflare's 2,100.

## Contact Form 7 (forms in WXR)

- **Form 5 "Main Form"** (the one on `/聯絡我們/`): fields your-name\*, your-email\*, your-message; mail **recipient `jonathan@hishairclinic.com`** (not the `.hk` address shown on the site); subject starts "HIS …"; success text "Thank you for your message. It has been sent." (English default, shown on a Chinese page). `_mail_2` (autoresponder) settings are in the WXR.
- Four more forms ("Contact form 1" ×2, "Member Form", "Coming Soon Form") are **theme-demo leftovers** (recipients at `oceanthemes.net` or the site admin address) and are not on any public page.
- Mailchimp-for-WP form markup is in the WXR (one form).

## Elementor Kit

Contains: `site-settings.json` (global colours and typography, theme-style buttons / images / form fields, layout, lightbox, page transitions, custom CSS), 19 Elementor pages as JSON (`content/page/*.json`: every published page except `/資訊/` (blog index) and `/smp-assessment/`, which are not Elementor pages — they have no `_elementor_data`), taxonomies, and `wp-content/*.xml` for posts, pages, menu items, portfolio items and the header/footer builders. `templates/` is empty.
**It does not contain plugin exports.** The `plugins` list in its manifest is only the names and versions of 12 active plugins — it has no Slider Revolution sliders, Redirection rules, Contact Form 7 forms, Rank Math settings or Mailchimp settings. (Those came from the separate Redirection export and from the WXR, which carries CF7 and Mailchimp forms.) The manifest list is also incomplete: Rank Math, Redirection and Slider Revolution are active on the live site but are not listed.
Plugins named in the manifest: Elementor 3.8.0, All-in-One WP Migration 7.111, **CMP – Coming Soon & Maintenance 4.1.4**, Contact Form 7 5.6.4, **Easy Updates Manager 9.0.14** (explains why nothing is updated), GTranslate 2.9.14, **HIS SMP Hair Loss Assessment 1.1.0** (the custom quiz plugin), Joinchat 4.5.11, Kirki 4.0.24, MC4WP 4.8.11, Meta Box 5.6.7, One Click Import Demo Content 1.0 (theme demo importer).

## Still missing

1. **Slider Revolution export** for the home hero (Slider Revolution → Slider Overview → Export).
2. **Source of the custom plugin `wp-content/plugins/his-smp-assessment/`** (the `/smp-assessment/` quiz and the `his-smp/v1/track` endpoint). Zip that folder via the hosting file manager or All-in-One WP Migration (plugins only).
3. **Rank Math** settings export (Status & Tools → Import & Export) and a screenshot of Titles & Meta → Local SEO (address / phone / hours used in JSON-LD).
4. Screenshots: Settings → Permalinks, Settings → Joinchat, GTranslate settings; Tools → Site Health → Info text.
5. The **404 log** from Tools → Redirection (optional) to see which old URLs are still requested.
6. Not WordPress, still open: Search Console export, Google Business Profile details.

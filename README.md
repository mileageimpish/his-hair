# legacy-assets (orphan branch, Git LFS)

Large artefacts from the 2026-10-26 crawl of hishairclinic.hk (see `legacy/CRAWL-README.md` on the main branch). Not part of the site; never merge into the working branches.

| File | Restore to | Notes |
|---|---|---|
| `screenshots/*.jpg` | `legacy/screenshots/` | Desktop 1440 / mobile 390 full-page, **JPEG q85** (originals were PNG; WebP can't hold the 23,000 px mobile captures). Names match `legacy/page-map.csv` with `.jpg` instead of `.png`. |
| `html-source.tar.gz` | `legacy/html/` (`tar -xzf`) | Raw HTML as served. Contains a public Google Maps browser key. |
| `html-rendered.tar.gz` | `legacy/html/` | DOM after JS. |
| `uploads.tar` | `legacy/` (`tar -xf`) | Media library originals, 566 files (the API hides 48 more). Paths mirror `wp-content/uploads/`. |

Fetch: `git lfs pull` after checking out this branch (or `git clone --branch legacy-assets`).
| `assets-css-fonts.tar.gz` | `legacy/` (`tar -xzf`) | The site's real public stylesheets (80 CSS: theme, Elementor generated, plugins), fonts (Google Fonts TTFs, Font Awesome, Flaticon, eicons) and 27 theme images, as served on 2026-10-27. Theratio is a purchased theme: reference only, check its licence before reusing files. Manifest + design tokens are on the main branch (`legacy/assets/manifest.csv`, `design-tokens.json`). |

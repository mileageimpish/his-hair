# HIS Hair Clinic — website

Rebuild of https://www.hishairclinic.hk/ (currently WordPress) as a fast, SEO- and AI-first site that a non-technical owner can update through ChatGPT.

## Where things live

- **Tasks, brief, decisions:** Linear, team HIS, project "HIS Website Rebuild". Read the linked issue before starting work and update it when done. Do not copy Linear docs into this repo; link to them.
- **Rules for working in this repo:** this file.
- **Content model and SEO conventions:** `/docs`.
- **SEO standard:** Linear document 'SEO strategy'. Link to it, don't copy it.
- **Legacy reference:** `/legacy` holds text exports and references from the old WordPress site (WXR export, theme files, URL list, SEO data, screenshots). It is read-only reference material; never edit it. The media library and any database dump are NOT in git (they are large, and a dump may contain personal data). They are stored at: TO BE FILLED IN.

## Stack

- **Astro** with static output. Ship no client-side JavaScript unless a feature needs it.
- **Sanity** for content. Studio lives in `/studio`; schemas are the contract with the owner's ChatGPT editing.
- **Cloudflare Pages** for hosting. A Sanity publish webhook triggers a rebuild.
- TypeScript strict, pnpm.
- Commands: _fill in after scaffolding_ (dev, build, lint, test, check-redirects).

## Phases — read before every task

1. **v1 = parity.** Match the existing site's design, content and URLs as closely as possible. Do not redesign, rewrite copy or "improve" content. If something on the old site looks wrong, flag it on the Linear issue instead of fixing it.
2. **v2 = new design system.** Only after v1 has launched.

## Languages

- `zh-HK` is the default at `/`. English is at `/en/`. `zh-CN` is reserved at `/zh-cn/` and is not built in v1.
- Each language is a **separate set of documents** (document-level i18n), not translated fields. A locale may have pages the others don't.
- Never mix languages on a page. UI strings come from per-locale files.
- Never machine-translate content into published fields.
- Every page sets `<html lang>`, a canonical URL, and hreflang links (including `x-default`) to its counterparts.
- hreflang codes are zh-Hant-HK, en-HK and x-default (zh-HK).

## Content model rules (built for ChatGPT editing)

- Every schema type and field has a plain-language `description`. ChatGPT reads these through the Sanity connector to know what to write, so treat them as user documentation.
- Required SEO fields (title, meta description, slug, image alt text) are enforced with validation.
- Keep structures simple and flat. Use Portable Text for body copy.
- No content is hard-coded in components.
- Business name, address, phone and opening hours come from one `siteSettings` document only.
- **Medical claims:** use client-approved text only. Never generate treatment claims, outcomes, statistics or prices.

## Definition of done for any page or template

- Title, meta description and OG image come from the CMS. The canonical tag and hreflang links are present.
- JSON-LD: `MedicalClinic` / `LocalBusiness` site-wide, plus the page-type schema (`Service`, `FAQPage`, `Article`, `BreadcrumbList`) as relevant.
- One `h1`, semantic HTML, and alt text on every image.
- Included in the sitemap. llms.txt is optional and not required (see the SEO strategy doc in Linear).
- Its legacy URL returns 200 or a 301. Redirects are stored as Sanity `redirect` documents and generated into `_redirects`.
- Mobile Lighthouse scores are 95 or above for Performance, SEO and Accessibility.
- In v1, it is visually checked against the legacy screenshot.

## Working conventions

- One branch per Linear issue, using the branch name Linear generates for it (it contains the `HIS-n` key, so the PR links back automatically). Keep PRs small.
- No secrets in git; list required variables in `.env.example`.
- Add a dependency only with a one-line reason in the PR.
- Don't invent content, and don't change the URL structure without a decision recorded in Linear.

# HIS Hair Clinic — website

Rebuild of https://www.hishairclinic.hk/ (currently WordPress) as a fast, SEO- and AI-first site that the non-technical owner can update through ChatGPT.

## Stack

- Astro (static output, TypeScript strict, pnpm)
- Sanity for content, with the Studio in `/studio`
- Cloudflare Pages for hosting

## Getting started

Node 22 and pnpm (version pinned in `package.json`).

```bash
pnpm install
pnpm dev
```

Commands are listed in [`CLAUDE.md`](CLAUDE.md#stack).

## Deployment

Cloudflare Pages builds every push through its Git integration:

- Build command `pnpm build`, output directory `dist`.
- `main` deploys to the project's production `pages.dev` URL. Every other branch and PR gets a preview URL.
- A build is **production** only when `CF_PAGES_BRANCH` equals `PRODUCTION_BRANCH` (default `main`), or when `SITE_ENV=production`. Everything else is a **preview**: `robots.txt` disallows all, every page carries `noindex`, and the preview-only page `/_parity/` is built.
- `public/_headers` sends `X-Robots-Tag: noindex` on every `pages.dev` hostname, including production's, so only the real domain can be indexed after launch.

## Where to look

- [`CLAUDE.md`](CLAUDE.md): rules for working in this repo.
- Linear: team HIS, project "HIS Website Rebuild" (https://linear.app/mileage-impish-6iwb726/project/his-website-rebuild-6903a9a36f63). It holds tasks, the project brief and the decisions log.
- [`docs/`](docs/): content model and SEO conventions.
- [`legacy/`](legacy/): read-only reference material from the old site.

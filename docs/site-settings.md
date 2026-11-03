# `siteSettings` — shape of the business-details document

Status: **proposed shape, for approval**. The values are placeholders copied from the live site (crawl 2026-10-26, see `legacy/reports/content-flags.md` §6) and can be amended in the Studio at any time; the *structure* is what has to be right, because every template, the JSON-LD, the WhatsApp button, the contact form and the footer read from it (CLAUDE.md: business name, address, phone and opening hours come from this one document only).

Rules that apply to every field (CLAUDE.md): a plain-language `description` written for ChatGPT/the owner, validation on required values, nothing hard-coded in components. Strings that differ by language live in `{ 'zh-HK': …, en: … }` sub-objects inside this one singleton. This is the only place where the "separate documents per language" rule is relaxed, because these are configuration values, not page content — flagged for approval.

## Fields

| Group | Field | Type / validation | Used by | Placeholder (live site today) |
|---|---|---|---|---|
| Identity | `tradingName` | per-locale string, required | header, footer, titles, JSON-LD `name` | zh-HK `HIS 香港紋髮 SMP 中心` (titles) — the site currently also uses `HIS (香港著色紋髮中心)` for JSON-LD/og:site_name and `HIS Hair Clinic` in a few posts: pick one |
| | `alternateNames[]` | strings | JSON-LD `alternateName` | `HIS`, `HIS (香港著色紋髮中心)`, `HIS 香港著色紋髮中心` |
| | `logo` | image + per-locale alt (required) | header, JSON-LD | current logo in uploads |
| Contact | `phones[]` | `{ kind: landline \| mobile, e164 (required, `^\+[1-9]\d{7,14}$`), display, label per locale, useFor: call \| whatsapp \| both, isPrimary }` | footer, contact page, `tel:` links, JSON-LD `telephone` | landline `+85231889740` (display `+852 3188 9740`), mobile/WhatsApp `+85290326957` (display `+852 9032 6957`) |
| | `whatsapp` | `{ enabled, phoneRef → phones[], prefilledMessage per locale, floatingButton: { enabled, desktopLabel per locale, showCallButtonOnMobile } }` | floating button, CTAs, quiz result link | draft prefill below |
| | `primaryEmail` | email, required — **the single address used everywhere** (mailto links, contact-form recipient, quiz email link, JSON-LD) | all | `jonathan@hishairclinic.hk` |
| | `additionalEmails[]` | `{ address, label, purpose }`, optional | none by default | — |
| Address | `address` | `{ lines per locale (building, floor/room, street, district), region, country: HK, displayOneLine per locale }` | footer, contact page, JSON-LD `address` | `Hollywood Plaza, Room 1513A/ 15th floor, 610 Nathan Road, Mong Kok, Kowloon, Hong Kong` (English only on the live site; the Chinese form is needed too) |
| | `geo` | `{ lat, lng }` (optional but recommended) | JSON-LD, map | — (not on the live site) |
| | `mapUrl` | URL | "open in Maps" link | Google Maps search for the address |
| Hours | `openingHours[]` | `{ days[] (mon…sun), opens, closes, closed }` + `hoursNote per locale` (e.g. "by appointment") + `specialClosures[] { from, to, note per locale }` | contact page, footer, JSON-LD `openingHoursSpecification` | **unverified:** JSON-LD says Mon–Sun 09:00–17:00; no hours appear in the page text |
| Social | `social[]` | `{ platform: facebook \| instagram \| youtube \| …, url }` | footer, JSON-LD `sameAs` | Facebook `hishairclinichk`, Instagram `his_hair_clinic_hk`, YouTube channel `UCAZKEKkrGbaqj3ZJwRq33gg` |
| Legal | `privacyPolicyPage`, `cookiePolicyPage` | references to pages | footer, form notice | none exist yet |
| SEO | `siteName per locale`, `defaultOgImage` (+alt), `schemaType` | enum: MedicalClinic \| HealthAndBeautyBusiness \| LocalBusiness — **decision needed** (live site uses `HealthAndBeautyBusiness`; CLAUDE.md says MedicalClinic/LocalBusiness) | JSON-LD | — |

Deliberately **not** fields: prices or price range (client-approved text only), years in practice / credentials (claims live in reviewed page copy, not in settings), analytics IDs (none are used).

## WhatsApp button — recommended behaviour (replaces the Joinchat plugin)

- Plain link `https://wa.me/<e164 digits>?text=<url-encoded prefilled message>`; no script, no third-party requests, no cookies. Works on phones and opens WhatsApp Web/Desktop on computers.
- Fixed bottom-right (as today), ≥ 56 px touch target, the standard WhatsApp green, `aria-label` from the per-locale label, hidden from print, respects `prefers-reduced-motion`, keeps clear of the iOS safe area and of any consent/cookie bar.
- Desktop shows a short text label (today: 立即查詢); on phones icon only. Optional second **call** button on phones only, using the landline (`tel:`), because many Hong Kong visitors prefer to phone — switchable in settings.
- The prefilled message is editable copy per locale. Draft for owner approval, based on wording already on the site: zh-HK `你好，我想查詢紋髮（SMP）免費評估。` / en `Hi, I'd like to ask about a free SMP assessment.` Page-aware variant (appends the page title) is possible but off by default.
- Owner-side tip, not code: use the **WhatsApp Business** app for this number (greeting and away messages, quick replies, labels).

## Open points on this shape

1. One singleton with per-locale sub-objects, or one `siteSettings` document per locale? (Recommended: one singleton, as above.)
2. Which trading name is the canonical one (the site uses at least four)?
3. Opening hours, and whether to publish them at all.
4. `schemaType` (see SEO strategy in Linear).

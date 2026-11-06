/**
 * Site locales. Each locale is a separate set of documents (CLAUDE.md).
 * zh-HK is the default and lives at /. English is reserved at /en/ and is not
 * built in v1. zh-CN (/zh-cn/) is out of scope and deliberately not listed.
 */
export const defaultLocale = 'zh-hk';

export const locales = {
  'zh-hk': {
    /** URL prefix, without slashes. Empty for the default locale. */
    pathPrefix: '',
    /** Value for <html lang>. */
    htmlLang: 'zh-Hant-HK',
    /** Value for hreflang links. */
    hreflang: 'zh-Hant-HK',
    /** Whether pages in this locale are built in v1. */
    built: true,
  },
  en: {
    pathPrefix: 'en',
    htmlLang: 'en-HK',
    hreflang: 'en-HK',
    built: false,
  },
} as const;

export type Locale = keyof typeof locales;
export const localeCodes = Object.keys(locales) as Locale[];

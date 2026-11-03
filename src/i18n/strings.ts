/**
 * UI strings, one file per locale (CLAUDE.md: UI strings come from per-locale
 * files). Page content does not belong here; it comes from the content layer.
 */
import type { Locale } from './locales';
import zhHk from './strings/zh-hk.json';

type Strings = typeof zhHk;
export type StringKey = keyof Strings;

const strings: Partial<Record<Locale, Strings>> = {
  'zh-hk': zhHk,
};

export function t(locale: Locale, key: StringKey): string {
  const table = strings[locale];
  if (!table) throw new Error(`No UI strings for locale "${locale}"`);
  return table[key];
}

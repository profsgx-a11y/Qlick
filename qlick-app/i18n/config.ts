import "server-only";
import elDict from "./dictionaries/el.json";
import enDict from "./dictionaries/en.json";

export const locales = ["el", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "el";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

const dictionaries = {
  el: elDict,
  en: enDict,
} as const;

export type Dictionary = typeof elDict;

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale];
}

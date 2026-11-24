import ru from './ru.json';
import en from './en.json';

export type Locale = 'ru' | 'en';
type Dict = typeof ru;
export type I18nKey = keyof Dict;

const DICTS: Record<Locale, Dict> = { ru, en };
const STORAGE_KEY = 'lumivore_lang_v1';

let currentLocale: Locale = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ru') return saved;
  } catch {}
  return 'ru';
})();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(lang: Locale): void {
  currentLocale = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

export function t(key: I18nKey): string {
  return DICTS[currentLocale][key] ?? DICTS.ru[key] ?? key;
}

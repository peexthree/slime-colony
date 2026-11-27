// Проверка паритета ключей локализации: src/i18n/ru.json <-> src/i18n/en.json
// Рекурсивно собирает плоские наборы ключей (dot-notation, вложенные объекты),
// печатает отличия и завершается с кодом 1 при расхождении.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const FILES = {
  ru: join(ROOT, 'src', 'i18n', 'ru.json'),
  en: join(ROOT, 'src', 'i18n', 'en.json'),
};

/**
 * Рекурсивно собирает плоский набор ключей вида "a.b.c".
 * Объекты раскрываются, остальные значения (включая массивы) считаются листьями.
 * @param {object} obj - исходный JSON-объект
 * @param {string} [prefix] - префикс пути ключей
 * @returns {Set<string>} набор ключей
 */
function collectKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const nested of collectKeys(value, fullKey)) {
        keys.add(nested);
      }
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

/** @param {string} path */
function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`[check-i18n-parity] Не удалось прочитать ${path}: ${err.message}`);
    process.exit(1);
  }
}

const ruKeys = collectKeys(loadJson(FILES.ru));
const enKeys = collectKeys(loadJson(FILES.en));

const missingInEn = [...ruKeys].filter((k) => !enKeys.has(k)).sort();
const missingInRu = [...enKeys].filter((k) => !ruKeys.has(k)).sort();

console.log(`[check-i18n-parity] ru.json: ${ruKeys.size} ключей, en.json: ${enKeys.size} ключей`);

if (missingInEn.length === 0 && missingInRu.length === 0) {
  console.log('[check-i18n-parity] OK - наборы ключей ru/en полностью совпадают');
  process.exit(0);
}

let hasDiff = false;
if (missingInEn.length > 0) {
  hasDiff = true;
  console.error(`[check-i18n-parity] Ключи, отсутствующие в en.json (${missingInEn.length}):`);
  for (const k of missingInEn) console.error(`  - ${k}`);
}
if (missingInRu.length > 0) {
  hasDiff = true;
  console.error(`[check-i18n-parity] Ключи, отсутствующие в ru.json (${missingInRu.length}):`);
  for (const k of missingInRu) console.error(`  - ${k}`);
}

console.error('[check-i18n-parity] FAIL - наборы ключей локализации расходятся');
process.exit(hasDiff ? 1 : 0);

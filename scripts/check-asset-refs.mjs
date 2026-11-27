// Проверка ссылок на ассеты: сканирует src/**/*.ts и index.html на упоминания
// файлов из public/ (assets/... и корневые файлы вида ./sw.js, /manifest.json).
// Битые пути -> exit 1; неразрешимые динамические шаблоны -> warning.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');

/** Расширения файлов, которые считаем ссылками на ассеты */
const ASSET_EXTENSIONS = new Set([
  'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'avif',
  'json', 'mp3', 'ogg', 'wav', 'm4a', 'webm',
  'woff', 'woff2', 'ttf', 'otf', 'html',
]);

/** Рекурсивно собирает все файлы в каталоге */
/** @param {string} dir @param {string} [base] @returns {string[]} */
function listFiles(dir, base = dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listFiles(full, base));
    } else {
      out.push(relative(base, full).split(sep).join('/'));
    }
  }
  return out;
}

/** Рекурсивно собирает файлы по расширению */
/** @param {string} dir @param {string[]} exts @returns {string[]} */
function listSourceFiles(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listSourceFiles(full, exts));
    } else if (exts.some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

/** Извлекает содержимое строковых литералов из исходника (кавычки и бэктики) */
/** @param {string} text @returns {string[]} */
function extractStringLiterals(text) {
  const literals = [];
  const re = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    literals.push(m[2]);
  }
  return literals;
}

/**
 * Убирает import/export statements - их литералы это пути модулей,
 * а не ссылки на ассеты из public/
 * @param {string} text
 * @returns {string}
 */
function stripModuleImports(text) {
  return text
    .replace(/import\s[^;{]*?from\s*['"`][^'"`]*['"`]/g, '') // статические import
    .replace(/import\s*\(\s*['"`][^'"`]*['"`]\s*\)/g, '') // динамические import()
    .replace(/export\s[^;{]*?from\s*['"`][^'"`]*['"`]/g, ''); // re-export
}

/** Достаёт из литерала пути на файлы с ассетными расширениями */
/** @param {string} literal @returns {string[]} */
function extractAssetPaths(literal) {
  const paths = [];
  const re = /[\w\-./]+\.(svg|png|jpe?g|gif|webp|ico|avif|json|mp3|ogg|wav|m4a|webm|woff2?|ttf|otf|html)/gi;
  let m;
  while ((m = re.exec(literal)) !== null) {
    paths.push(m[0]);
  }
  return paths;
}

/** Является ли путь шаблоном динамической сборки (неразрешимым статически) */
/** @param {string} literal */
function isDynamicTemplate(literal) {
  return /\$\{|\?\.|\*\?|\[[\w-]+\]/.test(literal) || literal.includes('*');
}

/** Нормализует путь: убирает ведущие ./, / и query-хвосты */
/** @param {string} p @returns {string} */
function normalizePath(p) {
  return p.replace(/\?.*$/, '').replace(/^\.\//, '').replace(/^\//, '');
}

const publicFiles = listFiles(PUBLIC_DIR);
const publicSet = new Set(publicFiles);
const publicBasenames = new Set(publicFiles.map((f) => f.split('/').pop()));

const sources = [
  ...listSourceFiles(join(ROOT, 'src'), ['.ts']),
  join(ROOT, 'index.html'),
];

/** @type {{ file: string, path: string, ok: boolean }[]} */
const checked = [];
/** @type {{ file: string, path: string, reason: string }[]} */
const warnings = [];
/** @type {{ file: string, path: string }[]} */
const broken = [];

for (const file of sources) {
  const relFile = relative(ROOT, file).split(sep).join('/');
  const text = stripModuleImports(readFileSync(file, 'utf8'));
  for (const literal of extractStringLiterals(text)) {
    // Ссылки на URL (http/https/data) не проверяем
    if (/^\s*(https?:|data:|blob:)/.test(literal)) continue;
    for (const rawPath of extractAssetPaths(literal)) {
      if (isDynamicTemplate(literal)) {
        warnings.push({ file: relFile, path: rawPath, reason: 'динамическая сборка пути - не резолвится статически' });
        continue;
      }
      const norm = normalizePath(rawPath);
      // Кандидаты размещения в public/
      const candidates = [norm];
      // Ссылка вида "assets/xxx" указывает на public/assets/xxx (Vite отдаёт public/ в корень)
      if (!norm.startsWith('assets/')) candidates.push(`assets/${norm}`);

      let found = null;
      for (const c of candidates) {
        if (publicSet.has(c)) {
          found = c;
          break;
        }
      }
      // Фоллбэк по basename: "./sw.js" или "/manifest.json" лежат в корне public/
      if (!found) {
        const base = norm.split('/').pop();
        const looksLikeRootRef = /^\.{0,2}\//.test(rawPath) || norm === base;
        if (looksLikeRootRef && publicBasenames.has(base)) {
          const match = publicFiles.find((f) => f.split('/').pop() === base);
          if (match) found = match;
        }
      }

      if (found) {
        checked.push({ file: relFile, path: rawPath, ok: true });
      } else if (norm.startsWith('assets/') || publicBasenames.has(norm.split('/').pop())) {
        // Уверены, что это ссылка на public-ассет, но файла нет -> битый путь
        broken.push({ file: relFile, path: rawPath });
      } else {
        // Не уверены в принадлежности к public - предупреждение
        warnings.push({ file: relFile, path: rawPath, reason: 'файл не найден в public/ - возможно, это не ассет' });
      }
    }
  }
}

console.log(`[check-asset-refs] Файлов в public/: ${publicSet.size}`);
console.log(`[check-asset-refs] Проверено корректных ссылок: ${checked.length}`);
for (const w of warnings) {
  console.warn(`[check-asset-refs] WARNING: ${w.file} -> "${w.path}" (${w.reason})`);
}
for (const b of broken) {
  console.error(`[check-asset-refs] FAIL: ${b.file} -> "${b.path}" (файл отсутствует в public/)`);
}

if (broken.length > 0) {
  console.error(`[check-asset-refs] FAIL - битых ссылок: ${broken.length}`);
  process.exit(1);
}
console.log('[check-asset-refs] OK - битых ссылок на ассеты не найдено');
process.exit(0);

// CLI-харнесс балансировки LUMIVORE: headless-прогоны боёв без браузера
// для замера винрейтов 4 веток ДНК и 6 гибридов.
// Вся логика живёт в src/game/headlessHarness.ts - этот файл только парсит
// аргументы, печатает таблицу и пишет JSON-отчёт.
//
// Запуск:
//   npm run sim -- --branch all --hybrid none --minutes 8 --runs 10 --seed 12345
//   npm run sim -- --branch vermis --runs 20
//   npm run sim -- --hybrid all --minutes 6 --runs 8
//   npm run sim -- --branch chimera --report out/chimera.json
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HYBRIDS } from '../src/engine/types';
import { runHeadless, type HeadlessOptions } from '../src/game/headlessHarness';

interface CliArgs {
  branch: HeadlessOptions['branch'];
  hybrid: HeadlessOptions['hybrid'];
  minutes: number;
  runs: number;
  seed: number;
  report: string | null;
}

const BRANCHES = ['vermis', 'chimera', 'mycelium', 'symbiont', 'all', 'neutral'] as const;
const HYBRID_IDS = HYBRIDS.map((h) => h.id);

function usage(): never {
  console.log(
    'Использование: npm run sim -- [--branch vermis|chimera|mycelium|symbiont|all|neutral]\n' +
    '               [--hybrid <id>|all|none] [--minutes N] [--runs N] [--seed N] [--report путь.json]\n' +
    'Гибриды: ' + HYBRID_IDS.join(', ')
  );
  process.exit(1);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    branch: 'all',
    hybrid: null,
    minutes: 8,
    runs: 10,
    seed: 12345,
    report: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === '--branch') {
      if (!val || !BRANCHES.includes(val as CliArgs['branch'])) usage();
      args.branch = val as HeadlessOptions['branch'];
      i++;
    } else if (key === '--hybrid') {
      if (!val) usage();
      if (val === 'none' || val === 'null') args.hybrid = null;
      else if (val === 'all') args.hybrid = 'all';
      else if (!HYBRID_IDS.includes(val as never)) usage();
      else args.hybrid = val as HeadlessOptions['hybrid'];
      i++;
    } else if (key === '--minutes') {
      const n = Number(val);
      if (!val || !Number.isFinite(n) || n <= 0) usage();
      args.minutes = n;
      i++;
    } else if (key === '--runs') {
      const n = Number(val);
      if (!val || !Number.isInteger(n) || n <= 0) usage();
      args.runs = n;
      i++;
    } else if (key === '--seed') {
      const n = Number(val);
      if (!val || !Number.isInteger(n)) usage();
      args.seed = n;
      i++;
    } else if (key === '--report') {
      if (!val) usage();
      args.report = val;
      i++;
    } else {
      usage();
    }
  }
  return args;
}

function fmt(v: number, digits = 1): string {
  return v.toFixed(digits);
}

function pct(v: number): string {
  return `${fmt(v * 100, 0)}%`;
}

function printTable(aggregates: ReturnType<typeof runHeadless>['aggregates'], minutes: number): void {
  console.log('');
  console.log(`LUMIVORE headless-симуляция: окно ${fmt(minutes, 1)} мин, winrate = доля прогонов, доживших до конца окна`);
  console.log('');
  const header =
    'сборка'.padEnd(22) +
    'runs'.padStart(6) +
    'winrate'.padStart(9) +
    'medianSurv'.padStart(12) +
    'meanSurv'.padStart(10) +
    'kills'.padStart(8) +
    'maxScale'.padStart(10) +
    'bossTTK'.padStart(9) +
    'meanDPS'.padStart(9) +
    'meanTail'.padStart(9);
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const a of aggregates) {
    const row =
      a.label.padEnd(22) +
      String(a.runs).padStart(6) +
      pct(a.winrate).padStart(9) +
      `${fmt(a.medianSurvivalSec, 0)}s`.padStart(12) +
      `${fmt(a.meanSurvivalSec, 0)}s`.padStart(10) +
      fmt(a.meanKills, 0).padStart(8) +
      String(a.maxScale).padStart(10) +
      (a.meanBossTtkSec > 0 ? `${fmt(a.meanBossTtkSec, 1)}s` : '-').padStart(9) +
      fmt(a.meanDps, 0).padStart(9) +
      fmt(a.meanTailLen, 1).padStart(9);
    console.log(row);
  }
  console.log('');
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `Запуск: branch=${args.branch} hybrid=${args.hybrid ?? 'none'} minutes=${args.minutes} runs=${args.runs} seed=${args.seed}`
  );
  const startedAt = Date.now();
  const { results, aggregates } = runHeadless({
    branch: args.branch,
    hybrid: args.hybrid,
    minutes: args.minutes,
    runs: args.runs,
    seed: args.seed,
  });
  const wallSec = (Date.now() - startedAt) / 1000;

  // Проверка целостности метрик: NaN/Infinity в отчёте недопустимы
  const badRuns = results.filter((r) => !r.metricsFinite);
  if (badRuns.length > 0) {
    console.error(`ВНИМАНИЕ: ${badRuns.length} прогон(ов) с нечисловыми метриками (NaN/Infinity):`);
    for (const r of badRuns) {
      console.error(`  run#${r.runIndex} ${r.branch} survival=${r.survivalSec} kills=${r.kills} dmg=${r.dmgTotal}`);
    }
    process.exitCode = 2;
  }

  printTable(aggregates, args.minutes);

  const report = {
    generatedAt: new Date().toISOString(),
    config: {
      branch: args.branch,
      hybrid: args.hybrid ?? 'none',
      minutes: args.minutes,
      runs: args.runs,
      seed: args.seed,
      winRule: 'winrate = доля прогонов, доживших до конца окна',
      notes: [
        'Моки: overlay/sim/sfx/radar/gamepad/joystick no-op, physarum readback = 0 (trailOwn/trailEnemy false).',
        'Биолаб/кодекс/ачивки: чистая база без мета-прогрессии; localStorage в памяти процесса.',
        'Старт ветки: инъекция ДНК 1-го уровня (как дневное испытание); гибрид: оба родителя на 3-м уровне и гибрид применен на старте через applyHybrid (без ожидания карточки).',
        'Прокачка: настоящая механика chooseUpgrade с фиксированным приоритетом арсенала ветки.',
        'DPS-профиль: хвост/кольцо/оружия по счётчикам RunState; детализации по типам оружий в state нет.',
        'TTK боссов: только убитые боссы/титаны; выжившие в конец окна не учитываются.',
        'ИИ: кайт от угроз, сбор душ, рывок в упор; решения 8 раз в секунду.',
      ],
    },
    aggregates,
    runs: results.map((r) => ({
      branch: r.branch,
      hybrid: r.hybrid,
      runIndex: r.runIndex,
      seed: r.seed,
      survivalSec: Math.round(r.survivalSec * 100) / 100,
      win: r.win,
      endedBy: r.endedBy,
      kills: r.kills,
      level: r.level,
      scaleMaxReached: r.scaleMaxReached,
      deathCause: r.deathCauseKind ? `${r.deathCauseKind} (${r.deathCauseLabel ?? ''})` : null,
      bossesKilled: r.bossesKilled,
      avgBossTtkSec: Math.round(r.avgBossTtkSec * 100) / 100,
      dps: { total: Math.round(r.dmgTotal), tail: Math.round(r.dmgTail), ring: Math.round(r.dmgRing), weapons: Math.round(r.dmgWeapons), avg: Math.round(r.avgDps), peak10: Math.round(r.peakDps10) },
      tail: { avg: Math.round(r.tailLenAvg * 10) / 10, max: Math.round(r.tailLenMax) },
      maxEnemiesAlive: r.maxEnemiesAlive,
      finalGenome: r.finalGenome,
      finalWlvl: r.finalWlvl,
      finalGenes: r.finalGenes,
    })),
  };

  // Защита от path traversal: писать можно только внутри scripts/out/ проекта.
  // Путь вне корня проекта (или выход за scripts/out по ..) клампится с предупреждением.
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const allowedRoot = path.join(projectRoot, 'scripts', 'out');
  const requested = path.resolve(args.report ?? path.join('scripts', 'out', `sim-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
  let absReportPath = requested;
  if (!(requested === allowedRoot || requested.startsWith(allowedRoot + path.sep))) {
    const safeName = path.basename(requested).replace(/[^\w.-]+/g, '_') || 'report.json';
    absReportPath = path.join(allowedRoot, safeName);
    console.warn(`ПРЕДУПРЕЖДЕНИЕ: путь отчёта "${args.report}" вне ${path.relative(projectRoot, allowedRoot)} - отчёт записан в ${path.relative(projectRoot, absReportPath)}`);
  }
  fs.mkdirSync(path.dirname(absReportPath), { recursive: true });
  fs.writeFileSync(absReportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Готово за ${fmt(wallSec, 1)} c реального времени. Отчёт: ${absReportPath}`);
}

main();

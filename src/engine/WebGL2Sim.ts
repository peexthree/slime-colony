// WebGL2Sim.ts - фолбэк physarum-симуляции для браузеров без WebGPU
// Архитектура: агенты и след считаются на CPU (30к агентов, базовая сетка следа
// 480x270 клеток - четверть базовой сетки WebGPU, клетка = 2x2 sim px),
// GPU (WebGL2) используется только для отображения поля. Математика
// сенсоров/поворотов/границ/депозита - порт physarum.wgsl; депозит масштабирован
// на 1/4 для паритета средней плотности (порог захвата STRAIN.densityThreshold
// 0.075 остаётся корректным). Размер сетки адаптивный (см. simResolution.ts):
// setResolution() масштабирует sim px и клетку 2x2 сохраняет, поэтому плотность
// и порог захвата инвариантны к ресайзу.
// Поля аттрактора/токсина (b/a в WGSL) для сенсоров штампуются в ячейки,
// а для картинки считаются во фрагментном шейдере аналитически.
import { Beacon, BioNode, MAX_BEACONS, MAX_NODES, SIM_HEIGHT, SIM_WIDTH } from './types';
import type { PhysarumBackend, PhysarumSim, SimNodeStat, SimResolutionProvider } from './physarumSim';
import { roundEvenSim } from './simResolution';

// ------------------------- константы симуляции -------------------------

/** Базовая сетка следа: четверть от 960x540 (половина по каждой оси) */
const BASE_TRAIL_W = 480;
const BASE_TRAIL_H = 270;
/** Sim px на ячейку следа */
const CELL = 2;
/** Базовая популяция CPU-агентов: четверть от AGENT_COUNT WebGPU (120к) */
const AGENT_BASE = 30_000;
/** Минимум активных агентов: ниже следы вымирают (у WebGPU минимум 1024 из 120к) */
const MIN_ACTIVE = 4_000;
/** Дистанция сенсора, sim px (как в WGSL) */
const SENSOR_DIST = 11;
/** Угловое расхождение сенсоров (как в WGSL) */
const SENSOR_SPACING = 0.52;
/** Скорость поворота (как в WGSL) */
const TURN_SPEED = 0.24;
/** Депозит феромона за агент-кадр: 0.015 / 4 - компенсация четверти сетки */
const DEPOSIT = 0.00375;
/** Вытеснение чужого феромона: 0.02 / 4 - та же компенсация */
const DEPLETE = 0.005;
/** Период статистики узлов, мс (как readback в WebGPUSim) */
const STATS_PERIOD_MS = 160;

// ------------------------- таблицы тригонометрии и RNG -------------------------

const TWO_PI = Math.PI * 2;
const TRIG_N = 1024;
const COS_TAB = new Float32Array(TRIG_N);
const SIN_TAB = new Float32Array(TRIG_N);
for (let i = 0; i < TRIG_N; i++) {
  const a = (i / TRIG_N) * TWO_PI;
  COS_TAB[i] = Math.cos(a);
  SIN_TAB[i] = Math.sin(a);
}

/** cos/sin через LUT: агенты не требуют точности double (ошибка ~0.35%) */
function trig(tab: Float32Array, angle: number): number {
  const a = angle - TWO_PI * Math.floor(angle / TWO_PI);
  return tab[(a * (TRIG_N / TWO_PI)) | 0];
}

/** Хеш WGSL physarum.wgsl (uint-математика в int32 с нормализацией) */
function hashU32(s: number): number {
  s = s >>> 0;
  s ^= 2747636419;
  s = Math.imul(s, 2654435769);
  s ^= s >>> 16;
  s = Math.imul(s, 2654435769);
  s ^= s >>> 16;
  s = Math.imul(s, 2654435769);
  return s >>> 0;
}

function rand01(seed: number): number {
  return hashU32(seed) / 4294967295;
}

// ------------------------- встроенные шейдеры (GLSL ES 3.00) -------------------------

const VERT_SRC = `#version 300 es
// Полноэкранный треугольник без атрибутов (gl_VertexID)
void main() {
  float x = (gl_VertexID == 1) ? 3.0 : -1.0;
  float y = (gl_VertexID == 2) ? 3.0 : -1.0;
  gl_Position = vec4(x, y, 0.0, 1.0);
}
`;

// Дисплей physarum-поля: эквивалент fragMain из physarum.wgsl.
// Поля маяков считаются аналитически из униформ (как diffuse в WGSL),
// фон биома упрощён до универсальной конвекции, тонированной палитрой локации.
const FRAG_SRC = `#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uTrail;      // RG32F: r = феромон игрока, g = феромон врага
uniform vec2 uTrailSize;       // базово 480x270, адаптивно через setResolution()
uniform vec2 uSimSize;         // базово 960x540, адаптивно через setResolution()
uniform float uTime;
uniform float uScaleId;
uniform int uNodeCount;
uniform int uBeaconCount;
uniform vec4 uNodes[64];       // x,y,radius,owner (sim px)
uniform vec4 uBeacons[32];     // x,y,radius,kind
uniform float uBeaconFade[32]; // ttlAlpha 0..1

out vec4 fragColor;

float hash21(vec2 p) {
  vec2 q = fract(p * vec2(0.1031, 0.1030));
  q += dot(q, q.yx + 33.33);
  return fract((q.x + q.y) * q.x);
}

// Билинейная выборка следа в координатах ячеек
vec2 sampleTrail(vec2 cell) {
  vec2 lim = uTrailSize - vec2(1.0);
  vec2 c = clamp(cell, vec2(0.0), lim);
  vec2 fl = floor(c);
  vec2 t = c - fl;
  ivec2 p0 = ivec2(fl);
  ivec2 p1 = min(p0 + ivec2(1), ivec2(lim));
  vec2 c00 = texelFetch(uTrail, p0, 0).rg;
  vec2 c10 = texelFetch(uTrail, ivec2(p1.x, p0.y), 0).rg;
  vec2 c01 = texelFetch(uTrail, ivec2(p0.x, p1.y), 0).rg;
  vec2 c11 = texelFetch(uTrail, p1, 0).rg;
  return mix(mix(c00, c10, t.x), mix(c01, c11, t.x), t.y);
}

// Поля аттрактора (x) и токсина (y): аналитика как в WGSL-diffuse
vec2 fieldsAt(vec2 pos) {
  float attract = 0.0;
  float toxin = 0.0;
  for (int n = 0; n < 64; n++) {
    if (n >= uNodeCount) { break; }
    vec4 nd = uNodes[n];
    float R = nd.z * 2.2;
    float d = distance(pos, nd.xy);
    if (d < R) {
      float f = 1.0 - d / R;
      float boost = nd.w > 0.5 ? 1.45 : 1.0;
      attract = max(attract, f * f * (3.0 - 2.0 * f) * 0.45 * boost);
    }
  }
  for (int b = 0; b < 32; b++) {
    if (b >= uBeaconCount) { break; }
    vec4 bc = uBeacons[b];
    float fade = uBeaconFade[b];
    float R2 = bc.z * 1.8;
    float d = distance(pos, bc.xy);
    if (d < R2 && bc.w > 0.0) {
      float f = 1.0 - d / R2;
      float s = f * f * (3.0 - 2.0 * f) * fade;
      if (bc.w > 1.5) {
        // ИИ-маяк: вражеское поле (отрицательный аттрактор)
        attract = min(attract, 0.0) - s * 0.9;
      } else {
        // Аттрактор игрока
        attract = max(attract, s * 1.4);
      }
    } else if (d < bc.z && bc.w < 0.0) {
      // Токсин
      float f = 1.0 - d / bc.z;
      float s = f * f * (3.0 - 2.0 * f) * fade;
      toxin = max(toxin, s * 1.4);
    }
  }
  return vec2(attract, toxin);
}

// ---------- Палитры 15 локаций: фон, штамм игрока, штамм врага ----------

vec3 bgPalette(float sc) {
  vec3 c = vec3(0.030, 0.090, 0.130); // 1: глубина первичной капли
  if (sc > 1.5 && sc < 2.5) { c = vec3(0.050, 0.100, 0.030); } // 2: мох агары
  else if (sc > 2.5 && sc < 3.5) { c = vec3(0.140, 0.030, 0.050); } // 3: ткань сосуда
  else if (sc > 3.5 && sc < 4.5) { c = vec3(0.030, 0.090, 0.110); } // 4: белёсая лимфа
  else if (sc > 4.5 && sc < 5.5) { c = vec3(0.020, 0.080, 0.160); } // 5: чернильный океан
  else if (sc > 5.5 && sc < 6.5) { c = vec3(0.090, 0.090, 0.110); } // 6: костная пыль
  else if (sc > 6.5 && sc < 7.5) { c = vec3(0.050, 0.020, 0.120); } // 7: синаптическая тьма
  else if (sc > 7.5 && sc < 8.5) { c = vec3(0.100, 0.070, 0.020); } // 8: выдох наружу
  else if (sc > 8.5 && sc < 9.5) { c = vec3(0.020, 0.100, 0.060); } // 9: сумрак тайги
  else if (sc > 9.5 && sc < 10.5) { c = vec3(0.110, 0.050, 0.020); } // 10: ржавая пыль
  else if (sc > 10.5 && sc < 11.5) { c = vec3(0.130, 0.060, 0.030); } // 11: магма разлома
  else if (sc > 11.5 && sc < 12.5) { c = vec3(0.020, 0.090, 0.130); } // 12: полярный лёд
  else if (sc > 12.5 && sc < 13.5) { c = vec3(0.020, 0.120, 0.150); } // 13: небесная мгла
  else if (sc > 13.5 && sc < 14.5) { c = vec3(0.100, 0.030, 0.120); } // 14: ионная буря
  else if (sc > 14.5) { c = vec3(0.060, 0.030, 0.140); } // 15: фиолетовая пустота фрактала
  return c;
}

vec3 playerPalette(float sc) {
  vec3 c = vec3(0.15, 0.95, 0.88); // 1: неон-циан
  if (sc > 1.5 && sc < 2.5) { c = vec3(0.60, 0.90, 0.43); } // 2: лайм агары
  else if (sc > 2.5 && sc < 3.5) { c = vec3(0.34, 0.90, 0.66); } // 3: тил паразита
  else if (sc > 3.5 && sc < 4.5) { c = vec3(0.22, 0.74, 0.97); } // 4: небесный поток
  else if (sc > 4.5 && sc < 5.5) { c = vec3(0.30, 0.55, 1.00); } // 5: глубоководный синий
  else if (sc > 5.5 && sc < 6.5) { c = vec3(0.89, 0.91, 0.94); } // 6: костный фарфор
  else if (sc > 6.5 && sc < 7.5) { c = vec3(0.55, 0.36, 0.96); } // 7: синаптический фиолет
  else if (sc > 7.5 && sc < 8.5) { c = vec3(0.98, 0.75, 0.14); } // 8: янтарный выдох
  else if (sc > 8.5 && sc < 9.5) { c = vec3(0.20, 0.83, 0.60); } // 9: изумруд спор
  else if (sc > 9.5 && sc < 10.5) { c = vec3(0.98, 0.45, 0.09); } // 10: ржавый закат
  else if (sc > 10.5 && sc < 11.5) { c = vec3(1.00, 0.54, 0.24); } // 11: тектоническая магма
  else if (sc > 11.5 && sc < 12.5) { c = vec3(0.49, 0.83, 0.99); } // 12: ледяной блик
  else if (sc > 12.5 && sc < 13.5) { c = vec3(0.65, 0.95, 0.99); } // 13: небесная пена
  else if (sc > 13.5 && sc < 14.5) { c = vec3(0.94, 0.67, 0.99); } // 14: ионная магента
  else if (sc > 14.5) { c = vec3(0.66, 0.42, 1.00); } // 15: фрактальный фиолет
  return c;
}

vec3 enemyPalette(float sc) {
  vec3 c = vec3(0.75, 0.20, 1.00); // 1: фиолетовый мицелий
  if (sc > 1.5 && sc < 2.5) { c = vec3(1.00, 0.30, 0.20); } // 2: гниль агары
  else if (sc > 2.5 && sc < 3.5) { c = vec3(1.00, 0.18, 0.50); } // 3: иммунный багровый
  else if (sc > 3.5 && sc < 4.5) { c = vec3(0.90, 0.90, 0.85); } // 4: лимфоциты-жнецы
  else if (sc > 4.5 && sc < 5.5) { c = vec3(0.85, 0.25, 1.00); } // 5: медуза-виолет
  else if (sc > 5.5 && sc < 6.5) { c = vec3(0.85, 0.88, 0.92); } // 6: остеокласты
  else if (sc > 6.5 && sc < 7.5) { c = vec3(0.40, 0.90, 1.00); } // 7: нейроимпульсы
  else if (sc > 7.5 && sc < 8.5) { c = vec3(1.00, 0.80, 0.40); } // 8: пыль ветра
  else if (sc > 8.5 && sc < 9.5) { c = vec3(0.50, 1.00, 0.55); } // 9: хищные споры
  else if (sc > 9.5 && sc < 10.5) { c = vec3(1.00, 0.45, 0.15); } // 10: ржавые псы
  else if (sc > 10.5 && sc < 11.5) { c = vec3(0.60, 0.16, 1.00); } // 11: протоплазма разлома
  else if (sc > 11.5 && sc < 12.5) { c = vec3(0.60, 0.90, 1.00); } // 12: ледяные хищники
  else if (sc > 12.5 && sc < 13.5) { c = vec3(0.40, 0.95, 1.00); } // 13: небесные пиявки
  else if (sc > 13.5 && sc < 14.5) { c = vec3(1.00, 0.40, 0.85); } // 14: авроральные полчища
  else if (sc > 14.5) { c = vec3(1.00, 0.88, 0.60); } // 15: золото пустоты
  return c;
}

void main() {
  // sim px с flip-Y: y = 0 сверху (та же ориентация, что в WGSL-маппинге uv)
  vec2 px = vec2(gl_FragCoord.x, uSimSize.y - gl_FragCoord.y);
  vec2 strain = sampleTrail(px * (uTrailSize / uSimSize));

  vec3 palP = playerPalette(uScaleId);
  vec3 palE = enemyPalette(uScaleId);

  // Фон среды: палитра текущего масштаба
  vec3 col = bgPalette(uScaleId);

  // Редкий звёздный шум
  float sh = hash21(floor(px / 3.0));
  if (sh > 0.997) {
    float tw = 0.6 + 0.4 * sin(uTime * 2.0 + sh * 400.0);
    col += vec3(0.55, 0.65, 0.8) * ((sh - 0.997) / 0.003) * 0.5 * tw;
  }

  // Живой фон биома: универсальная конвекция среды в тоне локации
  float drift = (0.5 + 0.5 * sin(px.x * 0.020 + uTime * 0.40))
              * (0.5 + 0.5 * sin(px.y * 0.027 - uTime * 0.30));
  col += bgPalette(uScaleId) * (0.4 + 0.8 * drift) * 1.2;

  // Био-штаммы Physarum: люминесцентное поле игрока и токсичное поле врага
  float pDensity = strain.r;
  float eDensity = strain.g;
  col += palP * (pDensity * 0.12 + pow(pDensity, 1.8) * 0.22);
  col += palE * (eDensity * 0.09 + pow(eDensity, 1.8) * 0.18);

  // Поля маяков: аттрактор игрока (b > 0) и ИИ-маяк (b < 0)
  vec2 fld = fieldsAt(px);
  col += vec3(0.10, 0.32, 0.38) * max(fld.x, 0.0) * 0.12;
  col += vec3(0.35, 0.12, 0.55) * max(-fld.x, 0.0) * 0.12;

  // Поле токсина: пульсация
  float ripple = 0.5 + 0.5 * sin(uTime * 2.6 - px.x * 0.05 + px.y * 0.04);
  col += vec3(0.45, 0.05, 0.10) * fld.y * (0.5 + 0.5 * ripple);

  // Tone-mapping: Reinhard -> gamma
  col = col / (col + vec3(1.0));
  col = pow(col, vec3(0.88));

  // Виньетка
  vec2 uv = px / uSimSize;
  vec2 vq = uv * (vec2(1.0) - uv.yx) * 18.0;
  float vig = pow(clamp(vq.x * vq.y, 0.0, 1.0), 0.22);
  col *= vig;

  fragColor = vec4(col, 1.0);
}
`;

// ------------------------- реализация -------------------------

interface DisplayUniforms {
  uTrail: WebGLUniformLocation | null;
  uTrailSize: WebGLUniformLocation | null;
  uSimSize: WebGLUniformLocation | null;
  uTime: WebGLUniformLocation | null;
  uScaleId: WebGLUniformLocation | null;
  uNodeCount: WebGLUniformLocation | null;
  uBeaconCount: WebGLUniformLocation | null;
  uNodes: WebGLUniformLocation | null;
  uBeacons: WebGLUniformLocation | null;
  uBeaconFade: WebGLUniformLocation | null;
}

/**
 * Physarum-симуляция на WebGL2: CPU-агенты + CPU-след (RG float),
 * GPU - только отображение поля. Контракт 1:1 с WebGPUSim.
 */
export class WebGL2Sim implements PhysarumSim, SimResolutionProvider {
  readonly backend: PhysarumBackend = 'webgl2';
  readonly agentCount = AGENT_BASE;
  onDeviceLost?: (reason: string) => void;

  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private trailTex: WebGLTexture | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private loc: DisplayUniforms | null = null;
  private contextLost = false;

  // Текущая сетка симуляции (sim px) и следа (клетки 2x2 sim px):
  // база 960x540 / 480x270, адаптивный ресайз - setResolution()
  private simW = SIM_WIDTH;
  private simH = SIM_HEIGHT;
  private tw = BASE_TRAIL_W;
  private th = BASE_TRAIL_H;

  // Агенты: [x, y, angle, species] - species 0 игрок / 1 враг
  private agents = new Float32Array(AGENT_BASE * 4);
  // След RG: [r, g] на ячейку - r игрок, g враг (b/a поля аналитические)
  private trail = new Float32Array(BASE_TRAIL_W * BASE_TRAIL_H * 2);
  private trailTmp = new Float32Array(BASE_TRAIL_W * BASE_TRAIL_H * 2);
  // Штампуемые поля для сенсоров (аналог каналов b/a в WGSL)
  private attract = new Float32Array(BASE_TRAIL_W * BASE_TRAIL_H);
  private toxin = new Float32Array(BASE_TRAIL_W * BASE_TRAIL_H);

  private activeAgentCount = AGENT_BASE;
  private sporeCursor = 0;
  private lastStatsTime = 0;

  // Скретч кадра: ноль аллокаций на горячем пути
  private nodeUniform = new Float32Array(MAX_NODES * 4);
  private beaconUniform = new Float32Array(MAX_BEACONS * 4);
  private beaconFade = new Float32Array(MAX_BEACONS);
  private attractorX = new Float32Array(MAX_BEACONS);
  private attractorY = new Float32Array(MAX_BEACONS);
  private attractorCount = 0;
  // Результат билинейной выборки следа
  private sR = 0;
  private sG = 0;
  // Контекст кадра для updateAgent (без длинных списков параметров)
  private fTimeSeed = 0;
  private fFollow = 0;
  private fAiX = 0;
  private fAiY = 0;
  private fAiIntensity = 0;
  private fEnemyBiasK = 0;
  private fCamX = 0;
  private fCamY = 0;

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      throw new Error('WebGL2 не поддерживается. Обновите браузер или включите аппаратное ускорение');
    }
    this.canvas = canvas;
    this.gl = gl;
    canvas.width = this.simW;
    canvas.height = this.simH;
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    this.createResources(gl);
  }

  /** Настройка качества: доля активных агентов (0.35..1.0), как в WebGPUSim */
  setQualityRatio(ratio: number): void {
    // Защита от NaN/Infinity: некорректное значение трактуется как максимум
    const r = Number.isFinite(ratio) ? Math.max(0.35, Math.min(1, ratio)) : 1;
    this.activeAgentCount = Math.max(MIN_ACTIVE, Math.floor(this.agentCount * r));
  }

  /** Фактический размер сетки (для адаптивного маппинга координат в bridge) */
  get simWidth(): number {
    return this.simW;
  }

  get simHeight(): number {
    return this.simH;
  }

  /**
   * Адаптивный ресайз сетки (см. simResolution.ts). Sim px растёт, клетка следа
   * 2x2 sim px сохраняется - концентрация феромона на клетку и порог захвата
   * STRAIN.densityThreshold инвариантны к ресайзу. CPU-массивы следа и RG32F
   * текстура пересоздаются под новый размер (след сбрасывается - допустимо по
   * контракту), колонии расселяются заново. Вызов с текущим размером - no-op.
   */
  setResolution(w: number, h: number): void {
    const nw = roundEvenSim(w);
    const nh = roundEvenSim(h);
    if (nw === this.simW && nh === this.simH) return; // тот же размер: early return
    this.simW = nw;
    this.simH = nh;
    this.tw = nw >> 1;
    this.th = nh >> 1;
    // CPU-память следа: новые нулевые массивы под новую сетку
    this.trail = new Float32Array(this.tw * this.th * 2);
    this.trailTmp = new Float32Array(this.tw * this.th * 2);
    this.attract = new Float32Array(this.tw * this.th);
    this.toxin = new Float32Array(this.tw * this.th);
    // Колонии расселяются по новой сетке, курсор спор сбрасывается
    this.resetColonies();
    const gl = this.gl;
    if (!gl || this.contextLost || !this.program || !this.loc) {
      // До init / при потерянном контексте: restore пересоздаст ресурсы под новые поля
      return;
    }
    if (this.canvas) {
      this.canvas.width = nw;
      this.canvas.height = nh;
    }
    gl.viewport(0, 0, nw, nh);
    // RG32F-текстура следа: реаллок под новый размер
    if (this.trailTex) gl.deleteTexture(this.trailTex);
    this.trailTex = this.createTrailTexture(gl);
    // Униформы размеров дисплея и следа
    gl.useProgram(this.program);
    gl.uniform2f(this.loc.uTrailSize, this.tw, this.th);
    gl.uniform2f(this.loc.uSimSize, nw, nh);
  }

  resetColonies(): void {
    // Очистка следа и полей
    this.trail.fill(0);
    this.attract.fill(0);
    this.toxin.fill(0);
    this.sporeCursor = 0;
    this.lastStatsTime = 0;

    // Оба штамма рассеяны по всему полю: живая сеть с первого кадра
    const agents = this.agents;
    const half = this.agentCount / 2;
    for (let i = 0; i < this.agentCount; i++) {
      const base = i * 4;
      agents[base] = Math.random() * this.simW;
      agents[base + 1] = Math.random() * this.simH;
      agents[base + 2] = Math.random() * TWO_PI;
      agents[base + 3] = i >= half ? 1 : 0;
    }
  }

  /** Вброс свежих агентов: координаты в базовой системе SIM_WIDTH x SIM_HEIGHT,
   *  масштабируются в текущую адаптивную сетку (радиус облака - тем же множителем) */
  spawnPlayerSpores(x: number, y: number, count = 4000): void {
    const kx = this.simW / SIM_WIDTH;
    const ky = this.simH / SIM_HEIGHT;
    const km = (kx + ky) * 0.5;
    const half = Math.max(1, Math.floor(this.activeAgentCount / 2));
    const batch = Math.min(count, half);
    const capacity = Math.max(1, half - batch);
    const startIdx = this.sporeCursor % capacity;
    this.sporeCursor = (startIdx + batch) % capacity;
    const agents = this.agents;
    for (let i = 0; i < batch; i++) {
      const r = Math.random() * 18 * km;
      const a = Math.random() * TWO_PI;
      const base = (startIdx + i) * 4;
      agents[base] = x * kx + Math.cos(a) * r;
      agents[base + 1] = y * ky + Math.sin(a) * r;
      agents[base + 2] = a;
      agents[base + 3] = 0;
    }
  }

  step(
    time: number,
    dt: number,
    nodes: BioNode[],
    beacons: Beacon[],
    aiTarget: { x: number; y: number },
    aiIntensity: number,
    evaporation: number,
    scaleId: number,
    camDeltaX: number,
    camDeltaY: number,
    onNodeStats: (stats: SimNodeStat[]) => void
  ): void {
    void dt; // шаг фиксированный, как в WebGPU (скорости заданы за кадр)

    // Контекст кадра
    this.fTimeSeed = Math.imul(Math.floor(time * 60) >>> 0, 73856093) >>> 0;
    this.fFollow = Math.max(0, Math.min(1, 0.6 + aiIntensity * 0.8));
    this.fAiX = aiTarget.x;
    this.fAiY = aiTarget.y;
    this.fAiIntensity = aiIntensity;
    this.fEnemyBiasK = 0.42 * (0.6 + aiIntensity * 0.8);
    this.fCamX = camDeltaX;
    this.fCamY = camDeltaY;

    const bCount = Math.min(beacons.length, MAX_BEACONS);
    for (let i = 0; i < bCount; i++) {
      const b = beacons[i];
      this.beaconFade[i] = b.maxTtl > 0 ? Math.max(0, Math.min(1, b.ttl / b.maxTtl)) : 1;
    }
    // Аттракторы игрока (kind = 1) для глобального курса
    let ac = 0;
    for (let i = 0; i < bCount; i++) {
      if (beacons[i].kind === 1) {
        this.attractorX[ac] = beacons[i].x;
        this.attractorY[ac] = beacons[i].y;
        ac++;
      }
    }
    this.attractorCount = ac;

    // 1. Поля аттрактора/токсина для сенсоров (штамп по ячейкам следа)
    this.stampFields(nodes, beacons);

    // 2. Агенты: сенсоры, поворот, движение, депозит (оба штамма 50/50)
    const totalHalf = this.agentCount / 2;
    const activeHalf = Math.max(1, Math.floor(this.activeAgentCount / 2));
    for (let g = 0; g < activeHalf; g++) {
      this.updateAgent(g, true);
      this.updateAgent(totalHalf + g, false);
    }

    // 3. Мировой якорь (сдвиг камерой) + диффузия/испарение
    this.shiftTrail(camDeltaX / CELL, camDeltaY / CELL);
    this.blurTrail(evaporation);

    // 4. Следовые эффекты маяков: подсыпка ИИ, выжигание токсином
    this.applyBeaconTrail(beacons);

    // 5. Статистика плотности штаммов на узлах (троттлинг как readback в WebGPU)
    const now = performance.now();
    if (nodes.length > 0 && now - this.lastStatsTime > STATS_PERIOD_MS) {
      this.lastStatsTime = now;
      onNodeStats(this.computeNodeStats(nodes));
    }

    // 6. Загрузка следа в GPU и отрисовка поля
    if (this.gl && !this.contextLost) {
      this.uploadTrail();
      this.render(time, scaleId, nodes, beacons);
    }
  }

  /** Снимок последнего отрисованного кадра physarum-поля */
  async captureFrame(): Promise<HTMLCanvasElement | null> {
    try {
      if (!this.canvas || !this.gl || this.contextLost) return null;
      const c = document.createElement('canvas');
      c.width = this.simW;
      c.height = this.simH;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(this.canvas, 0, 0, this.simW, this.simH);
      return c;
    } catch (e) {
      console.warn('captureFrame fallback to null:', e);
      return null;
    }
  }

  // ------------------------- GL: ресурсы и рендер -------------------------

  private createResources(gl: WebGL2RenderingContext): void {
    const vs = this.compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const prog = gl.createProgram();
    if (!prog) throw new Error('Не удалось создать WebGL2-программу');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error('Ошибка линковки WebGL2-программы: ' + (log ?? 'нет лога'));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (this.program) gl.deleteProgram(this.program);
    this.program = prog;

    this.loc = {
      uTrail: gl.getUniformLocation(prog, 'uTrail'),
      uTrailSize: gl.getUniformLocation(prog, 'uTrailSize'),
      uSimSize: gl.getUniformLocation(prog, 'uSimSize'),
      uTime: gl.getUniformLocation(prog, 'uTime'),
      uScaleId: gl.getUniformLocation(prog, 'uScaleId'),
      uNodeCount: gl.getUniformLocation(prog, 'uNodeCount'),
      uBeaconCount: gl.getUniformLocation(prog, 'uBeaconCount'),
      uNodes: gl.getUniformLocation(prog, 'uNodes[0]'),
      uBeacons: gl.getUniformLocation(prog, 'uBeacons[0]'),
      uBeaconFade: gl.getUniformLocation(prog, 'uBeaconFade[0]'),
    };
    gl.useProgram(prog);
    gl.uniform2f(this.loc.uTrailSize, this.tw, this.th);
    gl.uniform2f(this.loc.uSimSize, this.simW, this.simH);

    // Текстура следа RG32F (NEAREST + texelFetch: float-фильтрация не требуется)
    if (this.trailTex) gl.deleteTexture(this.trailTex);
    this.trailTex = this.createTrailTexture(gl);

    // Пустой VAO: рендер без атрибутов через gl_VertexID
    if (this.vao) gl.deleteVertexArray(this.vao);
    this.vao = gl.createVertexArray();

    gl.viewport(0, 0, this.simW, this.simH);
  }

  /** RG32F-текстура следа под текущую сетку: init и адаптивный ресайз */
  private createTrailTexture(gl: WebGL2RenderingContext): WebGLTexture {
    const tex = gl.createTexture();
    if (!tex) throw new Error('Не удалось создать текстуру следа');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, this.tw, this.th, 0, gl.RG, gl.FLOAT, this.trail);
    return tex;
  }

  private compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
    const sh = gl.createShader(type);
    if (!sh) throw new Error('Не удалось создать шейдер WebGL2');
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('Ошибка компиляции GLSL-шейдера: ' + (log ?? 'нет лога'));
    }
    return sh;
  }

  private uploadTrail(): void {
    const gl = this.gl;
    if (!gl || !this.trailTex) return;
    gl.bindTexture(gl.TEXTURE_2D, this.trailTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.tw, this.th, gl.RG, gl.FLOAT, this.trail);
  }

  private render(time: number, scaleId: number, nodes: BioNode[], beacons: Beacon[]): void {
    const gl = this.gl;
    if (!gl || !this.program || !this.loc) return;
    const nCount = Math.min(nodes.length, MAX_NODES);
    const bCount = Math.min(beacons.length, MAX_BEACONS);

    const nu = this.nodeUniform;
    for (let i = 0; i < nCount; i++) {
      const n = nodes[i];
      const o = i * 4;
      nu[o] = n.x;
      nu[o + 1] = n.y;
      nu[o + 2] = n.radius;
      nu[o + 3] = n.owner;
    }
    const bu = this.beaconUniform;
    for (let i = 0; i < bCount; i++) {
      const b = beacons[i];
      const o = i * 4;
      bu[o] = b.x;
      bu[o + 1] = b.y;
      bu[o + 2] = b.radius;
      bu[o + 3] = b.kind;
    }

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.trailTex);
    gl.uniform1i(this.loc.uTrail, 0);
    gl.uniform1f(this.loc.uTime, time);
    gl.uniform1f(this.loc.uScaleId, scaleId);
    gl.uniform1i(this.loc.uNodeCount, nCount);
    gl.uniform1i(this.loc.uBeaconCount, bCount);
    gl.uniform4fv(this.loc.uNodes, nu);
    gl.uniform4fv(this.loc.uBeacons, bu);
    gl.uniform1fv(this.loc.uBeaconFade, this.beaconFade);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
    console.warn('WebGL2 context lost');
    this.onDeviceLost?.('WebGL2-контекст потерян');
  };

  private onContextRestored = (): void => {
    const gl = this.gl;
    if (!gl) return;
    try {
      this.createResources(gl);
      this.contextLost = false;
    } catch (err) {
      console.error('WebGL2 restore:', err);
      this.onDeviceLost?.('Не удалось восстановить WebGL2-контекст');
    }
  };

  // ------------------------- след: сдвиг, диффузия, эффекты -------------------------

  /**
   * Мировой якорь: пересемплирование следа на смещение камеры.
   * Эквивалент чтения trailIn с камерой внутри размытия WGSL:
   * blur(shift(T, cam)) == WGSL blur с семплами (x + cam + tap).
   */
  private shiftTrail(camCx: number, camCy: number): void {
    if (camCx === 0 && camCy === 0) return;
    const trail = this.trail;
    const src = this.trailTmp;
    src.set(trail);
    for (let y = 0; y < this.th; y++) {
      const sy = y + camCy;
      const rowD = y * this.tw * 2;
      if (sy < 0 || sy >= this.th) {
        for (let x = 0; x < this.tw; x++) {
          trail[rowD + x * 2] = 0;
          trail[rowD + x * 2 + 1] = 0;
        }
        continue;
      }
      const y0 = Math.floor(sy);
      const ty = sy - y0;
      const rowA = Math.min(Math.max(y0, 0), this.th - 1) * this.tw * 2;
      const rowB = Math.min(y0 + 1, this.th - 1) * this.tw * 2;
      for (let x = 0; x < this.tw; x++) {
        const sx = x + camCx;
        const di = rowD + x * 2;
        if (sx < 0 || sx >= this.tw) {
          trail[di] = 0;
          trail[di + 1] = 0;
          continue;
        }
        const x0 = Math.floor(sx);
        const tx = sx - x0;
        const xa = Math.min(Math.max(x0, 0), this.tw - 1) * 2;
        const xb = Math.min(x0 + 1, this.tw - 1) * 2;
        const iA = rowA + xa;
        const iB = rowA + xb;
        const iC = rowB + xa;
        const iD = rowB + xb;
        const rTop = src[iA] + (src[iB] - src[iA]) * tx;
        const rBot = src[iC] + (src[iD] - src[iC]) * tx;
        trail[di] = rTop + (rBot - rTop) * ty;
        const gTop = src[iA + 1] + (src[iB + 1] - src[iA + 1]) * tx;
        const gBot = src[iC + 1] + (src[iD + 1] - src[iC + 1]) * tx;
        trail[di + 1] = gTop + (gBot - gTop) * ty;
      }
    }
  }

  /** 3x3 box blur (сепарабельный) с испарением - аналог WGSL diffuse */
  private blurTrail(evaporation: number): void {
    const trail = this.trail;
    const tmp = this.trailTmp;
    // Горизонтальный проход
    for (let y = 0; y < this.th; y++) {
      const base = y * this.tw * 2;
      for (let x = 0; x < this.tw; x++) {
        const xa = (x > 0 ? x - 1 : 0) * 2;
        const xb = (x < this.tw - 1 ? x + 1 : this.tw - 1) * 2;
        const i = base + x * 2;
        tmp[i] = (trail[base + xa] + trail[i] + trail[base + xb]) / 3;
        tmp[i + 1] = (trail[base + xa + 1] + trail[i + 1] + trail[base + xb + 1]) / 3;
      }
    }
    // Вертикальный проход с испарением
    for (let y = 0; y < this.th; y++) {
      const ya = (y > 0 ? y - 1 : 0) * this.tw * 2;
      const yb = (y < this.th - 1 ? y + 1 : this.th - 1) * this.tw * 2;
      const yc = y * this.tw * 2;
      for (let x = 0; x < this.tw; x++) {
        const xi = x * 2;
        trail[yc + xi] = ((tmp[ya + xi] + tmp[yc + xi] + tmp[yb + xi]) / 3) * evaporation;
        trail[yc + xi + 1] = ((tmp[ya + xi + 1] + tmp[yc + xi + 1] + tmp[yb + xi + 1]) / 3) * evaporation;
      }
    }
  }

  /** Подсыпка ИИ-маяков и выжигание токсином на размытом следе (как в WGSL diffuse) */
  private applyBeaconTrail(beacons: Beacon[]): void {
    const bCount = Math.min(beacons.length, MAX_BEACONS);
    if (bCount === 0) return;
    const trail = this.trail;
    for (let i = 0; i < bCount; i++) {
      const bc = beacons[i];
      const fade = this.beaconFade[i];
      const cx = bc.x / CELL;
      const cy = bc.y / CELL;
      if (bc.kind > 1.5) {
        // ИИ-маяк: вражеский след в радиусе R (фоллофф по R2)
        const R = bc.radius / CELL;
        const R2 = (bc.radius * 1.8) / CELL;
        if (R2 <= 0) continue;
        const x0 = Math.max(0, Math.floor(cx - R2));
        const x1 = Math.min(this.tw - 1, Math.ceil(cx + R2));
        const y0 = Math.max(0, Math.floor(cy - R2));
        const y1 = Math.min(this.th - 1, Math.ceil(cy + R2));
        const R2sq = R2 * R2;
        const Rsq = R * R;
        for (let y = y0; y <= y1; y++) {
          const row = y * this.tw;
          for (let x = x0; x <= x1; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 >= R2sq) continue;
            if (d2 < Rsq) {
              const f = 1 - Math.sqrt(d2) / R2;
              const s = f * f * (3 - 2 * f) * fade;
              const gi = (row + x) * 2 + 1;
              trail[gi] = Math.min(1, trail[gi] + s * 0.004);
            }
          }
        }
      } else if (bc.kind < 0) {
        // Токсин: выжигает вражеский след сильнее, свой слегка
        const R = bc.radius / CELL;
        if (R <= 0) continue;
        const x0 = Math.max(0, Math.floor(cx - R));
        const x1 = Math.min(this.tw - 1, Math.ceil(cx + R));
        const y0 = Math.max(0, Math.floor(cy - R));
        const y1 = Math.min(this.th - 1, Math.ceil(cy + R));
        const Rsq = R * R;
        for (let y = y0; y <= y1; y++) {
          const row = y * this.tw;
          for (let x = x0; x <= x1; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const d2 = dx * dx + dy * dy;
            if (d2 >= Rsq) continue;
            const f = 1 - Math.sqrt(d2) / R;
            const s = f * f * (3 - 2 * f) * fade;
            const gi = (row + x) * 2 + 1;
            const ri = gi - 1;
            trail[gi] *= 1 - s * 0.18;
            trail[ri] *= 1 - s * 0.03;
          }
        }
      }
    }
  }

  // ------------------------- поля для сенсоров -------------------------

  /** Штамп поля по максимуму (аналог attractField/toxinField в WGSL diffuse) */
  private stampMax(field: Float32Array, cx: number, cy: number, R: number, amp: number): void {
    if (R <= 0) return;
    const x0 = Math.max(0, Math.floor(cx - R));
    const x1 = Math.min(this.tw - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R));
    const y1 = Math.min(this.th - 1, Math.ceil(cy + R));
    const Rsq = R * R;
    for (let y = y0; y <= y1; y++) {
      const row = y * this.tw;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= Rsq) continue;
        const f = 1 - Math.sqrt(d2) / R;
        const v = f * f * (3 - 2 * f) * amp;
        const i = row + x;
        if (v > field[i]) field[i] = v;
      }
    }
  }

  /** Штамп отрицательного поля по минимуму (ИИ-маяк: min(attract,0) - s*k) */
  private stampMin(field: Float32Array, cx: number, cy: number, R: number, k: number): void {
    if (R <= 0) return;
    const x0 = Math.max(0, Math.floor(cx - R));
    const x1 = Math.min(this.tw - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R));
    const y1 = Math.min(this.th - 1, Math.ceil(cy + R));
    const Rsq = R * R;
    for (let y = y0; y <= y1; y++) {
      const row = y * this.tw;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= Rsq) continue;
        const f = 1 - Math.sqrt(d2) / R;
        const s = f * f * (3 - 2 * f) * k;
        const i = row + x;
        const v = Math.min(field[i], 0) - s;
        if (v < field[i]) field[i] = v;
      }
    }
  }

  /** Поля аттрактора/токсина в ячейках следа для сенсоров агентов */
  private stampFields(nodes: BioNode[], beacons: Beacon[]): void {
    this.attract.fill(0);
    this.toxin.fill(0);
    const nCount = Math.min(nodes.length, MAX_NODES);
    for (let i = 0; i < nCount; i++) {
      const nd = nodes[i];
      // Ресурсные узлы: слабое притяжение, узел под владельцем тянет сильнее
      const boost = nd.owner === 1 ? 1.45 : 1.0;
      this.stampMax(this.attract, nd.x / CELL, nd.y / CELL, (nd.radius * 2.2) / CELL, 0.45 * boost);
    }
    const bCount = Math.min(beacons.length, MAX_BEACONS);
    for (let i = 0; i < bCount; i++) {
      const bc = beacons[i];
      const fade = this.beaconFade[i];
      const cx = bc.x / CELL;
      const cy = bc.y / CELL;
      if (bc.kind > 0) {
        const R2 = (bc.radius * 1.8) / CELL;
        if (bc.kind > 1.5) {
          this.stampMin(this.attract, cx, cy, R2, 0.9 * fade);
        } else {
          this.stampMax(this.attract, cx, cy, R2, 1.4 * fade);
        }
      } else {
        this.stampMax(this.toxin, cx, cy, bc.radius / CELL, 1.4 * fade);
      }
    }
  }

  // ------------------------- агенты -------------------------

  /** Билинейная выборка следа (r/g) -> this.sR / this.sG, вне поля - ноль (как в WGSL) */
  private sampleRG(x: number, y: number): void {
    if (x < 0 || x >= this.tw || y < 0 || y >= this.th) {
      this.sR = 0;
      this.sG = 0;
      return;
    }
    const trail = this.trail;
    const fx = x > this.tw - 1 ? this.tw - 1 : x;
    const fy = y > this.th - 1 ? this.th - 1 : y;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, this.tw - 1);
    const y1 = Math.min(y0 + 1, this.th - 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const i00 = (y0 * this.tw + x0) * 2;
    const i10 = (y0 * this.tw + x1) * 2;
    const i01 = (y1 * this.tw + x0) * 2;
    const i11 = (y1 * this.tw + x1) * 2;
    const rTop = trail[i00] + (trail[i10] - trail[i00]) * tx;
    const rBot = trail[i01] + (trail[i11] - trail[i01]) * tx;
    this.sR = rTop + (rBot - rTop) * ty;
    const gTop = trail[i00 + 1] + (trail[i10 + 1] - trail[i00 + 1]) * tx;
    const gBot = trail[i01 + 1] + (trail[i11 + 1] - trail[i01 + 1]) * tx;
    this.sG = gTop + (gBot - gTop) * ty;
  }

  /** Билинейная выборка скалярного поля (attract/toxin), вне поля - ноль */
  private sampleField(field: Float32Array, x: number, y: number): number {
    if (x < 0 || x >= this.tw || y < 0 || y >= this.th) return 0;
    const fx = x > this.tw - 1 ? this.tw - 1 : x;
    const fy = y > this.th - 1 ? this.th - 1 : y;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, this.tw - 1);
    const y1 = Math.min(y0 + 1, this.th - 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const v00 = field[y0 * this.tw + x0];
    const v10 = field[y0 * this.tw + x1];
    const v01 = field[y1 * this.tw + x0];
    const v11 = field[y1 * this.tw + x1];
    const vTop = v00 + (v10 - v00) * tx;
    const vBot = v01 + (v11 - v01) * tx;
    return vTop + (vBot - vTop) * ty;
  }

  /** Обновление одного агента: сенсоры, поворот, движение, границы, депозит */
  private updateAgent(idx: number, isPlayer: boolean): void {
    const agents = this.agents;
    const base = idx * 4;
    let ax = agents[base];
    let ay = agents[base + 1];
    let angle = agents[base + 2];
    const seed = (idx ^ this.fTimeSeed) >>> 0;
    const rnd = rand01(seed);
    const rnd2 = rand01((seed ^ 0x9E3779B9) >>> 0);

    // Глобальный курс: игрок - к ближайшему аттрактору, враг - к цели ИИ
    let biasX = 0;
    let biasY = 0;
    let biasStrength = 0;
    if (isPlayer) {
      let bestD = 1e9;
      const cnt = this.attractorCount;
      for (let i = 0; i < cnt; i++) {
        const bx = this.attractorX[i];
        const by = this.attractorY[i];
        const dx = bx - ax;
        const dy = by - ay;
        const dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < bestD) {
          bestD = dd;
          biasX = bx;
          biasY = by;
        }
      }
      if (bestD < 1e8) biasStrength = 0.42 * Math.min(bestD / 30, 1);
    } else {
      biasX = this.fAiX;
      biasY = this.fAiY;
      const dx = biasX - ax;
      const dy = biasY - ay;
      const dd = Math.sqrt(dx * dx + dy * dy);
      biasStrength = this.fEnemyBiasK * Math.min(dd / 30, 1);
    }
    // Нормализованный вектор на цель bias (общий для трёх сенсоров)
    const toLen = Math.max(Math.sqrt((biasX - ax) * (biasX - ax) + (biasY - ay) * (biasY - ay)), 0.001);
    const toBx = (biasX - ax) / toLen;
    const toBy = (biasY - ay) / toLen;

    // Три сенсора: прямо / лево / право - веса как в sense() из physarum.wgsl
    const follow = this.fFollow;
    let wF = 0;
    let wL = 0;
    let wR = 0;
    for (let k = 0; k < 3; k++) {
      const off = k === 0 ? 0 : k === 1 ? SENSOR_SPACING : -SENSOR_SPACING;
      const sa = angle + off;
      const dirx = trig(COS_TAB, sa);
      const diry = trig(SIN_TAB, sa);
      const sx = ax + dirx * SENSOR_DIST;
      const sy = ay + diry * SENSOR_DIST;
      const cx = sx / CELL;
      const cy = sy / CELL;
      this.sampleRG(cx, cy);
      const tb = this.sampleField(this.attract, cx, cy);
      const ta = this.sampleField(this.toxin, cx, cy);
      const bias = Math.max(0, dirx * toBx + diry * toBy) * biasStrength;
      let w: number;
      if (isPlayer) {
        // Игрок: свои следы и аттракторы тянут, вражеский штамм и токсин отталкивают
        w = this.sR * follow + Math.max(tb, 0) * 3.2 + Math.min(tb, 0) * 2.8
          - this.sG * 1.1 * follow - ta * 2.5 + bias;
      } else {
        // Враг: свои следы + курс на цель ИИ, токсин отталкивает сильнее
        w = this.sG * follow + bias - this.sR * 0.9 * follow - ta * 7.0;
      }
      if (k === 0) wF = w;
      else if (k === 1) wL = w;
      else wR = w;
    }

    // Поворот по сенсорам (как в WGSL updateAgents)
    if (wF > wL && wF > wR) {
      angle += (rnd - 0.5) * 0.05;
    } else if (wF < wL && wF < wR) {
      angle += (rnd - 0.5) * 2.0 * TURN_SPEED;
    } else if (wR > wL) {
      angle -= rnd * TURN_SPEED;
    } else if (wL > wR) {
      angle += rnd * TURN_SPEED;
    } else {
      // Стагнация сенсоров: случайный разворот
      angle += (rnd - 0.5) * 2.4;
    }

    // Движение
    const speed = isPlayer ? 1.65 : 1.75 + this.fAiIntensity * 0.3;
    ax += trig(COS_TAB, angle) * speed;
    ay += trig(SIN_TAB, angle) * speed;

    // Отражение от границ поля со сдвигом камеры (мировой якорь)
    ax -= this.fCamX;
    ay -= this.fCamY;
    if (ax < 1) ax += this.simW - 2;
    if (ax >= this.simW - 1) ax -= this.simW - 2;
    if (ay < 1) ay += this.simH - 2;
    if (ay >= this.simH - 1) ay -= this.simH - 2;
    const noise = (rnd2 - 0.5) * 1.2;
    if (ax < 2 || ax >= this.simW - 2) {
      ax = Math.min(Math.max(ax, 2), this.simW - 2);
      angle = Math.PI - angle + noise;
    }
    if (ay < 2 || ay >= this.simH - 2) {
      ay = Math.min(Math.max(ay, 2), this.simH - 2);
      angle = -angle + noise;
    }

    agents[base] = ax;
    agents[base + 1] = ay;
    agents[base + 2] = angle;

    // Депозит феромона в ячейку следа (масштаб 1/4: паритет средней плотности)
    let px = Math.trunc(ax);
    let py = Math.trunc(ay);
    px = px < 0 ? 0 : px >= this.simW ? this.simW - 1 : px;
    py = py < 0 ? 0 : py >= this.simH ? this.simH - 1 : py;
    const ci = ((py >> 1) * this.tw + (px >> 1)) * 2;
    const trail = this.trail;
    if (isPlayer) {
      trail[ci] = Math.min(1, trail[ci] + DEPOSIT);
      trail[ci + 1] = Math.max(0, trail[ci + 1] - DEPLETE);
    } else {
      trail[ci + 1] = Math.min(1, trail[ci + 1] + DEPOSIT);
      trail[ci] = Math.max(0, trail[ci] - DEPLETE);
    }
  }

  // ------------------------- статистика узлов -------------------------

  /**
   * Средняя плотность штаммов вокруг центра узла: сетка 7x7 с шагом 4 sim px
   * (та же выборка, что sampleNodes в WGSL, в координатах ячеек 2x2 px).
   */
  private computeNodeStats(nodes: BioNode[]): SimNodeStat[] {
    const stats: SimNodeStat[] = [];
    const trail = this.trail;
    const count = Math.min(nodes.length, MAX_NODES);
    for (let i = 0; i < count; i++) {
      const nd = nodes[i];
      if (nd.x < 0 || nd.x >= this.simW || nd.y < 0 || nd.y >= this.simH) {
        stats.push({ playerDensity: 0, enemyDensity: 0 });
        continue;
      }
      const cx = Math.min(Math.max(Math.trunc(nd.x / CELL), 0), this.tw - 1);
      const cy = Math.min(Math.max(Math.trunc(nd.y / CELL), 0), this.th - 1);
      let accR = 0;
      let accG = 0;
      let n = 0;
      for (let dy = -6; dy <= 6; dy += 2) {
        const sy = Math.min(Math.max(cy + dy, 0), this.th - 1);
        for (let dx = -6; dx <= 6; dx += 2) {
          const sx = Math.min(Math.max(cx + dx, 0), this.tw - 1);
          const idx = (sy * this.tw + sx) * 2;
          accR += trail[idx];
          accG += trail[idx + 1];
          n++;
        }
      }
      stats.push({ playerDensity: accR / n, enemyDensity: accG / n });
    }
    // Узлы сверх MAX_NODES: нули (readback-буфер WebGPU возвращает нули за лимитом)
    for (let i = count; i < nodes.length; i++) {
      stats.push({ playerDensity: 0, enemyDensity: 0 });
    }
    return stats;
  }
}

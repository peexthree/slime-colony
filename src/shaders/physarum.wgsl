// physarum.wgsl - Slime Colony
// Compute: updateAgents / diffuse / sampleNodes. Render: полноэкранный проход.
// Каналы trail: r = феромон игрока, g = феромон врага, b = поле аттрактора (знаковое), a = поле токсина.

struct SimParams {
  width: f32,
  height: f32,
  dt: f32,
  time: f32,
  agentCount: u32,
  beaconCount: u32,
  nodeCount: u32,
  frame: u32,
  aiTargetX: f32,
  aiTargetY: f32,
  aiIntensity: f32,
  evaporation: f32,
  scaleId: f32,  // 1..5: масштаб бытия, переключает палитру поля
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

struct Agent {
  x: f32,
  y: f32,
  angle: f32,
  species: f32, // 0.0 = игрок, 1.0 = враг
};

struct Beacon {
  x: f32,
  y: f32,
  radius: f32,
  kind: f32, // 1.0 аттрактор игрока, -1.0 токсин, 2.0 ИИ-маяк
  ttlAlpha: f32, // затухание маяка 0..1
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

struct Node {
  x: f32,
  y: f32,
  radius: f32,
  owner: f32,
};

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read_write> agents: array<Agent>;
@group(0) @binding(2) var<storage, read_write> trailIn: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> trailOut: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> beacons: array<Beacon>;
@group(0) @binding(5) var<storage, read> nodes: array<Node>;
@group(0) @binding(6) var<storage, read_write> nodeStats: array<vec2<f32>>;

// ============================ ХЕЛПЕРЫ ============================

fn hash(state: u32) -> u32 {
  var s = state;
  s ^= 2747636419u;
  s *= 2654435769u;
  s ^= s >> 16u;
  s *= 2654435769u;
  s ^= s >> 16u;
  s *= 2654435769u;
  return s;
}

fn rand01(seed: u32) -> f32 {
  return f32(hash(seed)) / 4294967295.0;
}

fn hash21(p: vec2<f32>) -> f32 {
  var q = fract(p * vec2<f32>(0.1031, 0.1030));
  q += dot(q, q.yx + 33.33);
  return fract((q.x + q.y) * q.x);
}

/// Билинейная выборка следа в непрерывных координатах ячеек
fn sampleTrailBilinear(x: f32, y: f32) -> vec4<f32> {
  let w = i32(params.width);
  let h = i32(params.height);
  let fx = clamp(x, 0.0, f32(w - 1));
  let fy = clamp(y, 0.0, f32(h - 1));
  let x0 = i32(floor(fx));
  let y0 = i32(floor(fy));
  let x1 = min(x0 + 1, w - 1);
  let y1 = min(y0 + 1, h - 1);
  let tx = fx - floor(fx);
  let ty = fy - floor(fy);
  let c00 = trailIn[y0 * w + x0];
  let c10 = trailIn[y0 * w + x1];
  let c01 = trailIn[y1 * w + x0];
  let c11 = trailIn[y1 * w + x1];
  return mix(mix(c00, c10, tx), mix(c01, c11, tx), ty);
}

fn sense(a: Agent, angleOffset: f32, biasX: f32, biasY: f32, biasStrength: f32) -> f32 {
  let sensorAngle = a.angle + angleOffset;
  let sensorDist = 11.0;
  let sx = a.x + cos(sensorAngle) * sensorDist;
  let sy = a.y + sin(sensorAngle) * sensorDist;
  let t = sampleTrailBilinear(sx, sy);

  let dir = vec2<f32>(cos(sensorAngle), sin(sensorAngle));
  let toBias = vec2<f32>(biasX - a.x, biasY - a.y);
  let len = max(length(toBias), 0.001);
  let bias = max(0.0, dot(dir, toBias / len)) * biasStrength;

  // follow: масштаб следования по следу. При aiIntensity < -0.25 он нулевой -
  // фоновый режим: агенты дрейфуют пылью и не строят вен на всю карту
  let follow = clamp(0.6 + params.aiIntensity * 0.8, 0.0, 1.0);

  if (a.species < 0.5) {
    // Игрок: свои следы и аттракторы тянут, вражеский штамм и токсин отталкивают
    return t.r * 1.0 * follow + max(t.b, 0.0) * 3.2 + min(t.b, 0.0) * 2.8 - t.g * 1.1 * follow - t.a * 2.5 + bias;
  } else {
    // Враг: свои следы + курс на цель ИИ, токсин отталкивает сильнее (феромон-зов пугает)
    return t.g * 1.0 * follow + bias - t.r * 0.9 * follow - t.a * 7.0;
  }
}

// ============================ COMPUTE ============================

@compute @workgroup_size(64)
fn updateAgents(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= params.agentCount) { return; }

  var a = agents[idx];
  let seed = idx ^ (u32(params.time * 60.0) * 73856093u);
  let rnd = rand01(seed);
  let rnd2 = rand01(seed ^ 0x9E3779B9u);

  let sensorAngleSpacing = 0.52;
  let turnSpeed = 0.24;
  let speed = select(1.65, 1.75 + params.aiIntensity * 0.3, a.species >= 0.5);

  // Глобальный курс: игрок - к ближайшему своему аттрактору (аналог цели ИИ),
  // враг - к aiTarget. Затухание у самой цели распределяет депозит по узлу.
  var biasX = 0.0;
  var biasY = 0.0;
  var biasStrength = 0.0;
  if (a.species < 0.5) {
    var bestD = 1e9;
    for (var i = 0u; i < params.beaconCount; i++) {
      let bc = beacons[i];
      if (bc.kind > 0.5 && bc.kind < 1.5) {
        let dd = distance(vec2<f32>(a.x, a.y), vec2<f32>(bc.x, bc.y));
        if (dd < bestD) {
          bestD = dd;
          biasX = bc.x;
          biasY = bc.y;
        }
      }
    }
    if (bestD < 1e8) {
      biasStrength = 0.42 * min(bestD / 30.0, 1.0);
    }
  } else {
    biasX = params.aiTargetX;
    biasY = params.aiTargetY;
    let dd = distance(vec2<f32>(a.x, a.y), vec2<f32>(biasX, biasY));
    biasStrength = 0.42 * (0.6 + params.aiIntensity * 0.8) * min(dd / 30.0, 1.0);
  }

  let wF = sense(a, 0.0, biasX, biasY, biasStrength);
  let wL = sense(a, sensorAngleSpacing, biasX, biasY, biasStrength);
  let wR = sense(a, -sensorAngleSpacing, biasX, biasY, biasStrength);

  if (wF > wL && wF > wR) {
    a.angle += (rnd - 0.5) * 0.05;
  } else if (wF < wL && wF < wR) {
    a.angle += (rnd - 0.5) * 2.0 * turnSpeed;
  } else if (wR > wL) {
    a.angle -= rnd * turnSpeed;
  } else if (wL > wR) {
    a.angle += rnd * turnSpeed;
  } else {
    // стагнация сенсоров: случайный разворот
    a.angle += (rnd - 0.5) * 2.4;
  }

  a.x += cos(a.angle) * speed;
  a.y += sin(a.angle) * speed;

  // Отражение от границ поля со случайным шумом
  let noise = (rnd2 - 0.5) * 1.2;
  if (a.x < 2.0 || a.x >= params.width - 2.0) {
    a.x = clamp(a.x, 2.0, params.width - 2.0);
    a.angle = 3.14159265 - a.angle + noise;
  }
  if (a.y < 2.0 || a.y >= params.height - 2.0) {
    a.y = clamp(a.y, 2.0, params.height - 2.0);
    a.angle = -a.angle + noise;
  }

  agents[idx] = a;

  // Депозит феромона: едва заметная космическая пыль - никакого мусора на карте.
  // Основные хвосты рисуются детерминированно на CPU-слое
  let w = i32(params.width);
  let px = clamp(i32(a.x), 0, w - 1);
  let py = clamp(i32(a.y), 0, i32(params.height) - 1);
  let pIdx = py * w + px;
  var cell = trailIn[pIdx];
  if (a.species < 0.5) {
    cell.r = min(1.0, cell.r + 0.015);
    cell.g = max(0.0, cell.g - 0.02);
  } else {
    cell.g = min(1.0, cell.g + 0.015);
    cell.r = max(0.0, cell.r - 0.02);
  }
  trailIn[pIdx] = cell;
}

@compute @workgroup_size(8, 8)
fn diffuse(@builtin(global_invocation_id) id: vec3<u32>) {
  let w = i32(params.width);
  let h = i32(params.height);
  let x = i32(id.x);
  let y = i32(id.y);
  if (x >= w || y >= h) { return; }
  let pos = vec2<f32>(f32(x), f32(y));

  // 3x3 box blur с билинейной выборкой
  var sum = vec2<f32>(0.0);
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      sum += sampleTrailBilinear(f32(x) + f32(dx) * 0.8, f32(y) + f32(dy) * 0.8).rg;
    }
  }
  var blurred = (sum / 9.0) * params.evaporation;

  var attractField = 0.0;
  var toxinField = 0.0;

  // Ресурсные узлы: слабое притяжение со smoothstep-фоллоффом;
  // узел под владельцем светится и тянет сильнее - территория "работает"
  for (var n = 0u; n < params.nodeCount; n++) {
    let nd = nodes[n];
    let R = nd.radius * 2.2;
    let d = distance(pos, vec2<f32>(nd.x, nd.y));
    if (d < R) {
      let f = 1.0 - d / R;
      let boost = select(1.0, 1.45, nd.owner > 0.5);
      attractField = max(attractField, f * f * (3.0 - 2.0 * f) * 0.45 * boost);
    }
  }

  // Маяки с плавным угасанием ttl/maxTtl (раньше висели обрывками)
  for (var b = 0u; b < params.beaconCount; b++) {
    let bc = beacons[b];
    let fade = bc.ttlAlpha;
    let R = bc.radius;
    let d = distance(pos, vec2<f32>(bc.x, bc.y));
    let R2 = R * 1.8;
    if (d < R2 && bc.kind > 0.0) {
      let f = 1.0 - d / R2;
      let s = f * f * (3.0 - 2.0 * f) * fade;
      if (bc.kind > 1.5) {
        // ИИ-маяк: вражеское поле (отрицательный b), scent только в видимом радиусе.
        // Доза мала: стационарный уровень = доза / (1 - испарение), иначе область
        // маяка насыщается в плоское белое пятно
        attractField = min(attractField, 0.0) - s * 0.9;
        if (d < R) {
          blurred.g = min(1.0, blurred.g + s * 0.004);
        }
      } else {
        // Аттрактор игрока
        attractField = max(attractField, s * 1.4);
      }
    } else if (d < R && bc.kind < 0.0) {
      // Токсин: выжигает вражеский след, небольшой урон своему
      let f = 1.0 - d / R;
      let s = f * f * (3.0 - 2.0 * f) * fade;
      toxinField = max(toxinField, s * 1.4);
      blurred.g *= (1.0 - s * 0.18);
      blurred.r *= (1.0 - s * 0.03);
    }
  }

  trailOut[y * w + x] = vec4<f32>(blurred.x, blurred.y, attractField, toxinField);
}

@compute @workgroup_size(1)
fn sampleNodes(@builtin(global_invocation_id) id: vec3<u32>) {
  let nIdx = id.x;
  if (nIdx >= params.nodeCount) { return; }

  let nd = nodes[nIdx];
  let w = i32(params.width);
  let h = i32(params.height);
  let cx = i32(nd.x);
  let cy = i32(nd.y);

  var acc = vec2<f32>(0.0);
  var count = 0.0;
  for (var dy = -12; dy <= 12; dy += 4) {
    for (var dx = -12; dx <= 12; dx += 4) {
      let sx = clamp(cx + dx, 0, w - 1);
      let sy = clamp(cy + dy, 0, h - 1);
      acc += trailOut[sy * w + sx].rg;
      count += 1.0;
    }
  }
  nodeStats[nIdx] = acc / count;
}

// ============================ RENDER ============================

struct VsOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vertMain(@builtin(vertex_index) vi: u32) -> VsOut {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0)
  );
  var uvs = array<vec2<f32>, 3>(
    vec2<f32>(0.0,  1.0),
    vec2<f32>(2.0,  1.0),
    vec2<f32>(0.0, -1.0)
  );
  var out: VsOut;
  out.pos = vec4<f32>(positions[vi], 0.0, 1.0);
  out.uv = uvs[vi];
  return out;
}

@group(0) @binding(0) var<uniform> rParams: SimParams;
@group(0) @binding(1) var<storage, read> renderTrail: array<vec4<f32>>;

fn sampleRender(x: i32, y: i32) -> vec4<f32> {
  let w = i32(rParams.width);
  let h = i32(rParams.height);
  return renderTrail[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)];
}

// ---------- Палитры 5 шкал бытия: фон, штамм игрока, штамм врага ----------

fn bgPalette(sc: f32) -> vec3<f32> {
  var c = vec3<f32>(0.030, 0.090, 0.130); // 1: глубина первичной капли
  if (sc > 1.5 && sc < 2.5) { c = vec3<f32>(0.140, 0.030, 0.050); } // 2: ткань сосуда
  else if (sc > 2.5 && sc < 3.5) { c = vec3<f32>(0.020, 0.080, 0.160); } // 3: чернильный океан
  else if (sc > 3.5 && sc < 4.5) { c = vec3<f32>(0.130, 0.060, 0.030); } // 4: магма разлома
  else if (sc > 4.5) { c = vec3<f32>(0.060, 0.030, 0.140); } // 5: фиолетовая пустота фрактала
  return c;
}

fn playerPalette(sc: f32) -> vec3<f32> {
  var c = vec3<f32>(0.15, 0.95, 0.88); // 1: неон-циан
  if (sc > 1.5 && sc < 2.5) { c = vec3<f32>(0.15, 0.85, 0.60); } // 2: тил-зелёный паразита
  else if (sc > 2.5 && sc < 3.5) { c = vec3<f32>(0.20, 0.55, 1.00); } // 3: глубоководный синий
  else if (sc > 3.5 && sc < 4.5) { c = vec3<f32>(1.00, 0.55, 0.15); } // 4: тектоническая магма
  else if (sc > 4.5) { c = vec3<f32>(0.66, 0.42, 1.00); } // 5: фрактальный фиолет
  return c;
}

fn enemyPalette(sc: f32) -> vec3<f32> {
  var c = vec3<f32>(0.75, 0.20, 1.00); // 1: фиолетовый мицелий
  if (sc > 1.5 && sc < 2.5) { c = vec3<f32>(1.00, 0.18, 0.50); } // 2: иммунный багровый
  else if (sc > 2.5 && sc < 3.5) { c = vec3<f32>(0.85, 0.25, 1.00); } // 3: медуза-виолет
  else if (sc > 3.5 && sc < 4.5) { c = vec3<f32>(0.60, 0.16, 1.00); } // 4: протоплазма разлома
  else if (sc > 4.5) { c = vec3<f32>(1.00, 0.88, 0.60); } // 5: золото пустоты
  return c;
}

@fragment
fn fragMain(in: VsOut) -> @location(0) vec4<f32> {
  let w = i32(rParams.width);
  let h = i32(rParams.height);
  let fragCoord = in.uv * vec2<f32>(rParams.width, rParams.height);
  let xi = clamp(i32(fragCoord.x), 0, w - 1);
  let yi = clamp(i32(fragCoord.y), 0, h - 1);
  let cell = renderTrail[yi * w + xi];

  let palP = playerPalette(rParams.scaleId);
  let palE = enemyPalette(rParams.scaleId);

  // Фон среды: палитра текущего масштаба
  var col = bgPalette(rParams.scaleId);

  // Редкий звёздный шум
  let starCell = floor(fragCoord / 3.0);
  let sh = hash21(starCell);
  if (sh > 0.997) {
    let tw = 0.6 + 0.4 * sin(rParams.time * 2.0 + sh * 400.0);
    col += vec3<f32>(0.55, 0.65, 0.8) * ((sh - 0.997) / 0.003) * 0.5 * tw;
  }

  // Живой фон биома: у каждой шкалы свой дышащий узор среды
  if (rParams.scaleId < 1.5) {
    // Капля: медленные конвекционные облака жижи
    let drift = (0.5 + 0.5 * sin(fragCoord.x * 0.020 + rParams.time * 0.40))
      * (0.5 + 0.5 * sin(fragCoord.y * 0.027 - rParams.time * 0.30));
    col += vec3<f32>(0.02, 0.10, 0.13) * (0.4 + 0.8 * drift);
  } else if (rParams.scaleId > 1.5 && rParams.scaleId < 2.5) {
    // Кровеносный тракт: пульсирующие ленты ткани
    let band = 0.5 + 0.5 * sin(fragCoord.y * 0.045 + sin(fragCoord.x * 0.020 + rParams.time * 0.6) * 2.0);
    col += vec3<f32>(0.30, 0.045, 0.09) * (0.25 + 0.40 * band);
  } else if (rParams.scaleId > 2.5 && rParams.scaleId < 3.5) {
    // Внутренний океан: течения светящегося планктона
    let sw = sin(fragCoord.x * 0.030 + sin(fragCoord.y * 0.040 + rParams.time * 0.5) * 2.5 - rParams.time * 0.7);
    col += vec3<f32>(0.03, 0.15, 0.32) * (0.30 + 0.35 * sw);
  } else if (rParams.scaleId > 3.5 && rParams.scaleId < 4.5) {
    // Континентальный разлом: мерцающие магмовые жилы
    let cellId = floor(fragCoord / 22.0);
    let vein = pow(hash21(cellId), 14.0);
    let flick = 0.6 + 0.4 * sin(rParams.time * 2.2 + hash21(cellId + 7.0) * 40.0);
    col += vec3<f32>(0.50, 0.18, 0.03) * vein * flick * 3.0;
  } else {
    // Фрактал: расходящиеся кольца бесконечности
    let rr = distance(fragCoord, vec2<f32>(rParams.width * 0.5, rParams.height * 0.5));
    let ring = 0.5 + 0.5 * sin(rr * 0.09 - rParams.time * 1.6);
    col += vec3<f32>(0.15, 0.07, 0.33) * (0.20 + 0.65 * ring);
  }

  // Био-штаммы Physarum: живое люминесцентное поле игрока и токсичное поле врага
  let pDensity = cell.r;
  let eDensity = cell.g;
  col += palP * (pDensity * 0.12 + pow(pDensity, 1.8) * 0.22);
  col += palE * (eDensity * 0.09 + pow(eDensity, 1.8) * 0.18);

  // Поля маяков: аттрактор игрока (b > 0) и ИИ-маяк (b < 0)
  col += vec3<f32>(0.10, 0.32, 0.38) * max(cell.b, 0.0) * 0.12;
  col += vec3<f32>(0.35, 0.12, 0.55) * max(-cell.b, 0.0) * 0.12;

  // Поле токсина: тёмно-красная синусоидальная пульсация
  let ripple = 0.5 + 0.5 * sin(rParams.time * 2.6 - fragCoord.x * 0.05 + fragCoord.y * 0.04);
  col += vec3<f32>(0.45, 0.05, 0.10) * cell.a * (0.5 + 0.5 * ripple);

  // Tone-mapping: Reinhard -> gamma
  col = col / (col + vec3<f32>(1.0));
  col = pow(col, vec3<f32>(0.88));

  // Виньетка
  let vq = in.uv * (vec2<f32>(1.0) - in.uv.yx) * 18.0;
  let vig = pow(clamp(vq.x * vq.y, 0.0, 1.0), 0.22);
  col *= vig;

  return vec4<f32>(col, 1.0);
}

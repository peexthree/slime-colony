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
  camDeltaX: f32, // смещение камеры в пикселях симулятора
  camDeltaY: f32, // смещение камеры в пикселях симулятора
  pad0: f32,
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
  if (x < 0.0 || x >= f32(w) || y < 0.0 || y >= f32(h)) {
    return vec4<f32>(0.0);
  }
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
  let gid = id.x;
  if (gid >= params.agentCount) { return; }
  // При снижении качества оба штамма (0..half-1 и half..total-1) масштабируются пропорционально 50/50
  let totalHalf = arrayLength(&agents) / 2u;
  let activeHalf = max(1u, params.agentCount / 2u);
  let idx = select(totalHalf + (gid - activeHalf), gid, gid < activeHalf);

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

  // Отражение от границ поля со случайным шумом и сдвиг по камере (мировой якорь)
  a.x = a.x - params.camDeltaX;
  a.y = a.y - params.camDeltaY;
  let fieldW = params.width;
  let fieldH = params.height;
  if (a.x < 1.0) { a.x = a.x + fieldW - 2.0; }
  if (a.x >= fieldW - 1.0) { a.x = a.x - fieldW + 2.0; }
  if (a.y < 1.0) { a.y = a.y + fieldH - 2.0; }
  if (a.y >= fieldH - 1.0) { a.y = a.y - fieldH + 2.0; }

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

  // 3x3 box blur с билинейной выборкой и скроллом камеры (мировой якорь)
  var sum = vec2<f32>(0.0);
  let sx = f32(x) + params.camDeltaX;
  let sy = f32(y) + params.camDeltaY;
  for (var dy = -1; dy <= 1; dy++) {
    for (var dx = -1; dx <= 1; dx++) {
      sum += sampleTrailBilinear(sx + f32(dx) * 0.8, sy + f32(dy) * 0.8).rg;
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
  if (nd.x < 0.0 || nd.x >= params.width || nd.y < 0.0 || nd.y >= params.height) {
    nodeStats[nIdx] = vec2<f32>(0.0);
    return;
  }
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

// ---------- Палитры 15 локаций: фон, штамм игрока, штамм врага ----------

fn bgPalette(sc: f32) -> vec3<f32> {
  var c = vec3<f32>(0.030, 0.090, 0.130); // 1: глубина первичной капли
  if (sc > 1.5 && sc < 2.5) { c = vec3<f32>(0.050, 0.100, 0.030); } // 2: мох агары
  else if (sc > 2.5 && sc < 3.5) { c = vec3<f32>(0.140, 0.030, 0.050); } // 3: ткань сосуда
  else if (sc > 3.5 && sc < 4.5) { c = vec3<f32>(0.030, 0.090, 0.110); } // 4: белёсая лимфа
  else if (sc > 4.5 && sc < 5.5) { c = vec3<f32>(0.020, 0.080, 0.160); } // 5: чернильный океан
  else if (sc > 5.5 && sc < 6.5) { c = vec3<f32>(0.090, 0.090, 0.110); } // 6: костная пыль
  else if (sc > 6.5 && sc < 7.5) { c = vec3<f32>(0.050, 0.020, 0.120); } // 7: синаптическая тьма
  else if (sc > 7.5 && sc < 8.5) { c = vec3<f32>(0.100, 0.070, 0.020); } // 8: выдох наружу
  else if (sc > 8.5 && sc < 9.5) { c = vec3<f32>(0.020, 0.100, 0.060); } // 9: сумрак тайги
  else if (sc > 9.5 && sc < 10.5) { c = vec3<f32>(0.110, 0.050, 0.020); } // 10: ржавая пыль
  else if (sc > 10.5 && sc < 11.5) { c = vec3<f32>(0.130, 0.060, 0.030); } // 11: магма разлома
  else if (sc > 11.5 && sc < 12.5) { c = vec3<f32>(0.020, 0.090, 0.130); } // 12: полярный лёд
  else if (sc > 12.5 && sc < 13.5) { c = vec3<f32>(0.020, 0.120, 0.150); } // 13: небесная мгла
  else if (sc > 13.5 && sc < 14.5) { c = vec3<f32>(0.100, 0.030, 0.120); } // 14: ионная буря
  else if (sc > 14.5) { c = vec3<f32>(0.060, 0.030, 0.140); } // 15: фиолетовая пустота фрактала
  return c;
}

fn playerPalette(sc: f32) -> vec3<f32> {
  var c = vec3<f32>(0.15, 0.95, 0.88); // 1: неон-циан
  if (sc > 1.5 && sc < 2.5) { c = vec3<f32>(0.60, 0.90, 0.43); } // 2: лайм агары
  else if (sc > 2.5 && sc < 3.5) { c = vec3<f32>(0.34, 0.90, 0.66); } // 3: тил паразита
  else if (sc > 3.5 && sc < 4.5) { c = vec3<f32>(0.22, 0.74, 0.97); } // 4: небесный поток
  else if (sc > 4.5 && sc < 5.5) { c = vec3<f32>(0.30, 0.55, 1.00); } // 5: глубоководный синий
  else if (sc > 5.5 && sc < 6.5) { c = vec3<f32>(0.89, 0.91, 0.94); } // 6: костный фарфор
  else if (sc > 6.5 && sc < 7.5) { c = vec3<f32>(0.55, 0.36, 0.96); } // 7: синаптический фиолет
  else if (sc > 7.5 && sc < 8.5) { c = vec3<f32>(0.98, 0.75, 0.14); } // 8: янтарный выдох
  else if (sc > 8.5 && sc < 9.5) { c = vec3<f32>(0.20, 0.83, 0.60); } // 9: изумруд спор
  else if (sc > 9.5 && sc < 10.5) { c = vec3<f32>(0.98, 0.45, 0.09); } // 10: ржавый закат
  else if (sc > 10.5 && sc < 11.5) { c = vec3<f32>(1.00, 0.54, 0.24); } // 11: тектоническая магма
  else if (sc > 11.5 && sc < 12.5) { c = vec3<f32>(0.49, 0.83, 0.99); } // 12: ледяной блик
  else if (sc > 12.5 && sc < 13.5) { c = vec3<f32>(0.65, 0.95, 0.99); } // 13: небесная пена
  else if (sc > 13.5 && sc < 14.5) { c = vec3<f32>(0.94, 0.67, 0.99); } // 14: ионная магента
  else if (sc > 14.5) { c = vec3<f32>(0.66, 0.42, 1.00); } // 15: фрактальный фиолет
  return c;
}

fn enemyPalette(sc: f32) -> vec3<f32> {
  var c = vec3<f32>(0.75, 0.20, 1.00); // 1: фиолетовый мицелий
  if (sc > 1.5 && sc < 2.5) { c = vec3<f32>(1.00, 0.30, 0.20); } // 2: гниль агары
  else if (sc > 2.5 && sc < 3.5) { c = vec3<f32>(1.00, 0.18, 0.50); } // 3: иммунный багровый
  else if (sc > 3.5 && sc < 4.5) { c = vec3<f32>(0.90, 0.90, 0.85); } // 4: лимфоциты-жнецы
  else if (sc > 4.5 && sc < 5.5) { c = vec3<f32>(0.85, 0.25, 1.00); } // 5: медуза-виолет
  else if (sc > 5.5 && sc < 6.5) { c = vec3<f32>(0.85, 0.88, 0.92); } // 6: остеокласты
  else if (sc > 6.5 && sc < 7.5) { c = vec3<f32>(0.40, 0.90, 1.00); } // 7: нейроимпульсы
  else if (sc > 7.5 && sc < 8.5) { c = vec3<f32>(1.00, 0.80, 0.40); } // 8: пыль ветра
  else if (sc > 8.5 && sc < 9.5) { c = vec3<f32>(0.50, 1.00, 0.55); } // 9: хищные споры
  else if (sc > 9.5 && sc < 10.5) { c = vec3<f32>(1.00, 0.45, 0.15); } // 10: ржавые псы
  else if (sc > 10.5 && sc < 11.5) { c = vec3<f32>(0.60, 0.16, 1.00); } // 11: протоплазма разлома
  else if (sc > 11.5 && sc < 12.5) { c = vec3<f32>(0.60, 0.90, 1.00); } // 12: ледяные хищники
  else if (sc > 12.5 && sc < 13.5) { c = vec3<f32>(0.40, 0.95, 1.00); } // 13: небесные пиявки
  else if (sc > 13.5 && sc < 14.5) { c = vec3<f32>(1.00, 0.40, 0.85); } // 14: авроральные полчища
  else if (sc > 14.5) { c = vec3<f32>(1.00, 0.88, 0.60); } // 15: золото пустоты
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

  // Живой фон биома: у каждой локации свой дышащий узор среды
  if (rParams.scaleId < 1.5) {
    // 1 Капля: медленные конвекционные облака жижи
    let drift = (0.5 + 0.5 * sin(fragCoord.x * 0.020 + rParams.time * 0.40))
      * (0.5 + 0.5 * sin(fragCoord.y * 0.027 - rParams.time * 0.30));
    col += vec3<f32>(0.02, 0.10, 0.13) * (0.4 + 0.8 * drift);
  } else if (rParams.scaleId > 1.5 && rParams.scaleId < 2.5) {
    // 2 Агар-матрица: колониальные кольца культуры
    let d = distance(fragCoord, vec2<f32>(rParams.width * 0.5, rParams.height * 0.5));
    let ring = 0.5 + 0.5 * sin(d * 0.055 - rParams.time * 0.9);
    col += vec3<f32>(0.10, 0.22, 0.06) * (0.25 + 0.55 * ring);
  } else if (rParams.scaleId > 2.5 && rParams.scaleId < 3.5) {
    // 3 Кровеносный тракт: пульсирующие ленты ткани
    let band = 0.5 + 0.5 * sin(fragCoord.y * 0.045 + sin(fragCoord.x * 0.020 + rParams.time * 0.6) * 2.0);
    col += vec3<f32>(0.30, 0.045, 0.09) * (0.25 + 0.40 * band);
  } else if (rParams.scaleId > 3.5 && rParams.scaleId < 4.5) {
    // 4 Лимфа: медленные белёсые реки к фильтрам
    let river = 0.5 + 0.5 * sin(fragCoord.x * 0.018 + sin(fragCoord.y * 0.030 + rParams.time * 0.5) * 2.2);
    col += vec3<f32>(0.16, 0.20, 0.22) * (0.25 + 0.45 * river);
  } else if (rParams.scaleId > 4.5 && rParams.scaleId < 5.5) {
    // 5 Внутренний океан: течения светящегося планктона
    let sw = sin(fragCoord.x * 0.030 + sin(fragCoord.y * 0.040 + rParams.time * 0.5) * 2.5 - rParams.time * 0.7);
    col += vec3<f32>(0.03, 0.15, 0.32) * (0.30 + 0.35 * sw);
  } else if (rParams.scaleId > 5.5 && rParams.scaleId < 6.5) {
    // 6 Костный лабиринт: хрящевые арки и тени остова
    let arch = max(
      0.5 + 0.5 * sin(fragCoord.x * 0.022),
      0.5 + 0.5 * sin(fragCoord.y * 0.028 + rParams.time * 0.4)
    );
    col += vec3<f32>(0.16, 0.16, 0.19) * (0.30 + 0.40 * arch);
  } else if (rParams.scaleId > 6.5 && rParams.scaleId < 7.5) {
    // 7 Синаптическая пустошь: вспышки нейро-узлов
    let cellId = floor(fragCoord / 26.0);
    let spark = pow(hash21(cellId + floor(rParams.time * 1.5)), 12.0);
    col += vec3<f32>(0.35, 0.22, 0.65) * spark * 2.2;
  } else if (rParams.scaleId > 7.5 && rParams.scaleId < 8.5) {
    // 8 Выдох: поднимающиеся потоки тёплого воздуха
    let wisp = (0.5 + 0.5 * sin(fragCoord.x * 0.045 + rParams.time * 0.8))
      * (0.5 + 0.5 * sin(fragCoord.y * 0.020 - rParams.time * 0.6));
    col += vec3<f32>(0.24, 0.17, 0.05) * (0.30 + 0.50 * wisp);
  } else if (rParams.scaleId > 8.5 && rParams.scaleId < 9.5) {
    // 9 Грибные тайги: дышащие колоны спор
    let spore = (0.5 + 0.5 * sin(fragCoord.x * 0.075 + sin(fragCoord.y * 0.018 - rParams.time * 0.5) * 2.0));
    col += vec3<f32>(0.05, 0.26, 0.14) * (0.30 + 0.45 * spore);
  } else if (rParams.scaleId > 9.5 && rParams.scaleId < 10.5) {
    // 10 Ржавые дюны: ползучие гребни окиси
    let dune = 0.5 + 0.5 * sin(fragCoord.x * 0.020 + sin(fragCoord.y * 0.016 + rParams.time * 0.3) * 3.0);
    col += vec3<f32>(0.26, 0.12, 0.03) * (0.25 + 0.45 * dune);
  } else if (rParams.scaleId > 10.5 && rParams.scaleId < 11.5) {
    // 11 Разлом: мерцающие магмовые жилы
    let cellId = floor(fragCoord / 22.0);
    let vein = pow(hash21(cellId), 14.0);
    let flick = 0.6 + 0.4 * sin(rParams.time * 2.2 + hash21(cellId + 7.0) * 40.0);
    col += vec3<f32>(0.50, 0.18, 0.03) * vein * flick * 3.0;
  } else if (rParams.scaleId > 11.5 && rParams.scaleId < 12.5) {
    // 12 Полярный щит: трещины льда и северное мерцание
    let crack = pow(hash21(floor(fragCoord / 30.0)), 9.0);
    let shiver = 0.6 + 0.4 * sin(rParams.time * 1.4 + fragCoord.y * 0.02);
    col += vec3<f32>(0.12, 0.26, 0.36) * crack * shiver * 2.0;
  } else if (rParams.scaleId > 12.5 && rParams.scaleId < 13.5) {
    // 13 Небесный планктон: парящие живые облака
    let mote = pow(hash21(floor(fragCoord / 40.0) + vec2<f32>(floor(rParams.time * 0.4), 0.0)), 8.0);
    col += vec3<f32>(0.10, 0.30, 0.34) * mote * 1.6;
  } else if (rParams.scaleId > 13.5 && rParams.scaleId < 14.5) {
    // 14 Ионосфера: авроральные занавеси
    let curtain = 0.5 + 0.5 * sin(fragCoord.y * 0.045 + rParams.time * 1.2 + sin(fragCoord.x * 0.012) * 3.5);
    col += vec3<f32>(0.20, 0.10, 0.30) * (0.25 + 0.55 * curtain);
  } else {
    // 15 Фрактал: расходящиеся кольца бесконечности
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

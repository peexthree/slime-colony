// LUMIVORE: Tactical Petri-Dish Radar & Bio-Scanner
// Высокоточный радар чашки Петри: реальные био-метки врагов, титанов, био-узлов,
// сканирующий луч с фосфорным послесвечением и индикацией направления.
import { t } from '../i18n';

export interface RadarNode {
  x: number;
  y: number;
  owner: -1 | 0 | 1;
  kind: string;
  capture: number;
}

export interface RadarEnemy {
  x: number;
  y: number;
  type: string;
  elite: string | null;
  titan?: boolean;
}

export class PetriRadar {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private badge: HTMLElement | null = null;
  private sweepAngle = 0;
  private blipPings = new Map<number, number>(); // id/hash -> ping intensity 0..1

  init(canvas: HTMLCanvasElement, badge?: HTMLElement | null): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.badge = badge ?? null;
  }

  update(
    dt: number,
    player: { x: number; y: number; dirX: number; dirY: number },
    enemies: RadarEnemy[],
    nodes: RadarNode[],
    worldW?: number,
    worldH?: number,
    scanRange = 850,
    anomalies?: { x: number; y: number; kind: string; warnT: number }[]
  ): void {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radarR = w / 2 - 12;

    // Продвижение угла сканирующего луча (полный оборот ~2.6 сек)
    this.sweepAngle = (this.sweepAngle + 2.4 * dt) % (Math.PI * 2);

    // Очистка с эффектом фосфорного затухания
    ctx.clearRect(0, 0, w, h);

    // 1. Подложка чашки Петри: глубокая био-линза
    const bgGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radarR);
    bgGrad.addColorStop(0, 'rgba(4, 18, 22, 0.88)');
    bgGrad.addColorStop(0.7, 'rgba(3, 14, 18, 0.92)');
    bgGrad.addColorStop(1, 'rgba(1, 8, 12, 0.96)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radarR, 0, Math.PI * 2);
    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.clip(); // Всё рисование остаётся строго внутри чашки Петри

    // 1.5. Отображение видимых границ чашки Петри (био-мембрана периметра)
    if (worldW && worldH) {
      ctx.save();
      ctx.strokeStyle = 'rgba(102, 252, 241, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#66fcf1';
      ctx.shadowBlur = 8;
      ctx.setLineDash([5, 4]);

      // Левая граница
      const leftDist = 0 - player.x;
      if (Math.abs(leftDist) <= scanRange) {
        const lx = cx + (leftDist / scanRange) * (radarR - 8);
        ctx.beginPath();
        ctx.moveTo(lx, 0); ctx.lineTo(lx, h);
        ctx.stroke();
      }
      // Правая граница
      const rightDist = worldW - player.x;
      if (Math.abs(rightDist) <= scanRange) {
        const rx = cx + (rightDist / scanRange) * (radarR - 8);
        ctx.beginPath();
        ctx.moveTo(rx, 0); ctx.lineTo(rx, h);
        ctx.stroke();
      }
      // Верхняя граница
      const topDist = 0 - player.y;
      if (Math.abs(topDist) <= scanRange) {
        const ty = cy + (topDist / scanRange) * (radarR - 8);
        ctx.beginPath();
        ctx.moveTo(0, ty); ctx.lineTo(w, ty);
        ctx.stroke();
      }
      // Нижняя граница
      const bottomDist = worldH - player.y;
      if (Math.abs(bottomDist) <= scanRange) {
        const by = cy + (bottomDist / scanRange) * (radarR - 8);
        ctx.beginPath();
        ctx.moveTo(0, by); ctx.lineTo(w, by);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Концентрические дальномерные кольца и координатные риски
    ctx.strokeStyle = 'rgba(0, 255, 157, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radarR * 0.33, 0, Math.PI * 2);
    ctx.arc(cx, cy, radarR * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    // Осевые риски
    ctx.beginPath();
    ctx.moveTo(cx, cy - radarR); ctx.lineTo(cx, cy + radarR);
    ctx.moveTo(cx - radarR, cy); ctx.lineTo(cx + radarR, cy);
    ctx.stroke();

    // 3. Сканирующий луч с веерным хвостом (фосфорный след)
    const sweepTrail = 0.55; // сектор затухания ~32 градуса
    const sweepGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radarR);
    sweepGrad.addColorStop(0, 'rgba(0, 255, 157, 0.45)');
    sweepGrad.addColorStop(1, 'rgba(0, 255, 157, 0.08)');

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radarR, this.sweepAngle - sweepTrail, this.sweepAngle, false);
    ctx.closePath();
    ctx.fillStyle = sweepGrad;
    ctx.fill();

    // Яркая кромка луча
    ctx.strokeStyle = 'rgba(102, 252, 241, 0.9)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.sweepAngle) * radarR, cy + Math.sin(this.sweepAngle) * radarR);
    ctx.stroke();

    // 4. Отрисовка био-узлов территории
    const nodeColors: Record<string, string> = {
      gen: '#39ff14', amp: '#66fcf1', magnet: '#ffb800', mutagen: '#ff2a85', incubator: '#b55cff',
    };
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dx = n.x - player.x;
      const dy = n.y - player.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Проверка прохождения луча для вспышки
      const diffA = Math.abs(((angle - this.sweepAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diffA < 0.12) this.blipPings.set(1000 + i, 1.0);
      const ping = Math.max(0, (this.blipPings.get(1000 + i) ?? 0) - dt * 0.8);
      this.blipPings.set(1000 + i, ping);

      const rDist = Math.min(1, dist / scanRange) * (radarR - 8);
      const nx = cx + Math.cos(angle) * rDist;
      const ny = cy + Math.sin(angle) * rDist;

      const baseColor = n.owner === 1 ? '#66fcf1' : n.owner === -1 ? '#ff3b4e' : (nodeColors[n.kind] || '#b55cff');

      ctx.save();
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5 + ping * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = baseColor;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 6 + ping * 8;
      ctx.fill();

      // Ореол владения / захвата
      ctx.beginPath();
      ctx.arc(nx, ny, 6, 0, Math.PI * 2);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // 4.5. Отрисовка биологических аномалий (Гнёзда спор, Кислотные зоны)
    if (anomalies) {
      for (const a of anomalies) {
        if (a.kind === 'bloom') continue;
        const dx = a.x - player.x;
        const dy = a.y - player.y;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const rDist = dist > scanRange ? (radarR - 5) : (dist / scanRange) * (radarR - 8);
        const ax = cx + Math.cos(angle) * rDist;
        const ay = cy + Math.sin(angle) * rDist;
        const col = a.kind === 'cocoon' ? '#a3e635' : '#f59e0b';
        ctx.save();
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ax, ay, a.kind === 'cocoon' ? 4 : 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 5. Отрисовка врагов, элит, боссов и титанов
    let enemyCountInRange = 0;
    let hasBoss = false;
    let hasTitan = false;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const isBoss = e.type === 'boss';
      const isTitan = !!e.titan;
      const isElite = !!e.elite;

      if (isBoss) hasBoss = true;
      if (isTitan) hasTitan = true;

      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      if (dist <= scanRange) enemyCountInRange++;

      // Проверка угла сканирующего луча
      const diffA = Math.abs(((angle - this.sweepAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diffA < 0.15) this.blipPings.set(i, 1.0);
      const ping = Math.max(0, (this.blipPings.get(i) ?? 0) - dt * 1.1);
      this.blipPings.set(i, ping);

      // Позиция на радаре: если враг за пределами радиуса, прижимаем к кромке с маркером
      const isOffscreen = dist > scanRange;
      const rDist = isOffscreen ? (radarR - 5) : (dist / scanRange) * (radarR - 8);
      const ex = cx + Math.cos(angle) * rDist;
      const ey = cy + Math.sin(angle) * rDist;

      ctx.save();
      if (isTitan || isBoss) {
        // Босс / Титан: колоссальный пульсирующий маркер
        const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.25;
        const bColor = isTitan ? '#ffd700' : '#ff2a85';
        ctx.fillStyle = bColor;
        ctx.shadowColor = bColor;
        ctx.shadowBlur = 12 + ping * 10;
        ctx.beginPath();
        ctx.arc(ex, ey, (isTitan ? 6.5 : 5.5) * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = bColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(ex, ey, 10 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else if (isElite) {
        // Элита: золотой ромбовидный маркер
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 6 + ping * 6;
        ctx.beginPath();
        ctx.arc(ex, ey, 3.8 + ping * 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Обычные враги
        if (isOffscreen && !isBoss && !isTitan) {
          ctx.restore();
          continue; // Не загромождаем кромку обычными мелкими личинками
        }
        ctx.fillStyle = ping > 0.3 ? '#ff8599' : '#ff3b4e';
        ctx.shadowColor = '#ff3b4e';
        ctx.shadowBlur = ping * 7;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.2 + ping * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. Центр: Игрок (Светляк / Организм)
    ctx.save();
    ctx.fillStyle = '#66fcf1';
    ctx.shadowColor = '#66fcf1';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Направление взгляда / движения игрока
    const pLen = Math.hypot(player.dirX, player.dirY) || 1;
    const pdx = player.dirX / pLen;
    const pdy = player.dirY / pLen;
    ctx.strokeStyle = '#66fcf1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + pdx * 9, cy + pdy * 9);
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // Снятие клип-маски

    // 7. Обновление бейджа радара
    if (this.badge) {
      if (hasTitan) {
        this.badge.textContent = t('radar_titan');
        this.badge.style.color = '#ffd700';
        this.badge.style.borderColor = 'rgba(255, 215, 0, 0.6)';
        this.badge.style.textShadow = '0 0 8px rgba(255, 215, 0, 0.8)';
      } else if (hasBoss) {
        this.badge.textContent = t('radar_boss');
        this.badge.style.color = '#ff3b4e';
        this.badge.style.borderColor = 'rgba(255, 59, 78, 0.6)';
        this.badge.style.textShadow = '0 0 8px rgba(255, 59, 78, 0.8)';
      } else {
        this.badge.textContent = t('radar_threats', { n: enemyCountInRange });
        this.badge.style.color = '#00ff9d';
        this.badge.style.borderColor = 'rgba(0, 255, 157, 0.35)';
        this.badge.style.textShadow = '0 0 6px rgba(0, 255, 157, 0.6)';
      }
    }
  }
}

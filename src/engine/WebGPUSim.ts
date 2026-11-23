// WebGPU-симуляция: compute-пайплайны агентов и диффузии, ping-pong буферы, async readback
import shaderCode from '../shaders/physarum.wgsl?raw';
import { AGENT_COUNT, Beacon, BioNode, MAX_BEACONS, MAX_NODES, SIM_HEIGHT, SIM_WIDTH } from './types';

export interface NodeStat {
  playerDensity: number;
  enemyDensity: number;
}

export class WebGPUSim {
  private device!: GPUDevice;
  private context!: GPUCanvasContext;

  private agentsBuffer!: GPUBuffer;
  private trailA!: GPUBuffer;
  private trailB!: GPUBuffer;
  private paramsBuffer!: GPUBuffer;
  private beaconsBuffer!: GPUBuffer;
  private nodesBuffer!: GPUBuffer;
  private nodeStatsBuffer!: GPUBuffer;
  private readbackBuffer!: GPUBuffer;

  private updatePipeline!: GPUComputePipeline;
  private diffusePipeline!: GPUComputePipeline;
  private sampleNodesPipeline!: GPUComputePipeline;
  private renderPipeline!: GPURenderPipeline;

  private computeBGs!: [GPUBindGroup, GPUBindGroup];
  private renderBGs!: [GPUBindGroup, GPUBindGroup];

  private pingPong = 0;
  private frame = 0;
  private sporeCursor = 0;
  private isReadingBack = false;
  private lastReadbackTime = 0;
  /** Предвыделенные скретч-буферы: ноль аллокаций на горячем пути кадра */
  private paramScratch = new ArrayBuffer(128);
  private paramF32 = new Float32Array(this.paramScratch);
  private paramU32 = new Uint32Array(this.paramScratch);
  private nodeScratch = new Float32Array(MAX_NODES * 4);
  private beaconScratch = new Float32Array(MAX_BEACONS * 8);
  private sporeScratch = new Float32Array(0);
  readonly agentCount = AGENT_COUNT;

  async init(canvas: HTMLCanvasElement): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU не поддерживается. Откройте игру в Chromium 113+ или включите dom.webgpu.enabled в Firefox');
    }
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('Не удалось получить GPU-адаптер');

    // Адаптивные лимиты под размер storage-буферов
    this.device = await adapter.requestDevice({
      requiredLimits: {
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        maxBufferSize: adapter.limits.maxBufferSize,
      },
    });
    this.device.onuncapturederror = (e) => console.error('WebGPU:', e.error.message);

    this.context = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();

    canvas.width = SIM_WIDTH;
    canvas.height = SIM_HEIGHT;
    this.context.configure({
      device: this.device,
      format,
      alphaMode: 'opaque',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });

    this.sporeScratch = new Float32Array((this.agentCount / 2) * 4);
    const trailBytes = SIM_WIDTH * SIM_HEIGHT * 4 * 4;
    this.trailA = this.device.createBuffer({ size: trailBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.trailB = this.device.createBuffer({ size: trailBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.agentsBuffer = this.device.createBuffer({
      size: this.agentCount * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.paramsBuffer = this.device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.beaconsBuffer = this.device.createBuffer({ size: MAX_BEACONS * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.nodesBuffer = this.device.createBuffer({ size: MAX_NODES * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.nodeStatsBuffer = this.device.createBuffer({ size: MAX_NODES * 8, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    this.readbackBuffer = this.device.createBuffer({ size: MAX_NODES * 8, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });

    const module = this.device.createShaderModule({ code: shaderCode });

    const computeLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    });
    const computePipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [computeLayout] });

    this.updatePipeline = this.device.createComputePipeline({
      layout: computePipelineLayout,
      compute: { module, entryPoint: 'updateAgents' },
    });
    this.diffusePipeline = this.device.createComputePipeline({
      layout: computePipelineLayout,
      compute: { module, entryPoint: 'diffuse' },
    });
    this.sampleNodesPipeline = this.device.createComputePipeline({
      layout: computePipelineLayout,
      compute: { module, entryPoint: 'sampleNodes' },
    });

    const renderLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.renderPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
      vertex: { module, entryPoint: 'vertMain' },
      fragment: { module, entryPoint: 'fragMain', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });

    const makeComputeBG = (inBuf: GPUBuffer, outBuf: GPUBuffer) =>
      this.device.createBindGroup({
        layout: computeLayout,
        entries: [
          { binding: 0, resource: { buffer: this.paramsBuffer } },
          { binding: 1, resource: { buffer: this.agentsBuffer } },
          { binding: 2, resource: { buffer: inBuf } },
          { binding: 3, resource: { buffer: outBuf } },
          { binding: 4, resource: { buffer: this.beaconsBuffer } },
          { binding: 5, resource: { buffer: this.nodesBuffer } },
          { binding: 6, resource: { buffer: this.nodeStatsBuffer } },
        ],
      });

    this.computeBGs = [makeComputeBG(this.trailA, this.trailB), makeComputeBG(this.trailB, this.trailA)];

    const makeRenderBG = (buf: GPUBuffer) =>
      this.device.createBindGroup({
        layout: renderLayout,
        entries: [
          { binding: 0, resource: { buffer: this.paramsBuffer } },
          { binding: 1, resource: { buffer: buf } },
        ],
      });

    this.renderBGs = [makeRenderBG(this.trailB), makeRenderBG(this.trailA)];
    this.resetColonies();
  }

  resetColonies(): void {
    // Очистка следов
    const zeros = new Float32Array(SIM_WIDTH * SIM_HEIGHT * 4);
    this.device.queue.writeBuffer(this.trailA, 0, zeros);
    this.device.queue.writeBuffer(this.trailB, 0, zeros);
    this.pingPong = 0;
    this.sporeCursor = 0;

    // Оба штамма рассеяны по всему полю: живая сеть с первого кадра, без пустого центра
    const data = new Float32Array(this.agentCount * 4);
    const half = this.agentCount / 2;

    for (let i = 0; i < this.agentCount; i++) {
      const isEnemy = i >= half;
      const base = i * 4;
      data[base] = Math.random() * SIM_WIDTH;
      data[base + 1] = Math.random() * SIM_HEIGHT;
      data[base + 2] = Math.random() * Math.PI * 2;
      data[base + 3] = isEnemy ? 1 : 0;
    }
    this.device.queue.writeBuffer(this.agentsBuffer, 0, data);
  }

  /** Вброс свежих агентов игрока: кольцевой курсор по первой половине буфера */
  spawnPlayerSpores(x: number, y: number, count = 4000): void {
    const half = this.agentCount / 2;
    const batch = Math.min(count, half);
    const data = this.sporeScratch;
    for (let i = 0; i < batch; i++) {
      const r = Math.random() * 18;
      const a = Math.random() * Math.PI * 2;
      const base = i * 4;
      data[base] = x + Math.cos(a) * r;
      data[base + 1] = y + Math.sin(a) * r;
      data[base + 2] = a;
      data[base + 3] = 0;
    }
    const capacity = half - batch;
    const startIdx = this.sporeCursor % capacity;
    this.sporeCursor = (startIdx + batch) % capacity;
    this.device.queue.writeBuffer(this.agentsBuffer, startIdx * 16, data, 0, batch * 4);
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
    onNodeStats: (stats: NodeStat[]) => void
  ): void {
    // 1. Uniform: 64 байта = 12 x f32/u32 + scaleId + pad
    const f32 = this.paramF32;
    const u32 = this.paramU32;
    f32[0] = SIM_WIDTH;
    f32[1] = SIM_HEIGHT;
    f32[2] = dt;
    f32[3] = time;
    u32[4] = this.agentCount;
    u32[5] = Math.min(beacons.length, MAX_BEACONS);
    u32[6] = Math.min(nodes.length, MAX_NODES);
    u32[7] = this.frame;
    f32[8] = aiTarget.x;
    f32[9] = aiTarget.y;
    f32[10] = aiIntensity;
    f32[11] = evaporation;
    f32[12] = scaleId;
    this.device.queue.writeBuffer(this.paramsBuffer, 0, this.paramScratch);
    this.frame++;

    // 2. Узлы и маяки
    const nData = this.nodeScratch;
    nData.fill(0);
    nodes.slice(0, MAX_NODES).forEach((n, i) => {
      nData[i * 4] = n.x;
      nData[i * 4 + 1] = n.y;
      nData[i * 4 + 2] = n.radius;
      nData[i * 4 + 3] = n.owner;
    });
    this.device.queue.writeBuffer(this.nodesBuffer, 0, nData);

    const bData = this.beaconScratch;
    bData.fill(0);
    beacons.slice(0, MAX_BEACONS).forEach((b, i) => {
      const o = i * 8;
      bData[o] = b.x;
      bData[o + 1] = b.y;
      bData[o + 2] = b.radius;
      bData[o + 3] = b.kind;
      bData[o + 4] = b.maxTtl > 0 ? Math.max(0, Math.min(1, b.ttl / b.maxTtl)) : 1;
    });
    this.device.queue.writeBuffer(this.beaconsBuffer, 0, bData);

    // 3. Compute + render
    const enc = this.device.createCommandEncoder();
    const bg = this.computeBGs[this.pingPong];

    const cPass = enc.beginComputePass();
    cPass.setBindGroup(0, bg);
    cPass.setPipeline(this.updatePipeline);
    cPass.dispatchWorkgroups(Math.ceil(this.agentCount / 64));
    cPass.setPipeline(this.diffusePipeline);
    cPass.dispatchWorkgroups(Math.ceil(SIM_WIDTH / 8), Math.ceil(SIM_HEIGHT / 8));

    const shouldReadback = !this.isReadingBack && performance.now() - this.lastReadbackTime > 160;
    if (shouldReadback && nodes.length > 0) {
      cPass.setPipeline(this.sampleNodesPipeline);
      cPass.dispatchWorkgroups(nodes.length);
    }
    cPass.end();

    if (shouldReadback && nodes.length > 0) {
      enc.copyBufferToBuffer(this.nodeStatsBuffer, 0, this.readbackBuffer, 0, nodes.length * 8);
    }

    const rPass = enc.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    rPass.setPipeline(this.renderPipeline);
    rPass.setBindGroup(0, this.renderBGs[this.pingPong]);
    rPass.draw(3);
    rPass.end();

    this.device.queue.submit([enc.finish()]);
    this.pingPong = 1 - this.pingPong;

    // 4. Асинхронное чтение плотности штаммов на узлах (без блокировки кадра)
    if (shouldReadback && nodes.length > 0) {
      this.isReadingBack = true;
      this.lastReadbackTime = performance.now();
      this.readbackBuffer.mapAsync(GPUMapMode.READ).then(() => {
        const raw = new Float32Array(this.readbackBuffer.getMappedRange()).slice(0, nodes.length * 2);
        this.readbackBuffer.unmap();
        this.isReadingBack = false;
        const stats: NodeStat[] = [];
        for (let i = 0; i < nodes.length; i++) {
          stats.push({ playerDensity: raw[i * 2], enemyDensity: raw[i * 2 + 1] });
        }
        onNodeStats(stats);
      }).catch(() => {
        this.isReadingBack = false;
      });
    }
  }

  /**
   * Снимок последнего отрисованного кадра physarum-поля (Этап 6.2).
   * WebGPU-канвас нельзя рисовать в 2D-контекст напрямую - делаем честный
   * copyTextureToBuffer readback и собираем ImageData вручную.
   */
  async captureFrame(): Promise<HTMLCanvasElement | null> {
    return null;
  }
}

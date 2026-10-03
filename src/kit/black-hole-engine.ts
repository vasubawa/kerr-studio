import {
  ADAPTIVE_FRAG,
  BLUR_FRAG,
  COMPOSITE_FRAG,
  FIELD_FRAG,
  GEODESIC_FRAG,
  VOLUME_FRAG,
} from "./shaders";

export type BlackHoleQuality = "auto" | "performance" | "balanced" | "high";
export type FrequencyShift = "off" | "color" | "color+bright";

export const FREQUENCY_SHIFT_MODE: Record<FrequencyShift, number> = {
  off: 0,
  color: 1,
  "color+bright": 2,
};

export type BlackHoleOptions = {
  paused?: boolean;
  exposure?: number;
  glow?: number;
  contrast?: number;
  speed?: number;
  spin?: number;
  charge?: number;
  frequencyShift?: FrequencyShift;
  colorShift?: number;
  limb?: number;
  innerRadius?: number;
  outerRadius?: number;
  thickness?: number;
  temperature?: number;
  radiance?: number;
  stars?: number;
  haze?: number;
  density?: number;
  swirl?: number;
  lensing?: number;
  hopper?: number;
  reddening?: number;
  photonRingBoost?: number;
  horizonGlow?: number;
  starShift?: number;
  heatHaze?: number;
  innerFade?: number;
  tempFall?: number;
  tempPower?: number;
  saturation?: number;
  orbit?: number;
  vignette?: number;
  chromatic?: number;
  steps?: number;
  quality?: BlackHoleQuality;
};

export type CameraPose = {
  distance: number;
  azimuth: number;
  elevation: number;
  roll: number;
  shiftX: number;
  shiftY: number;
  film: number;
  exposure: number;
};

export const PRESETS: Record<string, CameraPose> = {
  // Movie-accurate Interstellar widescreen reference (sample/1.jpg & sample/image.png)
  INTERSTELLAR: {
    distance: 72.0,
    azimuth: 0.0,
    elevation: 0.08, // ~4.6° inclination
    roll: 0.0,
    shiftX: 0.0,
    shiftY: 0.0,
    film: 0.34,
    exposure: -0.75,
  },
  // Wide orbital shot with Dutch roll (sample/4Vv43ekp8QVwL95So7Z8sb.jpg)
  ORBITAL_WIDE: {
    distance: 58.0,
    azimuth: 0.08,
    elevation: 0.11,
    roll: -0.36,
    shiftX: -0.18,
    shiftY: 0.03,
    film: 0.35,
    exposure: -0.7,
  },
  // Centered close-up
  CENTERED: {
    distance: 38.0,
    azimuth: 0.0,
    elevation: 0.12,
    roll: 0.0,
    shiftX: 0.0,
    shiftY: 0.0,
    film: 0.35,
    exposure: -0.75,
  },
};

type ProgramInfo = {
  handle: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation>;
  values: Map<string, unknown>;
};

type RenderTarget = {
  framebuffer: WebGLFramebuffer;
  textures: WebGLTexture[];
  width: number;
  height: number;
};

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/** Prograde photon orbit in units of M. */
export function kerrProgradePhotonOrbit(spin: number): number {
  const a = Math.min(Math.max(Math.abs(spin), 0), 0.999);
  return 2 * (1 + Math.cos((2 / 3) * Math.acos(-a)));
}

/** Disk cut just outside the photon orbit so the inner ring hugs the shadow. */
export function kerrDiskInnerRadius(spin: number): number {
  return Math.round((kerrProgradePhotonOrbit(spin) + 0.1) * 100) / 100;
}

export class BlackHoleEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;
  private programs: Record<string, ProgramInfo> = {};
  private targets: RenderTarget[] = [];
  private blooms: [RenderTarget, RenderTarget][] = [];
  private field: RenderTarget | null = null;
  private movingLens: RenderTarget | null = null;
  private detailedLens: RenderTarget | null = null;
  private lens: RenderTarget | null = null;
  private scene: RenderTarget | null = null;
  private presentation: RenderTarget | null = null;

  private width = 0;
  private height = 0;
  private autoWidth = 1280;
  private refinedRows = 0;
  private geometryDirty = true;
  private frameDirty = true;
  private resizePending = true;

  private azimuth = 0;
  private elevation = (6 * Math.PI) / 180;
  private distance = 75;
  private cinematicPose: CameraPose | null = null;
  private lastPoseChange = -1e3;

  private options: Required<BlackHoleOptions> = {
    paused: false,
    exposure: -0.5,
    glow: 1.0,
    contrast: 10.0,
    speed: 0.65,
    spin: 0.6,
    charge: 0.0,
    frequencyShift: "color+bright",
    colorShift: 0.4,
    limb: 0.0,
    innerRadius: 2.29,
    outerRadius: 36.0,
    thickness: 0.035,
    temperature: 7200.0,
    radiance: 8.0,
    stars: 1.3,
    haze: 0.4,
    density: 1.0,
    swirl: 0.4,
    lensing: 0.15,
    hopper: 0.0,
    reddening: 0.0,
    photonRingBoost: 0.0,
    horizonGlow: 0.0,
    starShift: 0.45,
    heatHaze: 0.0,
    innerFade: 0.8,
    tempFall: 0.72,
    tempPower: 0.0,
    saturation: 1.0,
    orbit: 0.0,
    vignette: 0.0,
    chromatic: 0.0,
    steps: 28,
    quality: "high",
  };

  private disposed = false;
  private ready = false;
  private active = true;
  private frameRequest = 0;
  private lastTime = 0;
  private seconds = 0;
  private resizeObserver: ResizeObserver;
  private onFirstFrame?: () => void;
  private onError?: (msg: string) => void;

  constructor(
    canvas: HTMLCanvasElement,
    options?: BlackHoleOptions,
    onError?: (msg: string) => void,
    onFirstFrame?: () => void,
  ) {
    this.canvas = canvas;
    this.onError = onError;
    this.onFirstFrame = onFirstFrame;

    if (options) {
      this.options = { ...this.options, ...options };
    }

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      throw new Error("WebGL 2 is not supported by your browser or GPU.");
    }
    this.gl = gl;

    if (!gl.getExtension("EXT_color_buffer_float")) {
      throw new Error("EXT_color_buffer_float extension is not supported.");
    }

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    this.resizeObserver = new ResizeObserver(() => {
      this.resizePending = true;
    });
    this.resizeObserver.observe(canvas);
  }

  async initialize(): Promise<void> {
    const gl = this.gl;

    // Assemble shader pipelines
    this.programs = {
      field: this.createProgram(VERT, FIELD_FRAG),
      lens: this.createProgram(VERT, GEODESIC_FRAG),
      adaptive: this.createProgram(VERT, ADAPTIVE_FRAG),
      volume: this.createProgram(VERT, VOLUME_FRAG),
      blur: this.createProgram(VERT, BLUR_FRAG),
      composite: this.createProgram(VERT, COMPOSITE_FRAG),
    };

    this.resize();

    // Precompute 2048x1024 orbital field texture
    this.field = this.createTarget(2048, 1024, 1, false, false, true);
    gl.bindTexture(gl.TEXTURE_2D, this.field.textures[0]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    this.use(this.programs.field, this.field);
    this.setVec2(this.programs.field, "uSize", [2048, 1024]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindTexture(gl.TEXTURE_2D, this.field.textures[0]);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    if (aniso) {
      const maxAniso = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAniso));
    }

    this.ready = true;
    if (this.active) {
      this.frameRequest = requestAnimationFrame(this.renderLoop);
    }
  }

  setPose(pose: CameraPose) {
    const cur = this.cinematicPose;
    const changed =
      !cur ||
      Math.abs(pose.distance - cur.distance) > 5e-4 ||
      Math.abs(pose.azimuth - cur.azimuth) > 1e-5 ||
      Math.abs(pose.elevation - cur.elevation) > 1e-5 ||
      Math.abs(pose.roll - cur.roll) > 1e-5 ||
      Math.abs(pose.shiftX - cur.shiftX) > 1e-5 ||
      Math.abs(pose.shiftY - cur.shiftY) > 1e-5 ||
      Math.abs(pose.film - cur.film) > 1e-5;

    if (changed) {
      this.cinematicPose = { ...pose };
      this.lastPoseChange = performance.now();
      this.geometryDirty = true;
    }

    if (Math.abs(this.options.exposure - pose.exposure) > 5e-4) {
      this.options.exposure = pose.exposure;
      this.frameDirty = true;
    }
  }

  setOptions(options: Partial<BlackHoleOptions>) {
    const next = { ...options };
    if (
      next.spin !== undefined &&
      next.spin !== this.options.spin &&
      next.innerRadius === undefined
    ) {
      next.innerRadius = kerrDiskInnerRadius(next.spin);
    }
    if (
      (next.spin !== undefined && next.spin !== this.options.spin) ||
      (next.charge !== undefined && next.charge !== this.options.charge) ||
      (next.innerRadius !== undefined && next.innerRadius !== this.options.innerRadius) ||
      (next.outerRadius !== undefined && next.outerRadius !== this.options.outerRadius)
    ) {
      this.geometryDirty = true;
      this.refinedRows = 0;
    }
    Object.assign(this.options, next);
    this.frameDirty = true;
  }

  setActive(active: boolean) {
    if (this.active === active || this.disposed) return;
    this.active = active;
    this.lastTime = 0;
    if (active && this.ready) {
      this.frameRequest = requestAnimationFrame(this.renderLoop);
    } else {
      cancelAnimationFrame(this.frameRequest);
    }
  }

  private createShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src.trim());
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      this.onError?.(info ?? "Shader compilation failed");
      throw new Error(`Shader compilation failed: ${info}`);
    }
    return s;
  }

  private createProgram(vsSrc: string, fsSrc: string): ProgramInfo {
    const gl = this.gl;
    const p = gl.createProgram()!;
    const vs = this.createShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSrc);
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(`Program link failed: ${info}`);
    }

    return { handle: p, uniforms: new Map(), values: new Map() };
  }

  private createTarget(
    w: number,
    h: number,
    count = 1,
    isFloat32 = false,
    isR11F = false,
    hasMipmaps = false,
    isUByte = false,
  ): RenderTarget {
    const gl = this.gl;
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    const textures = Array.from({ length: count }, (_, i) => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);

      let internalFormat: number = gl.RGBA16F;
      if (isUByte) internalFormat = gl.RGBA8;
      else if (isFloat32) internalFormat = gl.RGBA32F;
      else if (isR11F) internalFormat = gl.R11F_G11F_B10F;

      const levels = hasMipmaps ? 1 + Math.floor(Math.log2(Math.max(w, h))) : 1;
      gl.texStorage2D(gl.TEXTURE_2D, levels, internalFormat, w, h);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, isFloat32 ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, isFloat32 ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex, 0);
      return tex;
    });

    gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      textures.forEach((t) => gl.deleteTexture(t));
      gl.deleteFramebuffer(framebuffer);
      throw new Error("Framebuffer incomplete.");
    }

    const target = { framebuffer, textures, width: w, height: h };
    this.targets.push(target);
    return target;
  }

  private destroyTarget(target: RenderTarget) {
    this.gl.deleteFramebuffer(target.framebuffer);
    target.textures.forEach((t) => this.gl.deleteTexture(t));
    this.targets = this.targets.filter((t) => t !== target);
  }

  private use(prog: ProgramInfo, target: RenderTarget | null) {
    const gl = this.gl;
    gl.useProgram(prog.handle);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
    gl.viewport(0, 0, target ? target.width : this.width, target ? target.height : this.height);
  }

  private getLoc(prog: ProgramInfo, name: string): WebGLUniformLocation {
    if (!prog.uniforms.has(name)) {
      prog.uniforms.set(name, this.gl.getUniformLocation(prog.handle, name)!);
    }
    return prog.uniforms.get(name)!;
  }

  private setFloat(prog: ProgramInfo, name: string, val: number) {
    if (prog.values.get(name) !== val) {
      this.gl.uniform1f(this.getLoc(prog, name), val);
      prog.values.set(name, val);
    }
  }

  private setInt(prog: ProgramInfo, name: string, val: number) {
    if (prog.values.get(name) !== val) {
      this.gl.uniform1i(this.getLoc(prog, name), val);
      prog.values.set(name, val);
    }
  }

  private setVec2(prog: ProgramInfo, name: string, val: [number, number]) {
    const cur = prog.values.get(name) as [number, number] | undefined;
    if (!cur || cur[0] !== val[0] || cur[1] !== val[1]) {
      this.gl.uniform2f(this.getLoc(prog, name), val[0], val[1]);
      prog.values.set(name, [val[0], val[1]]);
    }
  }

  private setVec3(prog: ProgramInfo, name: string, val: number[]) {
    const cur = prog.values.get(name) as number[] | undefined;
    if (!cur || cur[0] !== val[0] || cur[1] !== val[1] || cur[2] !== val[2]) {
      this.gl.uniform3f(this.getLoc(prog, name), val[0], val[1], val[2]);
      prog.values.set(name, [val[0], val[1], val[2]]);
    }
  }

  private setTexture(
    prog: ProgramInfo,
    name: string,
    tex: WebGLTexture,
    unit: number,
    is3D = false,
  ) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(is3D ? gl.TEXTURE_3D : gl.TEXTURE_2D, tex);
    this.setInt(prog, name, unit);
  }

  private resize() {
    this.resizePending = false;
    const rect = this.canvas.getBoundingClientRect();
    const aspect = rect.width / Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const canvasW = Math.max(2, Math.round(Math.min(rect.width * dpr, 2560)));
    const canvasH = Math.max(2, Math.round(canvasW / Math.max(aspect, 0.01)));

    if (this.canvas.width !== canvasW || this.canvas.height !== canvasH) {
      this.canvas.width = canvasW;
      this.canvas.height = canvasH;
      this.frameDirty = true;
    }

    const q = this.options.quality;
    const limit =
      q === "performance" ? 640 : q === "balanced" ? 960 : q === "high" ? 1440 : this.autoWidth;
    const traceW = Math.max(
      2,
      2 *
      Math.floor(
        Math.min(rect.width * dpr, limit, Math.sqrt(((limit * limit) / 1.7778) * aspect)) / 2,
      ),
    );
    const traceH = Math.max(2, 2 * Math.floor(traceW / aspect / 2));

    if (traceW === this.width && traceH === this.height) return;

    this.width = traceW;
    this.height = traceH;

    // Destroy existing transient targets
    [...this.targets].forEach((t) => {
      if (t !== this.field) this.destroyTarget(t);
    });

    const coarseW = Math.min(
      traceW,
      Math.floor(Math.min(384, Math.sqrt((92160 * traceW) / traceH))),
    );
    const coarseH = Math.max(2, Math.round((coarseW * traceH) / traceW));

    this.movingLens = this.createTarget(coarseW, coarseH, 4, true);
    this.detailedLens = this.createTarget(traceW, traceH, 4, true);
    this.lens = this.movingLens;
    this.refinedRows = 0;

    this.scene = this.createTarget(traceW, traceH);
    this.presentation = this.createTarget(traceW, traceH, 1, false, false, false, true);

    this.blooms = Array.from({ length: 5 }, (_, i) => {
      const sw = Math.max(2, Math.floor(traceW / 2 ** (i + 1)));
      const sh = Math.max(2, Math.floor(traceH / 2 ** (i + 1)));
      return [this.createTarget(sw, sh, 1, false, true), this.createTarget(sw, sh, 1, false, true)];
    });

    this.geometryDirty = true;
    this.frameDirty = true;
  }

  private applyCamera(prog: ProgramInfo) {
    const p = this.cinematicPose;
    const elev = p?.elevation ?? this.elevation;
    const azim = p?.azimuth ?? this.azimuth;
    const roll = p?.roll ?? (16 * Math.PI) / 180;
    const dist = p?.distance ?? this.distance;

    const ce = Math.cos(elev);
    const forward = [ce * Math.cos(azim), ce * Math.sin(azim), Math.sin(elev)];
    const right0 = [-Math.sin(azim), Math.cos(azim), 0];
    const up0 = [
      -Math.sin(elev) * Math.cos(azim),
      -Math.sin(elev) * Math.sin(azim),
      Math.cos(elev),
    ];

    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const right = right0.map((v, i) => v * cr - up0[i] * sr);
    const up = up0.map((v, i) => v * cr + right0[i] * sr);

    const aspect = this.width / this.height;
    const u = Math.max(1, 1.25 / aspect);

    this.setFloat(prog, "uAspect", aspect);
    const isLens = prog === this.programs.lens;
    this.setVec2(
      prog,
      "uSize",
      isLens && this.lens ? [this.lens.width, this.lens.height] : [this.width, this.height],
    );
    this.setVec3(
      prog,
      "uCamera",
      forward.map((v) => v * dist),
    );
    this.setVec3(
      prog,
      "uForward",
      forward.map((v) => -v),
    );
    this.setVec3(prog, "uRight", right);
    this.setVec3(prog, "uUp", up);
    this.setVec2(prog, "uShift", p ? [p.shiftX, p.shiftY] : [-0.35 / u, -0.02]);
    this.setFloat(prog, "uFilm", p?.film ?? 0.35 * Math.max(0.65, 1 / u));
  }

  private renderLoop = (time: number) => {
    if (this.disposed || !this.ready || !this.active) return;
    this.frameRequest = requestAnimationFrame(this.renderLoop);

    if (document.hidden) {
      this.lastTime = 0;
      return;
    }

    if (this.resizePending) this.resize();

    const gl = this.gl;
    const isMoving = this.cinematicPose !== null && time - this.lastPoseChange < 180;
    if (this.geometryDirty) {
      this.lens = this.movingLens;
      this.refinedRows = 0;
    }
    const needsRefinement = !isMoving && this.refinedRows < this.height;

    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.1) : 0;
    this.lastTime = time;

    if (!this.options.paused) {
      this.seconds = (this.seconds + dt * this.options.speed) % 30;
    }

    if (this.options.paused && !this.geometryDirty && !this.frameDirty && !needsRefinement) {
      return;
    }

    // 1. Geodesic Kerr-Newman Pass
    if (this.geometryDirty) {
      const pLens = this.programs.lens;
      this.use(pLens, this.lens);
      this.applyCamera(pLens);
      this.setFloat(pLens, "uSpin", this.options.spin);
      this.setFloat(pLens, "uCharge", this.options.charge);
      this.setFloat(pLens, "uInnerRadius", this.options.innerRadius);
      this.setFloat(pLens, "uOuterRadius", this.options.outerRadius);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const pAdaptive = this.programs.adaptive;
      this.use(pAdaptive, this.detailedLens);
      this.applyCamera(pAdaptive);
      this.setFloat(pAdaptive, "uSpin", this.options.spin);
      this.setFloat(pAdaptive, "uCharge", this.options.charge);
      this.setFloat(pAdaptive, "uInnerRadius", this.options.innerRadius);
      this.setFloat(pAdaptive, "uOuterRadius", this.options.outerRadius);
      for (let i = 0; i < 4; i++) {
        this.setTexture(pAdaptive, `uCoarse${i}`, this.movingLens!.textures[i], i);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      this.lens = this.detailedLens;
      this.geometryDirty = false;
    }

    // 2. Progressive Scissor Refinement
    if (needsRefinement) {
      const pLens = this.programs.lens;
      const chunk = Math.min(
        this.height - this.refinedRows,
        Math.max(1, Math.floor(24576 / this.width)),
      );
      this.lens = this.detailedLens;
      this.use(pLens, this.detailedLens);
      this.applyCamera(pLens);
      this.setFloat(pLens, "uSpin", this.options.spin);
      this.setFloat(pLens, "uCharge", this.options.charge);
      this.setFloat(pLens, "uInnerRadius", this.options.innerRadius);
      this.setFloat(pLens, "uOuterRadius", this.options.outerRadius);

      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, this.refinedRows, this.width, chunk);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);

      this.refinedRows += chunk;
      this.lens = this.detailedLens;
    }

    // 3. Volumetric Plasma Pass
    const pVolume = this.programs.volume;
    this.use(pVolume, this.scene);
    this.applyCamera(pVolume);
    this.setTexture(pVolume, "uField", this.field!.textures[0], 0);
    for (let i = 0; i < 3; i++) {
      this.setTexture(pVolume, `uHit${i}`, this.lens!.textures[i], i + 1);
    }
    this.setTexture(pVolume, "uSky", this.lens!.textures[3], 4);
    this.setFloat(pVolume, "uPhase", this.seconds / 30);
    this.setFloat(pVolume, "uContrast", this.options.contrast);
    this.setInt(
      pVolume,
      "uFrequencyShift",
      FREQUENCY_SHIFT_MODE[this.options.frequencyShift] ?? FREQUENCY_SHIFT_MODE["color+bright"],
    );
    this.setFloat(pVolume, "uColorShift", this.options.colorShift ?? 0.4);
    this.setFloat(pVolume, "uLimb", this.options.limb ?? 0);
    this.setFloat(pVolume, "uInnerRadius", this.options.innerRadius);
    this.setFloat(pVolume, "uOuterRadius", this.options.outerRadius);
    this.setFloat(pVolume, "uDiskThickness", this.options.thickness);
    this.setFloat(pVolume, "uDiskTemperature", this.options.temperature);
    this.setFloat(pVolume, "uRadiance", this.options.radiance);
    this.setFloat(pVolume, "uStars", this.options.stars);
    this.setFloat(pVolume, "uHaze", this.options.haze);
    this.setFloat(pVolume, "uDiskDensity", this.options.density ?? 1.0);
    this.setFloat(pVolume, "uSwirl", this.options.swirl ?? 0.4);
    this.setFloat(pVolume, "uLensing", this.options.lensing ?? 1.0);
    this.setFloat(pVolume, "uHopper", this.options.hopper ?? 0.02);
    this.setFloat(pVolume, "uReddening", this.options.reddening ?? 0.4);
    this.setFloat(pVolume, "uPhotonRingBoost", this.options.photonRingBoost ?? 2.2);
    this.setFloat(pVolume, "uHorizonGlow", this.options.horizonGlow ?? 0.35);
    this.setFloat(pVolume, "uSpin", this.options.spin);
    this.setFloat(pVolume, "uStarShift", this.options.starShift ?? 0);
    this.setFloat(pVolume, "uHeatHaze", this.options.heatHaze ?? 0);
    this.setFloat(pVolume, "uInnerFade", this.options.innerFade ?? 0.8);
    this.setFloat(pVolume, "uTempFall", this.options.tempFall ?? 0.72);
    this.setFloat(pVolume, "uTempPower", this.options.tempPower ?? 0);
    this.setFloat(pVolume, "uSaturation", this.options.saturation ?? 1);
    this.setFloat(pVolume, "uOrbit", this.options.orbit ?? 0);
    this.setInt(
      pVolume,
      "uSteps",
      this.options.steps ??
      (this.options.quality === "performance"
        ? 16
        : this.options.quality === "balanced"
          ? 24
          : 28),
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 4. Bloom Pyramid Passes
    const pBlur = this.programs.blur;
    let inputTex = this.scene!.textures[0];
    for (let i = 0; i < this.blooms.length; i++) {
      const [hTarget, vTarget] = this.blooms[i];

      // Horizontal blur
      this.use(pBlur, hTarget);
      this.setVec2(pBlur, "uSize", [hTarget.width, hTarget.height]);
      this.setVec2(pBlur, "uDirection", [2, 0]);
      this.setFloat(pBlur, "uThreshold", i === 0 ? 0.7 : 0.0);
      this.setTexture(pBlur, "uImage", inputTex, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Vertical blur
      this.use(pBlur, vTarget);
      this.setVec2(pBlur, "uSize", [vTarget.width, vTarget.height]);
      this.setVec2(pBlur, "uDirection", [0, 2]);
      this.setFloat(pBlur, "uThreshold", 0.0);
      this.setTexture(pBlur, "uImage", hTarget.textures[0], 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      inputTex = vTarget.textures[0];
    }

    // 5. Composite Pass with Analytical AgX Tonemapping
    const pComp = this.programs.composite;
    this.use(pComp, this.presentation);
    this.setVec2(pComp, "uSize", [this.width, this.height]);
    this.setTexture(pComp, "uImage", this.scene!.textures[0], 0);
    for (let i = 0; i < this.blooms.length; i++) {
      this.setTexture(pComp, `uBloom${i}`, this.blooms[i][1].textures[0], i + 1);
    }
    this.setFloat(pComp, "uExposure", this.options.exposure);
    this.setFloat(pComp, "uGlow", this.options.glow);
    this.setFloat(pComp, "uVignette", this.options.vignette ?? 0.25);
    this.setFloat(pComp, "uChromatic", this.options.chromatic ?? 0.0015);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Blit to screen
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.presentation!.framebuffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(
      0,
      0,
      this.width,
      this.height,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
      gl.COLOR_BUFFER_BIT,
      gl.LINEAR,
    );

    this.frameDirty = false;
    if (this.onFirstFrame) {
      const cb = this.onFirstFrame;
      this.onFirstFrame = undefined;
      cb();
    }
  };

  captureSnapshot(filename = "kerr-blackhole.png") {
    const link = document.createElement("a");
    link.download = filename;
    link.href = this.canvas.toDataURL("image/png");
    link.click();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameRequest);
    this.resizeObserver.disconnect();

    const gl = this.gl;
    this.targets.forEach((t) => this.destroyTarget(t));
    this.targets = [];
    Object.values(this.programs).forEach((p) => gl.deleteProgram(p.handle));
    gl.deleteVertexArray(this.vao);
  }
}

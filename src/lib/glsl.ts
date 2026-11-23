/**
 * WebGL2 GLSL effect engine (Phase 5, SPEC N — N-GLSL).
 * Runs a clip frame through a chain of fragment shaders (one per GLSL
 * effect on the clip) on the working canvas. Pure WebGL2, no libraries.
 * If WebGL2 is unavailable the engine reports unsupported and the
 * compositor keeps the un-effected frame — never a fake render.
 * A shader that fails to compile is caught, warned once, and skipped.
 */

export interface GlslEffectInstance {
  /** Full fragment-shader body (the inside of main, assigning `vec3 o`). */
  body: string;
  intensity: number;
  p1: number;
  p2: number;
}

const VERT = `attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const PRELUDE = `precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_p1;
uniform float u_p2;
float vhash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(vhash(i), vhash(i + vec2(1.0, 0.0)), f.x),
             mix(vhash(i + vec2(0.0, 1.0)), vhash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec3 vblur4(vec2 uv) {
  vec2 px = vec2(1.0) / u_res;
  return (texture2D(u_tex, uv).rgb
    + texture2D(u_tex, uv + vec2(px.x, 0.0)).rgb
    + texture2D(u_tex, uv - vec2(px.x, 0.0)).rgb
    + texture2D(u_tex, uv + vec2(0.0, px.y)).rgb
    + texture2D(u_tex, uv - vec2(0.0, px.y)).rgb) / 5.0;
}
`;

export const GLSL_PRELUDE = PRELUDE;

/** Assemble a complete fragment shader from an effect body. */
export function assembleGlslShader(body: string): string {
  return `${PRELUDE}void main() {
  vec3 c = texture2D(u_tex, v_uv).rgb;
  vec2 uv = v_uv;
  ${body}
  gl_FragColor = vec4(mix(c, o, u_intensity), 1.0);
}
`;
}

interface CompiledProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export class GlslRenderer {
  private canvas: HTMLCanvasElement;
  private fbos: WebGLFramebuffer[] = [];
  private fboTextures: WebGLTexture[] = [];
  private gl: WebGL2RenderingContext | null = null;
  private ping = 0;
  private programs = new Map<string, CompiledProgram>();
  private quad: WebGLBuffer | null = null;
  private srcTexture: WebGLTexture | null = null;
  private warned = new Set<string>();

  constructor() {
    this.canvas = document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', { antialias: false, depth: false, stencil: false });
    if (gl) this.gl = gl;
  }

  isSupported(): boolean {
    return this.gl !== null;
  }

  private compile(fragSource: string): CompiledProgram | null {
    const gl = this.gl;
    if (!gl) return null;
    const cached = this.programs.get(fragSource);
    if (cached) return cached;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;
    gl.shaderSource(vs, VERT);
    gl.compileShader(vs);
    gl.shaderSource(fs, fragSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(fs) ?? 'unknown error';
      if (!this.warned.has(fragSource)) {
        this.warned.add(fragSource);
        console.warn(`[vidora] GLSL compile failed, effect skipped: ${log.slice(0, 200)}`);
      }
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }
    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const name of ['u_tex', 'u_res', 'u_time', 'u_intensity', 'u_p1', 'u_p2']) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    const compiled = { program, uniforms };
    this.programs.set(fragSource, compiled);
    return compiled;
  }

  private ensureQuad(gl: WebGL2RenderingContext): WebGLBuffer | null {
    if (this.quad) return this.quad;
    const buf = gl.createBuffer();
    if (!buf) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.quad = buf;
    return buf;
  }

  private ensureTargets(gl: WebGL2RenderingContext, w: number, h: number): boolean {
    if (this.fbos.length === 2 && this.canvas.width === w && this.canvas.height === h) return true;
    for (const fbo of this.fbos) gl.deleteFramebuffer(fbo);
    for (const tex of this.fboTextures) gl.deleteTexture(tex);
    this.fbos = [];
    this.fboTextures = [];
    this.canvas.width = w;
    this.canvas.height = h;
    for (let i = 0; i < 2; i += 1) {
      const tex = gl.createTexture();
      const fbo = gl.createFramebuffer();
      if (!tex || !fbo) return false;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      this.fboTextures.push(tex);
      this.fbos.push(fbo);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  }

  private drawQuad(gl: WebGL2RenderingContext, program: WebGLProgram): void {
    const quad = this.ensureQuad(gl);
    if (!quad) return;
    const loc = gl.getAttribLocation(program, 'a_pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(loc);
  }

  /**
   * Run `source` through the effect chain. Returns the renderer's canvas
   * (sized to the source) with the result, or null when WebGL2 is
   * unavailable or every shader failed (caller keeps the original frame).
   */
  render(source: HTMLCanvasElement, effects: GlslEffectInstance[], time: number): HTMLCanvasElement | null {
    const gl = this.gl;
    if (!gl || effects.length === 0) return null;
    const w = Math.max(1, source.width);
    const h = Math.max(1, source.height);
    if (!this.ensureTargets(gl, w, h)) return null;
    try {
      if (!this.srcTexture) {
        const tex = gl.createTexture();
        if (!tex) return null;
        this.srcTexture = tex;
      }
      gl.bindTexture(gl.TEXTURE_2D, this.srcTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.viewport(0, 0, w, h);

      let current: WebGLTexture = this.srcTexture;
      let applied = 0;
      for (const effect of effects) {
        const compiled = this.compile(assembleGlslShader(effect.body));
        if (!compiled) continue;
        const target = this.ping % 2;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[target]);
        gl.useProgram(compiled.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, current);
        gl.uniform1i(compiled.uniforms.u_tex, 0);
        gl.uniform2f(compiled.uniforms.u_res, w, h);
        gl.uniform1f(compiled.uniforms.u_time, time);
        gl.uniform1f(compiled.uniforms.u_intensity, effect.intensity);
        gl.uniform1f(compiled.uniforms.u_p1, effect.p1);
        gl.uniform1f(compiled.uniforms.u_p2, effect.p2);
        this.drawQuad(gl, compiled.program);
        current = this.fboTextures[target];
        this.ping += 1;
        applied += 1;
      }
      if (applied === 0) return null;
      // Copy the last result to the default framebuffer (this.canvas).
      const copy = this.compile(assembleGlslShader('vec3 o = texture2D(u_tex, v_uv).rgb;'));
      if (!copy) return null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(copy.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, current);
      gl.uniform1i(copy.uniforms.u_tex, 0);
      gl.uniform2f(copy.uniforms.u_res, w, h);
      gl.uniform1f(copy.uniforms.u_time, 0);
      gl.uniform1f(copy.uniforms.u_intensity, 1);
      gl.uniform1f(copy.uniforms.u_p1, 0);
      gl.uniform1f(copy.uniforms.u_p2, 0);
      this.drawQuad(gl, copy.program);
      return this.canvas;
    } catch {
      return null;
    }
  }
}

let singleton: GlslRenderer | null = null;

export function getGlslRenderer(): GlslRenderer {
  if (!singleton) singleton = new GlslRenderer();
  return singleton;
}

/** True when this browser can run GLSL effects (WebGL2 present). */
export function isGlslSupported(): boolean {
  try {
    return getGlslRenderer().isSupported();
  } catch {
    return false;
  }
}

/** Run a frame through GLSL effects; null when unsupported / nothing applied. */
export function renderGlslFrame(
  source: HTMLCanvasElement,
  effects: GlslEffectInstance[],
  time: number,
): HTMLCanvasElement | null {
  try {
    return getGlslRenderer().render(source, effects, time);
  } catch {
    return null;
  }
}

/** Fixed test image (gradient + bars + circle) for effect thumbnails. */
export function makeTestGradient(w = 96, h = 54): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#7C3AED');
  grad.addColorStop(0.5, '#F59E0B');
  grad.addColorStop(1, '#06B6D4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(w * 0.7, h * 0.5, h * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#18181B';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  return c;
}

const thumbnailCache = new Map<string, string | null>();

/** Auto thumbnail: the test gradient rendered through one effect (cached). */
export function glslThumbnail(body: string, p1: number, p2: number): string | null {
  const key = `${body}|${p1}|${p2}`;
  if (thumbnailCache.has(key)) return thumbnailCache.get(key) ?? null;
  let url: string | null = null;
  try {
    const out = renderGlslFrame(makeTestGradient(), [{ body, intensity: 1, p1, p2 }], 0.6);
    if (out) url = out.toDataURL('image/png');
  } catch {
    url = null;
  }
  thumbnailCache.set(key, url);
  return url;
}

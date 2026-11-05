"use client";

import { AudioFeatures, ArtStyleId, ColorPaletteId } from "./types";
import { COLOR_PALETTES } from "./types";

/**
 * SONORA Procedural Art Engine
 * ------------------------------
 * A real-time generative art renderer for Canvas 2D. It reacts to live audio
 * features and supports three styles: painterly, abstract, sketch/watercolor.
 *
 * Design principles:
 *  - Bass -> large shapes, motion, atmosphere
 *  - Mid  -> brush strokes, complexity, mid-tier structure
 *  - Treble -> particles, sparks, fine detail
 *  - Volume/energy -> overall intensity & brightness
 *  - Beats -> bursts / palette shifts / bloom flashes
 *
 * The engine is layered: an atmospheric background + persistent paint layer
 * (offscreen canvas) + live particle system + compositing. This way strokes
 * "stick" instead of clearing every frame, producing a real painted look.
 */

const PARTICLE_CAP = 600;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  kind: "spark" | "blob" | "streak" | "bloom";
}

export interface ProceduralOptions {
  styleId: ArtStyleId;
  paletteId: ColorPaletteId;
  intensity: number; // 0..1 — overall activity multiplier
  animSpeed: number; // 0..1 — stroke cadence
  performance: "eco" | "balanced" | "performance";
}

export class ProceduralEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  // Offscreen persistent layer where strokes accumulate
  private paintCanvas: HTMLCanvasElement;
  private paintCtx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private rafId: number | null = null;
  private opts: ProceduralOptions;

  private w = 0;
  private h = 0;
  private dpr = 1;

  // Internal state
  private frameCount = 0;
  private lastBeatFrame = -999;
  private hueShift = 0;
  private strokeAngle = 0;
  private strokeRadius = 0;
  private lastStrokeAt = 0;
  private cursorX = 0;
  private cursorY = 0;

  // Captured "snapshot" of last beat for AI-style reveal pacing
  public onStroke?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    opts: ProceduralOptions
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true })!;
    this.opts = opts;
    this.paintCanvas = document.createElement("canvas");
    this.paintCtx = this.paintCanvas.getContext("2d", { alpha: true })!;
    this.resize();
  }

  setOptions(opts: Partial<ProceduralOptions>): void {
    const changedPalette = opts.paletteId && opts.paletteId !== this.opts.paletteId;
    const changedStyle = opts.styleId && opts.styleId !== this.opts.styleId;
    this.opts = { ...this.opts, ...opts };
    if (changedPalette || changedStyle) {
      // Reset paint layer when style/palette changes for a clean start
      this.clear();
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(
      window.devicePixelRatio || 1,
      this.opts.performance === "eco" ? 1 : 2
    );
    this.w = Math.max(1, Math.floor(rect.width));
    this.h = Math.max(1, Math.floor(rect.height));
    // Preserve existing paint through resize by drawing old onto new
    const old = this.paintCanvas;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.paintCanvas.width = Math.floor(this.w * this.dpr);
    this.paintCanvas.height = Math.floor(this.h * this.dpr);
    this.paintCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (old.width > 0 && old.height > 0) {
      this.paintCtx.drawImage(
        old,
        0,
        0,
        old.width,
        old.height,
        0,
        0,
        this.w,
        this.h
      );
    }
    if (this.cursorX === 0) this.cursorX = this.w / 2;
    if (this.cursorY === 0) this.cursorY = this.h / 2;
  }

  clear(): void {
    this.paintCtx.clearRect(0, 0, this.w, this.h);
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.particles = [];
    this.frameCount = 0;
    this.hueShift = 0;
    this.lastStrokeAt = 0;
  }

  /** Per-frame update driven by features. */
  update(features: AudioFeatures): void {
    this.frameCount++;
    const { w, h } = this;
    const ctx = this.ctx;
    const palette = COLOR_PALETTES.find((p) => p.id === this.opts.paletteId)!;
    const colors = palette.colors;
    const f = features;
    const intensity = this.opts.intensity;
    const speedMul = 0.4 + this.opts.animSpeed * 1.6;

    // ===== 1) Atmospheric background (drawn live, not persistent)
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);

    // Vignette gradient that breathes with bass
    const bassPulse = f.smoothBass * (0.5 + intensity * 0.7);
    const bgGrad = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.05,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.75
    );
    const bgColor1 = hexToRgba(colors[colors.length - 1], 0.95);
    const bgColor2 = hexToRgba(colors[0], 0.18 + bassPulse * 0.25);
    bgGrad.addColorStop(0, bgColor2);
    bgGrad.addColorStop(1, bgColor1);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Faint horizon glow that shifts with hueShift
    this.hueShift += (f.smoothMid * 0.4 + 0.05) * speedMul * 0.5;
    const horizonGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
    horizonGrad.addColorStop(0, "rgba(0,0,0,0)");
    horizonGrad.addColorStop(
      1,
      hexToRgba(
        colors[Math.floor(this.hueShift) % colors.length],
        0.12 + f.smoothBass * 0.2
      )
    );
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    // ===== 2) Persistent paint layer — apply strokes
    // Style-specific stroke generation
    this.paintStrokes(f, colors, intensity, speedMul);

    // Composite paint layer with subtle opacity
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(this.paintCanvas, 0, 0, w, h);

    // ===== 3) Live particle system on top
    this.spawnParticles(f, colors, intensity);
    this.updateParticles(speedMul);
    this.drawParticles(ctx);

    // ===== 4) Beat flash overlay
    if (f.beat && this.frameCount - this.lastBeatFrame > 4) {
      this.lastBeatFrame = this.frameCount;
      // Big bloom on beat
      const bx = this.cursorX;
      const by = this.cursorY;
      const burstColor = colors[Math.floor(Math.random() * colors.length)];
      const burstSize = 30 + f.beatStrength * 120 * intensity;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, burstSize);
      g.addColorStop(0, hexToRgba(burstColor, 0.55));
      g.addColorStop(1, hexToRgba(burstColor, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Extra persistent bloom in the paint layer
      this.paintCtx.globalCompositeOperation = "lighter";
      const pg = this.paintCtx.createRadialGradient(
        bx,
        by,
        0,
        bx,
        by,
        burstSize * 1.5
      );
      pg.addColorStop(0, hexToRgba(burstColor, 0.18));
      pg.addColorStop(1, hexToRgba(burstColor, 0));
      this.paintCtx.fillStyle = pg;
      this.paintCtx.fillRect(0, 0, w, h);
      this.paintCtx.globalCompositeOperation = "source-over";
    }

    // ===== 5) Soft vignette
    const vignette = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.3,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.7
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  /** Generate style-specific persistent brush strokes. */
  private paintStrokes(
    f: AudioFeatures,
    colors: string[],
    intensity: number,
    speedMul: number
  ): void {
    const { w, h } = this;
    const ctx = this.paintCtx;
    const styleId = this.opts.styleId;

    // Stroke cadence — slower for sketch, faster for abstract
    const cadence =
      styleId === "sketch"
        ? 2
        : styleId === "abstract"
        ? 1
        : 3;
    const needStroke = this.frameCount % cadence === 0;
    if (!needStroke) return;

    // Move cursor based on energy + a wandering trajectory
    const wanderSpeed = (0.4 + f.energy * 2.4) * speedMul;
    this.strokeAngle += (f.smoothMid - 0.3) * 0.25 + 0.02 * speedMul;
    // Bass influences "leap" magnitude
    const leap = (8 + f.smoothBass * 60) * (0.4 + intensity * 0.8);
    // Treble introduces jitter
    const jitter = (Math.random() - 0.5) * f.smoothTreble * 80;

    const targetX =
      this.cursorX +
      Math.cos(this.strokeAngle) * leap * wanderSpeed +
      jitter * 0.4;
    const targetY =
      this.cursorY +
      Math.sin(this.strokeAngle * 1.1) * leap * wanderSpeed +
      jitter * 0.4;

    // Wrap around edges
    const newX = ((targetX % w) + w) % w;
    const newY = ((targetY % h) + h) % h;

    const colorPick =
      colors[Math.floor((this.hueShift + f.smoothMid * 3) % colors.length)];

    if (styleId === "painterly") {
      // Big, soft, layered strokes with low opacity — oil-paint feel
      const brushSize = 18 + f.smoothBass * 70 * intensity;
      const opacity = 0.04 + f.smoothMid * 0.12;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = hexToRgba(colorPick, opacity);
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(this.cursorX, this.cursorY);
      // Quadratic curve for organic feel
      const cx = (this.cursorX + newX) / 2 + (Math.random() - 0.5) * 20;
      const cy = (this.cursorY + newY) / 2 + (Math.random() - 0.5) * 20;
      ctx.quadraticCurveTo(cx, cy, newX, newY);
      ctx.stroke();

      // Occasional bright highlight stroke on treble peaks
      if (f.smoothTreble > 0.45 && Math.random() < 0.5) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = hexToRgba(
          colors[0],
          0.06 + f.smoothTreble * 0.1
        );
        ctx.lineWidth = brushSize * 0.25;
        ctx.beginPath();
        ctx.moveTo(this.cursorX, this.cursorY);
        ctx.quadraticCurveTo(cx, cy, newX, newY);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }
    } else if (styleId === "abstract") {
      // Bold color blocks + fluid ribbons
      const choice = Math.random();
      if (choice < 0.4) {
        // Ribbon
        const ribbonWidth = 6 + f.smoothBass * 26 * intensity;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = hexToRgba(colorPick, 0.22 + f.smoothMid * 0.3);
        ctx.lineWidth = ribbonWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(this.cursorX, this.cursorY);
        const cx = (this.cursorX + newX) / 2 + (Math.random() - 0.5) * 60;
        const cy = (this.cursorY + newY) / 2 + (Math.random() - 0.5) * 60;
        ctx.quadraticCurveTo(cx, cy, newX, newY);
        ctx.stroke();
      } else if (choice < 0.7) {
        // Color block / polygon
        const sides = 3 + Math.floor(f.smoothMid * 5);
        const r = 30 + f.smoothBass * 90 * intensity;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = hexToRgba(colorPick, 0.18 + f.smoothMid * 0.18);
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const ang = (i / sides) * Math.PI * 2 + this.strokeAngle;
          const px = newX + Math.cos(ang) * r;
          const py = newY + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // Concentric arcs
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = hexToRgba(colorPick, 0.18);
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.arc(
            newX,
            newY,
            10 + k * 14 + f.smoothBass * 30,
            0,
            Math.PI * 1.4 + f.smoothTreble * Math.PI
          );
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }
    } else {
      // sketch / watercolor
      // Pencil-like hatching + watercolor bloom
      const pencilColor = colors[Math.min(colors.length - 1, colors.length - 2)];
      if (Math.random() < 0.65) {
        // Ink / pencil line
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = hexToRgba(pencilColor, 0.4 + f.smoothMid * 0.4);
        ctx.lineWidth = 0.8 + f.smoothTreble * 1.8;
        ctx.lineCap = "round";
        // Short hatching strokes
        const hatchCount = 2 + Math.floor(f.smoothMid * 5);
        for (let i = 0; i < hatchCount; i++) {
          const ang = this.strokeAngle + (i / hatchCount) * 0.6 - 0.3;
          const len = 8 + f.smoothBass * 30 * intensity;
          ctx.beginPath();
          ctx.moveTo(newX, newY);
          ctx.lineTo(newX + Math.cos(ang) * len, newY + Math.sin(ang) * len);
          ctx.stroke();
        }
      } else {
        // Watercolor bloom
        const r = 20 + f.smoothBass * 60 * intensity;
        const grad = ctx.createRadialGradient(newX, newY, 0, newX, newY, r);
        grad.addColorStop(0, hexToRgba(colorPick, 0.18));
        grad.addColorStop(0.6, hexToRgba(colorPick, 0.08));
        grad.addColorStop(1, hexToRgba(colorPick, 0));
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(newX, newY, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.cursorX = newX;
    this.cursorY = newY;

    if (this.onStroke) this.onStroke();
  }

  private spawnParticles(
    f: AudioFeatures,
    colors: string[],
    intensity: number
  ): void {
    if (this.particles.length > PARTICLE_CAP) return;
    const perfMul =
      this.opts.performance === "eco"
        ? 0.4
        : this.opts.performance === "balanced"
        ? 0.8
        : 1.2;
    // Treble-driven sparks
    const sparkCount = Math.floor(
      f.smoothTreble * 8 * intensity * perfMul +
        (f.beat ? 18 * f.beatStrength * perfMul : 0)
    );
    for (let i = 0; i < sparkCount; i++) {
      if (this.particles.length >= PARTICLE_CAP) break;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * (3 + f.smoothTreble * 8);
      const size = 0.6 + Math.random() * (1.5 + f.smoothTreble * 3);
      this.particles.push({
        x: this.cursorX + (Math.random() - 0.5) * 30,
        y: this.cursorY + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 30 + Math.random() * 60,
        size,
        color,
        alpha: 0.6 + Math.random() * 0.4,
        kind: "spark",
      });
    }
    // Mid-driven soft blobs
    const blobCount = Math.floor(f.smoothMid * 1.5 * perfMul);
    for (let i = 0; i < blobCount; i++) {
      if (this.particles.length >= PARTICLE_CAP) break;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6 - 0.2,
        life: 0,
        maxLife: 80 + Math.random() * 120,
        size: 8 + Math.random() * 24,
        color,
        alpha: 0.08 + Math.random() * 0.12,
        kind: "blob",
      });
    }
  }

  private updateParticles(speedMul: number): void {
    const { w, h } = this;
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.life += speedMul;
      p.x += p.vx * speedMul;
      p.y += p.vy * speedMul;
      // wrap
      if (p.x < -50) p.x = w + 50;
      if (p.x > w + 50) p.x = -50;
      if (p.y < -50) p.y = h + 50;
      if (p.y > h + 50) p.y = -50;
      if (p.life < p.maxLife) next.push(p);
    }
    this.particles = next;
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      const t = 1 - p.life / p.maxLife;
      const a = p.alpha * t;
      if (p.kind === "spark") {
        ctx.fillStyle = hexToRgba(p.color, a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.strokeStyle = hexToRgba(p.color, a * 0.4);
        ctx.lineWidth = p.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4);
        ctx.stroke();
      } else if (p.kind === "blob") {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, hexToRgba(p.color, a));
        g.addColorStop(1, hexToRgba(p.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /** Export the current visible canvas to a data URL at given scale. */
  exportPNG(scale = 2): string {
    const tmp = document.createElement("canvas");
    tmp.width = this.w * scale;
    tmp.height = this.h * scale;
    const tctx = tmp.getContext("2d")!;
    tctx.drawImage(this.canvas, 0, 0, tmp.width, tmp.height);
    return tmp.toDataURL("image/png");
  }

  /** Export the persistent paint layer (artwork-only, no particles/atmosphere). */
  exportPaintLayer(scale = 2): string {
    const tmp = document.createElement("canvas");
    tmp.width = this.w * scale;
    tmp.height = this.h * scale;
    const tctx = tmp.getContext("2d")!;
    // Fill background to avoid transparency
    const palette = COLOR_PALETTES.find((p) => p.id === this.opts.paletteId)!;
    tctx.fillStyle = palette.colors[palette.colors.length - 1];
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(this.paintCanvas, 0, 0, tmp.width, tmp.height);
    return tmp.toDataURL("image/png");
  }

  dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.particles = [];
  }
}

function hexToRgba(hex: string, alpha: number): string {
  // Accept #rgb, #rrggbb, #rrggbbaa
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

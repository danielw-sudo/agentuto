import { ViewportRenderer } from '../../../core/types/simulation';
import { OscillatorState } from './OscillatorEngine';

export class OscillatorRenderer2D implements ViewportRenderer<OscillatorState> {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 800;
  private height: number = 600;
  private dpr: number = 1;

  mount(container: HTMLElement): void {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.resize(w, h);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (!this.canvas || !this.ctx) return;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(state: OscillatorState, _alpha?: number): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear background
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, w, h);

    const isStacked = w < 768;
    const splitX = isStacked ? w : w * 0.48;
    const splitY = isStacked ? h * 0.5 : h;

    // --- LEFT VIEWPORT: Physical Spring-Mass Apparatus ---
    this.renderPhysicalApparatus(ctx, 0, 0, splitX, splitY, state);

    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (isStacked) {
      ctx.moveTo(0, splitY);
      ctx.lineTo(w, splitY);
    } else {
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, h);
    }
    ctx.stroke();

    // --- RIGHT VIEWPORT: MIT 18.03 Phase Portrait (x vs. v) ---
    const phaseX = isStacked ? 0 : splitX;
    const phaseY = isStacked ? splitY : 0;
    const phaseW = isStacked ? w : w - splitX;
    const phaseH = isStacked ? h - splitY : h;

    this.renderPhasePortrait(ctx, phaseX, phaseY, phaseW, phaseH, state);
  }

  private renderPhysicalApparatus(
    ctx: CanvasRenderingContext2D,
    _x: number,
    y: number,
    w: number,
    h: number,
    state: OscillatorState
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, w, h);
    ctx.clip();

    const centerY = y + h * 0.5;
    // On desktop viewports (w >= 1024), inset wallX past the floating left ParameterDeck (w-80 = 320px)
    const isDesktop = w >= 1024;
    const wallX = isDesktop ? 360 : (w < 640 ? 30 : 60);
    const availableWidth = Math.max(w - wallX - 40, 100);
    const eqX = wallX + availableWidth * 0.45; // equilibrium position in pixels
    const scalePxPerMeter = Math.min(availableWidth / 12, 35);
    const blockX = eqX + state.x * scalePxPerMeter;
    const blockSize = 48;

    // 1. Fixed Wall
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(wallX - 12, centerY - 60, 12, 120);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(wallX - 12, centerY - 60, 12, 120);

    // Wall diagonal hatch lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for (let i = centerY - 55; i < centerY + 60; i += 12) {
      ctx.beginPath();
      ctx.moveTo(wallX - 12, i);
      ctx.lineTo(wallX - 22, i + 10);
      ctx.stroke();
    }

    // 2. Equilibrium reference line (x = 0)
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eqX, centerY - 80);
    ctx.lineTo(eqX, centerY + 80);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#818cf8';
    ctx.font = '10px monospace';
    ctx.fillText('x = 0 (Eq)', eqX - 24, centerY - 88);

    // 3. Procedural Coiled Spring
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(wallX, centerY);

    const springCoils = 14;
    const springLength = Math.max(blockX - blockSize * 0.5 - wallX, 10);
    const coilStep = springLength / (springCoils * 2);

    for (let i = 0; i < springCoils * 2; i++) {
      const cx = wallX + (i + 0.5) * coilStep;
      const cy = centerY + (i % 2 === 0 ? -18 : 18);
      ctx.lineTo(cx, cy);
    }
    ctx.lineTo(blockX - blockSize * 0.5, centerY);
    ctx.stroke();

    // 4. Moving Mass Block
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(blockX - blockSize * 0.5, centerY - blockSize * 0.5, blockSize, blockSize);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(blockX - blockSize * 0.5, centerY - blockSize * 0.5, blockSize, blockSize);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('m', blockX, centerY);

    // 5. Velocity Vector Arrow
    if (Math.abs(state.v) > 0.05) {
      const arrowLength = state.v * 15;
      const arrowY = centerY + blockSize * 0.5 + 16;
      ctx.strokeStyle = '#ec4899';
      ctx.fillStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(blockX, arrowY);
      ctx.lineTo(blockX + arrowLength, arrowY);
      ctx.stroke();

      // Arrow head
      const headDir = state.v > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(blockX + arrowLength, arrowY);
      ctx.lineTo(blockX + arrowLength - headDir * 6, arrowY - 4);
      ctx.lineTo(blockX + arrowLength - headDir * 6, arrowY + 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private renderPhasePortrait(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    state: OscillatorState
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const originX = x + w * 0.5;
    const originY = y + h * 0.5;
    const scale = Math.min(w, h) / 12; // pixels per unit

    // 1. Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let r = -5; r <= 5; r++) {
      if (r === 0) continue;
      // Vertical grid (x)
      ctx.beginPath();
      ctx.moveTo(originX + r * scale, y);
      ctx.lineTo(originX + r * scale, y + h);
      ctx.stroke();
      // Horizontal grid (v)
      ctx.beginPath();
      ctx.moveTo(x, originY + r * scale);
      ctx.lineTo(x + w, originY + r * scale);
      ctx.stroke();
    }

    // 2. Axes (x and v)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;

    // x-axis
    ctx.beginPath();
    ctx.moveTo(x + 20, originY);
    ctx.lineTo(x + w - 20, originY);
    ctx.stroke();

    // v-axis
    ctx.beginPath();
    ctx.moveTo(originX, y + 20);
    ctx.lineTo(originX, y + h - 20);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('x (Displacement, m)', x + w - 24, originY - 8);
    ctx.textAlign = 'center';
    ctx.fillText('v (Velocity, m/s)', originX + 54, y + 32);

    // Title badge
    ctx.fillStyle = '#818cf8';
    ctx.font = '10px font-semibold sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MIT 18.03 Phase Portrait (x vs. ẋ)', x + 24, y + 32);

    // 3. Phase Trajectory Spiral
    const pts = state.phaseTrajectory;
    if (pts.length > 1) {
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();

      for (let i = 0; i < pts.length; i++) {
        const px = originX + pts[i].x * scale;
        const py = originY - pts[i].v * scale; // inverted canvas Y
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    // 4. Current State Dot
    const currentPx = originX + state.x * scale;
    const currentPy = originY - state.v * scale;

    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(currentPx, currentPy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(currentPx, currentPy, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  unmount(): void {
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}

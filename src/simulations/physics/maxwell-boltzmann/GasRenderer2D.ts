import { ViewportRenderer } from '../../../core/types/simulation';
import { GasState, BOLTZMANN_K } from './GasEngine';

export class GasRenderer2D implements ViewportRenderer<GasState> {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 0;
  private height: number = 0;

  mount(container: HTMLElement): void {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resize(container.clientWidth || 800, container.clientHeight || 600);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    if (this.canvas && this.ctx) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  render(state: GasState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear background
    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, w, h);

    const isSplit = w >= 768;
    const leftWidth = isSplit ? w * 0.54 : w;
    const rightWidth = isSplit ? w * 0.46 : w;

    // Viewport 1: Gas Particle Chamber (Left)
    this.renderChamber(ctx, state, 0, 0, leftWidth, isSplit ? h : h * 0.55);

    // Viewport 2: Maxwell-Boltzmann Distribution Histogram (Right)
    if (isSplit) {
      this.renderDistribution(ctx, state, leftWidth, 0, rightWidth, h);
    } else {
      this.renderDistribution(ctx, state, 0, h * 0.55, w, h * 0.45);
    }

    // Viewport Divider
    if (isSplit) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftWidth, 20);
      ctx.lineTo(leftWidth, h - 20);
      ctx.stroke();
    }
  }

  private renderChamber(
    ctx: CanvasRenderingContext2D,
    state: GasState,
    x0: number,
    y0: number,
    w: number,
    h: number
  ): void {
    // Top HUD Title
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('Chamber View (N Particles & Piston)', x0 + 24, y0 + 32);

    // Inset chamber rect to avoid left dock and top navigation
    const padLeft = w > 600 ? 140 : 40;
    const padRight = 60;
    const padTop = 60;
    const padBottom = 60;

    const chamberW = w - padLeft - padRight;
    const chamberH = h - padTop - padBottom;

    if (chamberW <= 50 || chamberH <= 50) return;

    // World to chamber pixel scaling (world height = 6.0m, world max width = 10.0m)
    const scale = Math.min(chamberW / 10.0, chamberH / state.chamberHeight);
    const boxPixelW = state.chamberWidth * scale;
    const boxPixelH = state.chamberHeight * scale;

    const originX = x0 + padLeft;
    const originY = y0 + padTop + (chamberH - boxPixelH) / 2;

    // Chamber background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(originX, originY, boxPixelW, boxPixelH);

    // Chamber perimeter walls
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(originX, originY, boxPixelW, boxPixelH);

    // Movable Piston Wall (Right)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(originX + boxPixelW, originY, 14, boxPixelH);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(originX + boxPixelW, originY, 14, boxPixelH);

    // Piston Handle
    ctx.fillStyle = '#475569';
    ctx.fillRect(originX + boxPixelW + 14, originY + boxPixelH / 2 - 8, 25, 16);

    // Particles
    const vRms = Math.max(1, state.vRms);
    for (const p of state.particles) {
      const px = originX + p.x * scale;
      const py = originY + boxPixelH - p.y * scale;
      const pr = Math.max(2.5, p.radius * scale * 1.5);

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      // Speed-dependent thermal coloring
      if (speed < 0.65 * vRms) {
        ctx.fillStyle = '#38bdf8'; // Cold / Slow - Sky Blue
      } else if (speed <= 1.35 * vRms) {
        ctx.fillStyle = '#34d399'; // Medium - Emerald
      } else {
        ctx.fillStyle = '#f87171'; // Hot / Fast - Coral Red
      }

      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chamber Dimension & Area Readout
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText(`Lx = ${state.chamberWidth.toFixed(2)}m (Area = ${(state.chamberWidth * state.chamberHeight).toFixed(1)}m²)`, originX + boxPixelW / 2, originY + boxPixelH + 20);
  }

  private renderDistribution(
    ctx: CanvasRenderingContext2D,
    state: GasState,
    x0: number,
    y0: number,
    w: number,
    h: number
  ): void {
    // Header
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('Maxwell-Boltzmann Speed Distribution f(v)', x0 + 24, y0 + 32);

    const padLeft = 60;
    const padRight = 36;
    const padTop = 60;
    const padBottom = 60;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    if (plotW <= 50 || plotH <= 50) return;

    const originX = x0 + padLeft;
    const originY = y0 + padTop;

    // Plot Background
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(originX, originY, plotW, plotH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(originX, originY, plotW, plotH);

    // Theoretical Maxwell-Boltzmann curve parameters in 2D:
    // P(v) = (m*v / (k_B*T)) * exp(- m*v^2 / (2*k_B*T))
    // Mode speed v_p = sqrt(k_B*T / m). Peak height P(v_p) = sqrt(m / (k_B*T)) * exp(-0.5)
    const T = Math.max(10, state.temperature);
    const m = Math.max(0.1, state.particleMass ?? 1.0);
    const sigma2 = (BOLTZMANN_K * T) / m;
    const theoreticalPeak = Math.sqrt(1 / (sigma2 * Math.E));
    const maxDensityScale = theoreticalPeak * 1.35;

    // Histogram Bins & Empirical Probability Density f_hat(v) = count / (N * binWidth)
    const bins = state.speedHistogram;
    const binCount = bins.length;
    const maxSpeed = state.histogramMaxSpeed;
    const totalN = Math.max(1, state.particles.length);
    const binWidth = maxSpeed / binCount;
    const barW = plotW / binCount;

    // Draw Histogram Bars normalized to identical probability density axis
    for (let i = 0; i < binCount; i++) {
      const count = bins[i];
      const empiricalDensity = count / (totalN * binWidth);
      const barH = Math.min(plotH, (empiricalDensity / maxDensityScale) * plotH);
      const bx = originX + i * barW;
      const by = originY + plotH - barH;

      ctx.fillStyle = 'rgba(99, 102, 241, 0.45)';
      ctx.fillRect(bx + 1, by, barW - 2, barH);
      ctx.strokeStyle = '#6366f1';
      ctx.strokeRect(bx + 1, by, barW - 2, barH);
    }

    // Theoretical Curve overlay
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b'; // Amber / Gold
    ctx.lineWidth = 2.5;

    const curveSteps = 120;
    let first = true;

    for (let s = 0; s <= curveSteps; s++) {
      const frac = s / curveSteps;
      const v = frac * maxSpeed;
      const prob = (v / sigma2) * Math.exp(-(v * v) / (2 * sigma2));
      const normY = Math.min(plotH, (prob / maxDensityScale) * plotH);

      const sx = originX + frac * plotW;
      const sy = originY + plotH - normY;

      if (first) {
        ctx.moveTo(sx, sy);
        first = false;
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();

    // v_rms vertical line
    const vRmsFrac = Math.min(1.0, state.vRms / maxSpeed);
    const rmsX = originX + vRmsFrac * plotW;

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#ef4444'; // Red for v_rms
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rmsX, originY);
    ctx.lineTo(rmsX, originY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // v_rms legend label
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText(`v_rms: ${state.vRms.toFixed(1)} m/s`, rmsX, originY + 16);

    // Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Molecular Speed v (m/s) →', originX + plotW / 2, originY + plotH + 24);

    ctx.save();
    ctx.translate(originX - 16, originY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Probability Density f(v) ↑', 0, 0);
    ctx.restore();
  }

  unmount(): void {
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    this.ctx = null;
  }
}

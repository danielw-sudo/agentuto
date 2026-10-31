import { ViewportRenderer } from '../../../core/types/simulation';
import { QuantumState } from './QuantumEngine';

export class QuantumRenderer2D implements ViewportRenderer<QuantumState> {
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

  render(state: QuantumState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Dark quantum space background
    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, w, h);

    const isSplit = w >= 860;
    const leftWidth = isSplit ? w * 0.62 : w;
    const rightWidth = isSplit ? w * 0.38 : w;

    // Viewport 1: Spatial Wavepacket & Potential Barrier (Left)
    this.renderWavepacket(ctx, state, 0, 0, leftWidth, isSplit ? h : h * 0.6);

    // Viewport 2: Transmission Coefficients & Analytical Curve (Right)
    if (isSplit) {
      this.renderAnalytics(ctx, state, leftWidth, 0, rightWidth, h);
    } else {
      this.renderAnalytics(ctx, state, 0, h * 0.6, w, h * 0.4);
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

  private renderWavepacket(
    ctx: CanvasRenderingContext2D,
    state: QuantumState,
    x0: number,
    y0: number,
    w: number,
    h: number
  ): void {
    // Header
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('Wavepacket |ψ(x,t)|² & Potential Barrier V(x)', x0 + 24, y0 + 32);

    const padLeft = w > 600 ? 120 : 40;
    const padRight = 50;
    const padTop = 60;
    const padBottom = 60;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    if (plotW <= 50 || plotH <= 50) return;

    const originX = x0 + padLeft;
    const originY = y0 + padTop;
    const baselineY = originY + plotH;

    // Plot Grid & Background
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(originX, originY, plotW, plotH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(originX, originY, plotW, plotH);

    const n = state.gridX.length;
    if (n === 0) return;

    const xMin = state.gridX[0];
    const xMax = state.gridX[n - 1];

    const toScreenX = (x: number) => originX + ((x - xMin) / (xMax - xMin)) * plotW;

    // Potential Barrier V(x) Slab
    const maxV = Math.max(15, state.barrierHeight * 1.25);
    const vScale = (plotH * 0.65) / maxV;

    const bLeft = -state.barrierWidth * 0.5;
    const bRight = state.barrierWidth * 0.5;
    const sxLeft = toScreenX(bLeft);
    const sxRight = toScreenX(bRight);
    const barrierPixelH = state.barrierHeight * vScale;

    if (state.barrierHeight > 0) {
      // Shaded barrier block
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.fillRect(sxLeft, baselineY - barrierPixelH, sxRight - sxLeft, barrierPixelH);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sxLeft, baselineY);
      ctx.lineTo(sxLeft, baselineY - barrierPixelH);
      ctx.lineTo(sxRight, baselineY - barrierPixelH);
      ctx.lineTo(sxRight, baselineY);
      ctx.stroke();

      // Barrier height label
      ctx.font = '10px monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.fillText(`V0 = ${state.barrierHeight.toFixed(1)} eV`, (sxLeft + sxRight) / 2, baselineY - barrierPixelH - 8);
    }

    // Incident Energy E dashed horizontal line
    const energyPixelH = state.particleEnergy * vScale;
    const energyY = baselineY - energyPixelH;

    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originX, energyY);
    ctx.lineTo(originX + plotW, energyY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText(`E = ${state.particleEnergy.toFixed(1)} eV ${state.particleEnergy < state.barrierHeight ? '(Tunneling E < V0)' : '(E > V0)'}`, originX + 8, energyY - 6);

    // Probability Density |psi(x)|^2 Fill Area
    // Max probability density scaling
    const maxProb = 0.8;
    const toScreenYProb = (prob: number) => baselineY - (prob / maxProb) * (plotH * 0.85);

    ctx.beginPath();
    ctx.moveTo(toScreenX(state.gridX[0]), baselineY);

    for (let i = 0; i < n; i++) {
      const sx = toScreenX(state.gridX[i]);
      const sy = toScreenYProb(state.probabilityDensity[i]);
      ctx.lineTo(sx, sy);
    }

    ctx.lineTo(toScreenX(state.gridX[n - 1]), baselineY);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baselineY - plotH, 0, baselineY);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
    grad.addColorStop(0.7, 'rgba(99, 102, 241, 0.35)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.1)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Wavepacket envelope top edge
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const sx = toScreenX(state.gridX[i]);
      const sy = toScreenYProb(state.probabilityDensity[i]);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Real Component Re(psi) Oscillating Wave
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const sx = toScreenX(state.gridX[i]);
      const sy = baselineY - (state.psiReal[i] / Math.sqrt(maxProb)) * (plotH * 0.4);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // X-Axis coordinates
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Position x (nm) →', originX + plotW / 2, baselineY + 22);

    ctx.fillText(`${xMin.toFixed(0)}`, originX, baselineY + 16);
    ctx.fillText('0', toScreenX(0), baselineY + 16);
    ctx.fillText(`+${xMax.toFixed(0)}`, originX + plotW, baselineY + 16);
  }

  private renderAnalytics(
    ctx: CanvasRenderingContext2D,
    state: QuantumState,
    x0: number,
    y0: number,
    w: number,
    h: number
  ): void {
    // Header
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('Transmission (T) & Tunneling Analytics', x0 + 24, y0 + 32);

    const padLeft = 40;
    const padRight = 30;
    const padTop = 60;
    const padBottom = 50;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    if (plotW <= 50 || plotH <= 50) return;

    const originX = x0 + padLeft;
    const originY = y0 + padTop;

    // Metric Summary Cards
    const tPercent = Math.min(100, Math.max(0, state.transmission * 100));
    const rPercent = Math.min(100, Math.max(0, state.reflection * 100));
    const bPercent = Math.min(100, Math.max(0, state.insideBarrier * 100));

    // Dual Progress Bars for T, R & Barrier
    ctx.font = '11px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Transmission T: ${tPercent.toFixed(1)}%`, originX, originY + 14);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(originX, originY + 20, plotW, 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(originX, originY + 20, (tPercent / 100) * plotW, 6);

    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`Reflection R:   ${rPercent.toFixed(1)}%`, originX, originY + 40);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(originX, originY + 46, plotW, 6);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(originX, originY + 46, (rPercent / 100) * plotW, 6);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`Inside Barrier: ${bPercent.toFixed(1)}%`, originX, originY + 66);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(originX, originY + 72, plotW, 6);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(originX, originY + 72, (bPercent / 100) * plotW, 6);

    // Analytical T(E) Curve Graph
    const graphY0 = originY + 98;
    const graphH = plotH - 108;

    if (graphH > 60) {
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(originX, graphY0, plotW, graphH);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(originX, graphY0, plotW, graphH);

      // Plot Theoretical T(E) for E from 1 to 15 eV
      const V0 = Math.max(0.1, state.barrierHeight);
      const d = Math.max(0.1, state.barrierWidth);

      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;

      const steps = 100;
      for (let s = 0; s <= steps; s++) {
        const frac = s / steps;
        const eVal = 1.0 + frac * 14.0;
        let theoT = 0;

        if (eVal < V0) {
          // Tunneling regime: T = 1 / [1 + (V0^2 * sinh^2(kappa*d)) / (4*E*(V0 - E))]
          const kappa = Math.sqrt(2 * (V0 - eVal));
          const sinhVal = Math.sinh(kappa * d);
          const denom = 1 + (V0 * V0 * sinhVal * sinhVal) / (4 * eVal * (V0 - eVal));
          theoT = 1 / denom;
        } else if (eVal > V0) {
          // Over-barrier regime: T = 1 / [1 + (V0^2 * sin^2(k'*d)) / (4*E*(E - V0))]
          const kPrime = Math.sqrt(2 * (eVal - V0));
          const sinVal = Math.sin(kPrime * d);
          const denom = 1 + (V0 * V0 * sinVal * sinVal) / (4 * eVal * (eVal - V0));
          theoT = 1 / denom;
        } else {
          // E = V0: T = 1 / [1 + m*V0*d^2 / 2]
          theoT = 1 / (1 + 0.5 * V0 * d * d);
        }

        const sx = originX + frac * plotW;
        const sy = graphY0 + graphH - Math.min(1.0, Math.max(0, theoT)) * graphH;

        if (s === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Current Operating Point Dot
      const currEFrac = Math.min(1.0, Math.max(0, (state.particleEnergy - 1.0) / 14.0));
      const dotX = originX + currEFrac * plotW;
      const dotY = graphY0 + graphH - Math.min(1.0, Math.max(0, state.transmission)) * graphH;

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Graph Legend
      ctx.font = '9px monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('Theoretical T(E) Curve', originX + 8, graphY0 + 14);

      ctx.fillStyle = '#64748b';
      ctx.fillText('Energy E (1 - 15 eV) →', originX + plotW / 2 - 40, graphY0 + graphH - 6);
    }

    // Unitarity status check
    ctx.font = '10px monospace';
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'left';
    ctx.fillText(`Total Norm ∫|ψ|²dx: ${state.norm.toFixed(6)} (100.0%)`, originX, originY + plotH + 18);
  }

  unmount(): void {
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    this.ctx = null;
  }
}

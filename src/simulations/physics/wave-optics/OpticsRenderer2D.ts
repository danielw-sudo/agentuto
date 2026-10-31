import { ViewportRenderer } from '../../../core/types/simulation';
import { OpticsState } from './OpticsEngine';

export class OpticsRenderer2D implements ViewportRenderer<OpticsState> {
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

  render(state: OpticsState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Dark optical table background
    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, w, h);

    const isSplit = w >= 860;
    const leftWidth = isSplit ? w * 0.48 : w;
    const rightWidth = isSplit ? w * 0.52 : w;

    // Viewport 1: Optical Bench & Huygens Wavefronts (Left)
    this.renderBench(ctx, state, 0, 0, leftWidth, isSplit ? h : h * 0.52);

    // Viewport 2: Screen Projection & Photometric Intensity Curve (Right)
    if (isSplit) {
      this.renderScreenPattern(ctx, state, leftWidth, 0, rightWidth, h);
    } else {
      this.renderScreenPattern(ctx, state, 0, h * 0.52, w, h * 0.48);
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

  private renderBench(
    ctx: CanvasRenderingContext2D,
    state: OpticsState,
    x0: number,
    y0: number,
    w: number,
    h: number
  ): void {
    // Header
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('Optical Bench & Huygens Wavefronts', x0 + 24, y0 + 32);

    const padLeft = w > 600 ? 110 : 36;
    const padRight = 36;
    const padTop = 60;
    const padBottom = 50;

    const benchW = w - padLeft - padRight;
    const benchH = h - padTop - padBottom;

    if (benchW <= 50 || benchH <= 50) return;

    const originX = x0 + padLeft;
    const originY = y0 + padTop;
    const centerY = originY + benchH / 2;

    // Bench Grid Background
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(originX, originY, benchW, benchH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(originX, originY, benchW, benchH);

    const [r, g, b] = state.rgbColor;
    const laserColorStr = `rgb(${r}, ${g}, ${b})`;
    const laserGlowStr = `rgba(${r}, ${g}, ${b}, 0.25)`;

    // 1. Laser Emitter (Left)
    const laserX = originX + 25;
    const laserW = 40;
    const laserH = 30;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(laserX, centerY - laserH / 2, laserW, laserH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(laserX, centerY - laserH / 2, laserW, laserH);

    // Laser nozzle
    ctx.fillStyle = '#334155';
    ctx.fillRect(laserX + laserW, centerY - 5, 8, 10);

    // 2. Collimated Laser Beam from emitter to barrier
    const barrierX = originX + benchW * 0.42;
    const beamGrad = ctx.createLinearGradient(laserX + laserW, 0, barrierX, 0);
    beamGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
    beamGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.5)`);

    ctx.fillStyle = beamGrad;
    ctx.fillRect(laserX + laserW + 8, centerY - 6, barrierX - (laserX + laserW + 8), 12);

    // Beam Core Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(laserX + laserW + 8, centerY);
    ctx.lineTo(barrierX, centerY);
    ctx.stroke();

    // 3. Double/Multi-Slit Barrier
    const barrierW = 8;
    const barrierTop = originY + 15;
    const barrierBottom = originY + benchH - 15;

    ctx.fillStyle = '#020617';
    ctx.fillRect(barrierX, barrierTop, barrierW, barrierBottom - barrierTop);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(barrierX, barrierTop, barrierW, barrierBottom - barrierTop);

    // Slit Openings
    const slitCount = Math.max(1, state.slitCount);
    const slitSpacingPixels = state.slitSeparation > 0 ? Math.min(35, Math.max(6, state.slitSeparation * 0.7)) : 0;
    const slitHeight = 4;

    const slitPositionsY: number[] = [];
    if (slitCount === 1 || slitSpacingPixels === 0) {
      slitPositionsY.push(centerY);
    } else {
      const totalSpan = (slitCount - 1) * slitSpacingPixels;
      const startY = centerY - totalSpan / 2;
      for (let s = 0; s < slitCount; s++) {
        slitPositionsY.push(startY + s * slitSpacingPixels);
      }
    }

    // Cut out clear slit apertures
    for (const sy of slitPositionsY) {
      ctx.fillStyle = laserColorStr;
      ctx.fillRect(barrierX - 1, sy - slitHeight / 2, barrierW + 2, slitHeight);
    }

    // 4. Propagating Huygens Wavefront Ripples (Circular waves from each slit)
    const animPhase = (state.time * 25) % 18;
    ctx.save();
    ctx.beginPath();
    ctx.rect(barrierX + barrierW, originY, originX + benchW - (barrierX + barrierW), benchH);
    ctx.clip();

    ctx.strokeStyle = laserGlowStr;
    ctx.lineWidth = 1.5;

    for (let rWave = animPhase; rWave < benchW * 0.75; rWave += 18) {
      for (const sy of slitPositionsY) {
        ctx.beginPath();
        ctx.arc(barrierX + barrierW, sy, rWave, -Math.PI / 2.3, Math.PI / 2.3);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 5. Detection Screen Barrier (Right edge)
    const screenX = originX + benchW - 12;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(screenX, barrierTop, 6, barrierBottom - barrierTop);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(screenX, barrierTop, 6, barrierBottom - barrierTop);

    // Labels
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText(`Slits (N=${slitCount}, d=${state.slitSeparation}μm)`, barrierX, barrierTop - 6);
    ctx.fillText(`Screen (L=${state.screenDistance.toFixed(1)}m)`, screenX, barrierTop - 6);
  }

  private renderScreenPattern(
    ctx: CanvasRenderingContext2D,
    state: OpticsState,
    x0: number,
    y0: number,
    w: number,
    h: number
  ): void {
    // Header
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('Screen Projection & Photometric Intensity I(y)', x0 + 24, y0 + 32);

    const padLeft = 40;
    const padRight = 30;
    const padTop = 60;
    const padBottom = 50;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    if (plotW <= 50 || plotH <= 50) return;

    const originX = x0 + padLeft;
    const originY = y0 + padTop;

    const [r, g, b] = state.rgbColor;
    const laserColorStr = `rgb(${r}, ${g}, ${b})`;

    // Part 1: Physical Laser Screen Projection Bar (Top 36px)
    const barH = 34;
    const barY = originY;

    ctx.fillStyle = '#020617';
    ctx.fillRect(originX, barY, plotW, barH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(originX, barY, plotW, barH);

    const nPoints = state.intensity.length;
    if (nPoints > 0) {
      const stepW = plotW / nPoints;
      for (let i = 0; i < nPoints; i++) {
        const I = Math.min(1.0, Math.max(0, state.intensity[i]));
        const alpha = Math.pow(I, 0.7); // Perceptual gamma correction for realistic glare
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(originX + i * stepW, barY, stepW + 1, barH);
      }
    }

    // Part 2: Photometric Intensity Graph I(y)
    const graphY0 = barY + barH + 24;
    const graphH = plotH - barH - 34;

    if (graphH <= 40) return;

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(originX, graphY0, plotW, graphH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(originX, graphY0, plotW, graphH);

    // Centerline (y = 0)
    const centerX = originX + plotW / 2;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(centerX, graphY0);
    ctx.lineTo(centerX, graphY0 + graphH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Single-Slit Diffraction Envelope sinc²(beta) (Dotted amber line)
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < nPoints; i++) {
      const sx = originX + (i / (nPoints - 1)) * plotW;
      const sy = graphY0 + graphH - state.envelope[i] * (graphH * 0.92);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Total Intensity I(y) Curve
    ctx.beginPath();
    ctx.strokeStyle = laserColorStr;
    ctx.lineWidth = 2.2;
    for (let i = 0; i < nPoints; i++) {
      const sx = originX + (i / (nPoints - 1)) * plotW;
      const sy = graphY0 + graphH - state.intensity[i] * (graphH * 0.92);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Fill under intensity curve
    ctx.lineTo(originX + plotW, graphY0 + graphH);
    ctx.lineTo(originX, graphY0 + graphH);
    ctx.closePath();
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
    ctx.fill();

    // Measured Quantities Annotation
    ctx.font = '10px monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'left';
    ctx.fillText('--- Diffraction Envelope sinc²(β)', originX + 10, graphY0 + 16);

    ctx.fillStyle = laserColorStr;
    ctx.fillText(`— Intensity I(y) [λ = ${state.wavelength.toFixed(0)} nm]`, originX + 10, graphY0 + 30);

    // Readouts for Fringe Spacing & Envelope Width
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    if (state.fringeSpacingMm > 0) {
      ctx.fillText(`Fringe Spacing Δy = ${state.fringeSpacingMm.toFixed(2)} mm`, originX + plotW - 10, graphY0 + 16);
    }
    ctx.fillText(`Central Envelope 2λL/a = ${state.envelopeWidthMm.toFixed(2)} mm`, originX + plotW - 10, graphY0 + 30);

    // Screen Axis Coordinates (in millimeters: +/- 40 mm)
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('Screen Coordinate y (mm) →', centerX, graphY0 + graphH + 20);

    ctx.fillText('-40 mm', originX, graphY0 + graphH + 16);
    ctx.fillText('0', centerX, graphY0 + graphH + 16);
    ctx.fillText('+40 mm', originX + plotW, graphY0 + graphH + 16);
  }

  unmount(): void {
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    this.ctx = null;
  }
}

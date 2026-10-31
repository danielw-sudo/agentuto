import { ViewportRenderer } from '../../../core/types/simulation';
import { LcrState } from './LcrEngine';

export class LcrRenderer2D implements ViewportRenderer<LcrState> {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 800;
  private height: number = 600;

  // Drift particle charges for circuit visualization
  private electronPhase: number = 0;

  mount(container: HTMLElement | HTMLCanvasElement): void {
    if (container instanceof HTMLCanvasElement) {
      this.canvas = container;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      container.appendChild(this.canvas);
    }

    this.ctx = this.canvas.getContext('2d');
    this.resize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (!this.canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  render(state: LcrState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Advance drift particle phase proportional to current
    this.electronPhase += state.current * 0.08;

    // 1. Clear background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // Layout partitioning:
    // Left side: Circuit Diagram
    // Right side top: Complex Phasor Diagram
    // Bottom: Dual-Trace Oscilloscope
    const midX = Math.floor(w * 0.58);
    const midY = Math.floor(h * 0.52);

    this.renderCircuitSchematic(ctx, 20, 20, midX - 30, midY - 30, state);
    this.renderPhasorDiagram(ctx, midX, 20, w - midX - 20, midY - 30, state);
    this.renderOscilloscope(ctx, 20, midY, w - 40, h - midY - 20, state);
  }

  private renderCircuitSchematic(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    state: LcrState
  ): void {
    // Panel border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Title badge
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('RLC SERIES SCHEMATIC & DRIFT CURRENT', x + 12, y + 18);

    // Circuit loop dimensions
    const padX = Math.max(30, Math.floor(w * 0.12));
    const padY = Math.max(30, Math.floor(h * 0.16));
    const left = x + padX;
    const right = x + w - padX;
    const top = y + padY + 10;
    const bottom = y + h - padY;

    // Draw main wire loop
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.strokeRect(left, top, right - left, bottom - top);

    // 1. Left branch: AC Source Generator (circle at center left)
    const srcY = (top + bottom) / 2;
    const srcR = 18;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(left - srcR, srcY - srcR, srcR * 2, srcR * 2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(left, srcY, srcR, 0, Math.PI * 2);
    ctx.stroke();

    // Wave symbol ~ inside generator
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(left - 8, srcY);
    ctx.bezierCurveTo(left - 4, srcY - 7, left - 2, srcY - 7, left, srcY);
    ctx.bezierCurveTo(left + 2, srcY + 7, left + 4, srcY + 7, left + 8, srcY);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`V(t)=${state.vSource.toFixed(1)}V`, left - srcR - 6, srcY + 4);

    // 2. Top branch: Resistor (zigzag at center top)
    const midTopX = (left + right) / 2;
    const rLen = 40;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(midTopX - rLen / 2 - 4, top - 10, rLen + 8, 20);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(midTopX - rLen / 2, top);
    const zSteps = 5;
    for (let k = 0; k < zSteps; k++) {
      const zx = midTopX - rLen / 2 + (k + 0.5) * (rLen / zSteps);
      const zy = top + (k % 2 === 0 ? -7 : 7);
      ctx.lineTo(zx, zy);
    }
    ctx.lineTo(midTopX + rLen / 2, top);
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`R (VR=${state.vR.toFixed(1)}V)`, midTopX, top - 14);

    // 3. Right branch: Inductor (coiled arcs at center right)
    const indY = (top + bottom) / 2;
    const iLen = 40;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(right - 10, indY - iLen / 2 - 4, 20, iLen + 8);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const loops = 4;
    for (let k = 0; k < loops; k++) {
      const ly1 = indY - iLen / 2 + (k * iLen) / loops;
      const ly2 = indY - iLen / 2 + ((k + 1) * iLen) / loops;
      const midLy = (ly1 + ly2) / 2;
      ctx.arc(right + 2, midLy, (ly2 - ly1) / 2, -Math.PI / 2, Math.PI / 2);
    }
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'left';
    ctx.fillText(`L (VL=${state.vL.toFixed(1)}V)`, right + 16, indY + 4);

    // 4. Bottom branch: Capacitor (two parallel plates at center bottom)
    const midBotX = (left + right) / 2;
    const capGap = 12;
    const plateH = 24;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(midBotX - 16, bottom - plateH / 2 - 2, 32, plateH + 4);

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    // Left plate
    ctx.beginPath();
    ctx.moveTo(midBotX - capGap / 2, bottom - plateH / 2);
    ctx.lineTo(midBotX - capGap / 2, bottom + plateH / 2);
    ctx.stroke();

    // Right plate
    ctx.beginPath();
    ctx.moveTo(midBotX + capGap / 2, bottom - plateH / 2);
    ctx.lineTo(midBotX + capGap / 2, bottom + plateH / 2);
    ctx.stroke();

    // Reconnect wire leads
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(midBotX - capGap / 2, bottom);
    ctx.moveTo(midBotX + capGap / 2, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    ctx.fillStyle = '#22d3ee';
    ctx.textAlign = 'center';
    ctx.fillText(`C (VC=${state.vC.toFixed(1)}V, q=${(state.charge * 1e6).toFixed(1)}μC)`, midBotX, bottom + 24);

    // 5. Flowing Electron Particles along the wire loop
    const perimeter = 2 * (right - left + bottom - top);
    const numElectrons = 32;

    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 6;

    for (let e = 0; e < numElectrons; e++) {
      // Offset along perimeter
      let s = ((e / numElectrons) * perimeter + this.electronPhase * 20) % perimeter;
      if (s < 0) s += perimeter;

      let ex = left;
      let ey = top;
      const wSide = right - left;
      const hSide = bottom - top;

      if (s < wSide) {
        // Top edge: left -> right
        ex = left + s;
        ey = top;
      } else if (s < wSide + hSide) {
        // Right edge: top -> bottom
        ex = right;
        ey = top + (s - wSide);
      } else if (s < 2 * wSide + hSide) {
        // Bottom edge: right -> left
        ex = right - (s - wSide - hSide);
        ey = bottom;
      } else {
        // Left edge: bottom -> top
        ex = left;
        ey = bottom - (s - 2 * wSide - hSide);
      }

      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  private renderPhasorDiagram(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    state: LcrState
  ): void {
    // Border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Title badge
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('COMPLEX PHASOR DIAGRAM', x + 12, y + 18);

    const centerX = x + w / 2;
    const centerY = y + h / 2 + 8;
    const maxRadius = Math.min(w, h) * 0.38;

    // Cross axes (Re and Im)
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(centerX - maxRadius - 10, centerY);
    ctx.lineTo(centerX + maxRadius + 10, centerY);
    ctx.moveTo(centerX, centerY - maxRadius - 10);
    ctx.lineTo(centerX, centerY + maxRadius + 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Axes labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Re (I)', centerX + maxRadius + 10, centerY - 6);
    ctx.textAlign = 'center';
    ctx.fillText('+j (Im)', centerX, centerY - maxRadius - 14);

    // Max scale factor to fit within maxRadius
    const maxV = Math.max(12, Math.abs(state.vSource), Math.abs(state.vR), Math.abs(state.vL), Math.abs(state.vC));
    const scale = maxRadius / maxV;

    // Current Phasor I (reference along horizontal +Re)
    const lenI = Math.min(maxRadius * 0.8, Math.max(15, Math.abs(state.current) * scale * 25));
    this.drawPhasor(ctx, centerX, centerY, lenI, 0, '#38bdf8', 'I');

    // VR Phasor (along +Re)
    const lenVR = Math.abs(state.vR) * scale;
    if (lenVR > 2) {
      this.drawPhasor(ctx, centerX, centerY, lenVR, 0, '#c084fc', 'VR');
    }

    // VL Phasor (leads current by +90 deg -> upwards on canvas, which is -y)
    const lenVL = Math.abs(state.vL) * scale;
    if (lenVL > 2) {
      this.drawPhasor(ctx, centerX, centerY, lenVL, -Math.PI / 2, '#34d399', 'VL');
    }

    // VC Phasor (lags current by -90 deg -> downwards on canvas, which is +y)
    const lenVC = Math.abs(state.vC) * scale;
    if (lenVC > 2) {
      this.drawPhasor(ctx, centerX, centerY, lenVC, Math.PI / 2, '#22d3ee', 'VC');
    }

    // Resultant Source Voltage V0 at angle -phaseAngle (screen y is inverted)
    const lenV0 = Math.max(10, Math.abs(state.vSource) * scale);
    const phiRad = -(state.phaseAngleDeg * Math.PI) / 180;
    this.drawPhasor(ctx, centerX, centerY, lenV0, phiRad, '#f59e0b', 'V₀');

    // Phase angle readout badge
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`φ = ${state.phaseAngleDeg.toFixed(1)}°`, x + w - 14, y + 18);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'right';
    const nature = state.phaseAngleDeg > 1 ? 'Inductive (Lag)' : state.phaseAngleDeg < -1 ? 'Capacitive (Lead)' : 'Resonant (In Phase)';
    ctx.fillText(nature, x + w - 14, y + 32);
  }

  private drawPhasor(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    len: number,
    angle: number,
    color: string,
    label: string
  ): void {
    const ex = ox + len * Math.cos(angle);
    const ey = oy + len * Math.sin(angle);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Arrow head
    const headLen = 6;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.font = 'bold 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(label, ex + 8 * Math.cos(angle), ey + 8 * Math.sin(angle));
  }

  private renderOscilloscope(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    state: LcrState
  ): void {
    // Outer border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Title badge & legend
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DUAL-TRACE OSCILLOSCOPE', x + 12, y + 18);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('━ Driving Voltage V(t)', x + 210, y + 18);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('━ Current I(t)', x + 380, y + 18);

    // Oscilloscope Screen Graticule
    const oscX = x + 14;
    const oscY = y + 30;
    const oscW = w - 28;
    const oscH = h - 42;

    ctx.fillStyle = '#030712';
    ctx.fillRect(oscX, oscY, oscW, oscH);

    // Graticule Grid
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const hDivs = 8;
    for (let row = 0; row <= hDivs; row++) {
      const gy = oscY + (row / hDivs) * oscH;
      ctx.beginPath();
      ctx.moveTo(oscX, gy);
      ctx.lineTo(oscX + oscW, gy);
      ctx.stroke();
    }

    // Vertical grid lines
    const vDivs = 12;
    for (let col = 0; col <= vDivs; col++) {
      const gx = oscX + (col / vDivs) * oscW;
      ctx.beginPath();
      ctx.moveTo(gx, oscY);
      ctx.lineTo(gx, oscY + oscH);
      ctx.stroke();
    }

    // Center baseline
    const centerY = oscY + oscH / 2;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.beginPath();
    ctx.moveTo(oscX, centerY);
    ctx.lineTo(oscX + oscW, centerY);
    ctx.stroke();

    const vBuf = state.voltageHistory;
    const iBuf = state.currentHistory;
    const pts = vBuf.length;

    if (pts > 1) {
      // Auto-scale factor for voltage
      const maxV = 20;
      const vScale = (oscH * 0.4) / maxV;

      // Auto-scale factor for current
      const maxI = Math.max(0.5, state.theoreticalPeakCurrent * 1.25);
      const iScale = (oscH * 0.4) / maxI;

      // Trace 1: Voltage V(t) in Amber
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      for (let k = 0; k < pts; k++) {
        const px = oscX + (k / (pts - 1)) * oscW;
        const py = centerY - vBuf[k] * vScale;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Trace 2: Current I(t) in Azure
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      for (let k = 0; k < pts; k++) {
        const px = oscX + (k / (pts - 1)) * oscW;
        const py = centerY - iBuf[k] * iScale;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Telemetry readout badge at bottom right of oscilloscope
    ctx.fillStyle = '#64748b';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      `f=${state.resonantFrequency.toFixed(1)}Hz (Resonant) | Z=${state.impedance.toFixed(1)}Ω | Q=${state.qualityFactor.toFixed(2)}`,
      oscX + oscW - 10,
      oscY + oscH - 8
    );
  }

  unmount(): void {
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}

import { ViewportRenderer } from '../../../core/types/simulation';
import { TransientState } from './TransientEngine';

export class TransientRenderer2D implements ViewportRenderer<TransientState> {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 800;
  private height: number = 600;

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

  render(state: TransientState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Clear background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // Layout:
    // Left: Circuit schematic (~38% of w)
    // Right: Oscilloscope screen (~62% of w)
    const leftW = Math.min(340, w * 0.40);
    const rightX = leftW + 16;
    const rightW = w - rightX - 16;

    // 2. Render Circuit Schematic (Left)
    this.renderSchematic(ctx, state, 16, 16, leftW - 16, h - 60);

    // 3. Render Oscilloscope Screen (Right)
    this.renderOscilloscope(ctx, state, rightX, 16, rightW, h - 60);

    // 4. Bottom Guidance Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(16, h - 38, w - 32, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const isRL = state.circuitType === 1;
    const bottomText = isRL
      ? `RL Inductive Mode: Time constant τ = L/R = ${state.timeConstantMs.toFixed(2)} ms. Back EMF resists sudden current changes.`
      : `RC Capacitive Mode: Time constant τ = RC = ${state.timeConstantMs.toFixed(2)} ms. At t = τ, voltage reaches exactly (1 - 1/e) ≈ 63.2% of V₀.`;
    ctx.fillText(bottomText, w * 0.5, h - 22);
  }

  private renderSchematic(
    ctx: CanvasRenderingContext2D,
    state: TransientState,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Card background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      state.circuitType === 1 ? 'RL CIRCUIT SCHEMATIC' : 'RC CIRCUIT SCHEMATIC',
      x + 12,
      y + 20
    );

    // Circuit Loop Coordinates
    const loopLeft = x + 35;
    const loopRight = x + width - 35;
    const loopTop = y + 70;
    const loopBottom = y + height - 85;

    // 1. Draw Wires
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Top wire
    ctx.moveTo(loopLeft, loopTop);
    ctx.lineTo(loopRight, loopTop);
    // Right wire
    ctx.lineTo(loopRight, loopBottom);
    // Bottom wire
    ctx.lineTo(loopLeft, loopBottom);
    // Left wire
    ctx.lineTo(loopLeft, loopTop);
    ctx.stroke();

    // 2. Voltage Source (Left wire)
    const srcY = (loopTop + loopBottom) * 0.5;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(loopLeft, srcY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.inputVoltage > 0 ? `+${state.inputVoltage.toFixed(0)}V` : '0V', loopLeft, srcY + 4);

    // 3. Resistor (Top wire)
    const resX = (loopLeft + loopRight) * 0.5;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(resX - 28, loopTop - 12, 56, 24, 4);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`R (100Ω)`, resX, loopTop + 3);

    // 4. Reactive Component (Right wire: Capacitor or Inductor)
    const compY = (loopTop + loopBottom) * 0.5;
    if (state.circuitType === 0) {
      // Capacitor: Parallel Plates
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(loopRight - 14, compY - 18, 28, 36);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Top plate
      ctx.moveTo(loopRight - 12, compY - 6);
      ctx.lineTo(loopRight + 12, compY - 6);
      // Bottom plate
      ctx.moveTo(loopRight - 12, compY + 6);
      ctx.lineTo(loopRight + 12, compY + 6);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`C (100μF)`, loopRight + 18, compY + 3);
    } else {
      // Inductor: Helical Coils
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(loopRight - 14, compY - 20, 28, 40);

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let c = -15; c <= 15; c += 10) {
        ctx.arc(loopRight, compY + c, 6, -Math.PI / 2, Math.PI / 2);
      }
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`L (100mH)`, loopRight + 18, compY + 3);
    }

    // 5. Current Flow Arrow
    const curMag = Math.abs(state.currentMilliAmps);
    if (curMag > 1.0) {
      const arrX = resX;
      const arrY = loopBottom;
      ctx.strokeStyle = '#34d399';
      ctx.fillStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(arrX + 15, arrY);
      ctx.lineTo(arrX - 15, arrY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(arrX - 15, arrY);
      ctx.lineTo(arrX - 8, arrY - 4);
      ctx.lineTo(arrX - 8, arrY + 4);
      ctx.closePath();
      ctx.fill();

      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`I = ${state.currentMilliAmps.toFixed(1)} mA`, arrX, arrY - 8);
    }

    // 6. Component Status Box
    const boxY = loopBottom + 18;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 12, boxY, width - 24, height - (boxY - y) - 12, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`V_in:    ${state.inputVoltage.toFixed(1)} V`, x + 20, boxY + 16);
    ctx.fillText(`V_out:   ${state.componentVoltage.toFixed(2)} V`, x + 20, boxY + 30);
    ctx.fillText(`V_R:     ${state.resistorVoltage.toFixed(2)} V`, x + 20, boxY + 44);
    ctx.fillText(`Stored:  ${state.storedEnergyMilliJoules.toFixed(2)} mJ`, x + 20, boxY + 58);
  }

  private renderOscilloscope(
    ctx: CanvasRenderingContext2D,
    state: TransientState,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // CRT Scope Outer Bezel
    ctx.fillStyle = '#0b1320';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 10);
    ctx.fill();
    ctx.stroke();

    // Header Bezel
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DUAL-TRACE OSCILLOSCOPE', x + 16, y + 20);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '9px monospace';
    ctx.fillText('CH1: V_in(t) [Step Input]', x + 180, y + 20);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('CH2: V_out(t) [Relaxation]', x + 330, y + 20);

    // Graticule Screen Box
    const scrL = x + 16;
    const scrT = y + 32;
    const scrW = width - 32;
    const scrH = height - 48;

    ctx.fillStyle = '#040d1a';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(scrL, scrT, scrW, scrH, 4);
    ctx.fill();
    ctx.stroke();

    // 10 x 8 Graticule Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const cols = 10;
    const rows = 8;
    for (let c = 1; c < cols; c++) {
      const gx = scrL + (c / cols) * scrW;
      ctx.moveTo(gx, scrT);
      ctx.lineTo(gx, scrT + scrH);
    }
    for (let r = 1; r < rows; r++) {
      const gy = scrT + (r / rows) * scrH;
      ctx.moveTo(scrL, gy);
      ctx.lineTo(scrL + scrW, gy);
    }
    ctx.stroke();

    // Central Axes
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(scrL, scrT + scrH * 0.5);
    ctx.lineTo(scrL + scrW, scrT + scrH * 0.5);
    ctx.moveTo(scrL + scrW * 0.5, scrT);
    ctx.lineTo(scrL + scrW * 0.5, scrT + scrH);
    ctx.stroke();

    // Render Waveforms from History
    const hist = state.history;
    if (hist.length > 2) {
      const vMax = 15.0; // 15 Volts full scale

      const mapY = (v: number) => {
        const norm = v / vMax; // 0 to 1
        return scrT + scrH * 0.85 - norm * (scrH * 0.7);
      };

      // Trace 1: Channel 1 Input Voltage (Yellow)
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const hx = scrL + (i / (hist.length - 1)) * scrW;
        const hy = mapY(hist[i].vin);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.stroke();

      // Trace 2: Channel 2 Component Voltage (Cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      for (let i = 0; i < hist.length; i++) {
        const hx = scrL + (i / (hist.length - 1)) * scrW;
        const hy = mapY(hist[i].vout);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Theoretical 63.2% (1 - 1/e) Indicator Mark
    const v63 = 12.0 * 0.632; // 7.58 V
    const y63 = scrT + scrH * 0.85 - (v63 / 15.0) * (scrH * 0.7);

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(scrL, y63);
    ctx.lineTo(scrL + scrW, y63);
    ctx.stroke();

    ctx.fillStyle = '#f43f5e';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`63.2% (1-1/e) = ${v63.toFixed(1)}V`, scrL + scrW - 8, y63 - 4);
    ctx.restore();
  }

  unmount(): void {
    this.dispose();
  }

  dispose(): void {
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}

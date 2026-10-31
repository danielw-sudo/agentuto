import { ViewportRenderer } from '../../../core/types/simulation';
import { CarnotState } from './CarnotEngine';

export class CarnotRenderer2D implements ViewportRenderer<CarnotState> {
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

  render(state: CarnotState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Clear background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // Layout configuration:
    // Left: Cylinder apparatus (width: ~35% of w)
    // Right Top: P-V Indicator diagram
    // Right Bottom: T-S Diagram
    const leftPaneW = Math.min(320, w * 0.38);
    const rightPaneX = leftPaneW + 16;
    const rightPaneW = w - rightPaneX - 16;

    // 2. Render Piston-Cylinder Apparatus (Left Pane)
    this.renderPistonCylinder(ctx, state, 16, 16, leftPaneW - 16, h - 60);

    // 3. Render P-V Indicator Diagram (Right Top)
    const pvH = Math.floor((h - 80) * 0.52);
    this.renderPVDiagram(ctx, state, rightPaneX, 16, rightPaneW, pvH);

    // 4. Render T-S Diagram (Right Bottom)
    const tsY = 16 + pvH + 12;
    const tsH = h - tsY - 44;
    this.renderTSDiagram(ctx, state, rightPaneX, tsY, rightPaneW, tsH);

    // 5. Bottom Guidance Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(16, h - 38, w - 32, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const stageDesc =
      state.stageIndex === 1
        ? 'Stage 1 (Isothermal Expansion): Hot reservoir supplies heat Q_H at T_H; gas expands doing positive work W₁₂.'
        : state.stageIndex === 2
        ? 'Stage 2 (Adiabatic Expansion): Insulated (Q = 0); gas expands, internal energy drops, temperature cools to T_C.'
        : state.stageIndex === 3
        ? 'Stage 3 (Isothermal Compression): Cold reservoir absorbs exhaust heat |Q_C| at T_C; piston compresses gas.'
        : 'Stage 4 (Adiabatic Compression): Insulated (Q = 0); work done on gas restores temperature back to T_H.';
    ctx.fillText(stageDesc, w * 0.5, h - 22);
  }

  private renderPistonCylinder(
    ctx: CanvasRenderingContext2D,
    state: CarnotState,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Background card
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
    ctx.fillText('THERMODYNAMIC CYLINDER', x + 12, y + 20);

    // Cylinder Geometry
    const cylX = x + width * 0.5;
    const cylW = width * 0.65;
    const cylBottom = y + height - 80;
    const cylTop = y + 70;
    const maxCylHeight = cylBottom - cylTop;

    // Cylinder stroke: normalize volume between min (v1) and max (v3)
    const minV = state.states.state1.v;
    const maxV = state.states.state3.v;
    const vFraction = Math.min(1.0, Math.max(0.0, (state.volumeM3 - minV) / (maxV - minV || 1)));

    // Piston position: vFraction = 0 (compressed) to 1 (expanded)
    const pistonH = 14;
    const gasHeight = 35 + vFraction * (maxCylHeight - 60);
    const pistonY = cylBottom - gasHeight;

    // Draw Cylinder Walls
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cylX - cylW * 0.5, cylTop);
    ctx.lineTo(cylX - cylW * 0.5, cylBottom);
    ctx.lineTo(cylX + cylW * 0.5, cylBottom);
    ctx.lineTo(cylX + cylW * 0.5, cylTop);
    ctx.stroke();

    // Gas Fill with Temperature Glow
    const tRatio = Math.min(1.0, Math.max(0.0, (state.temperatureK - 250) / 450));
    const rCol = Math.floor(56 + tRatio * 180);
    const bCol = Math.floor(248 - tRatio * 180);
    ctx.fillStyle = `rgba(${rCol}, 100, ${bCol}, 0.25)`;
    ctx.fillRect(cylX - cylW * 0.5 + 2, pistonY, cylW - 4, gasHeight);

    // Movable Piston Head & Rod
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cylX - cylW * 0.5 + 2, pistonY - pistonH, cylW - 4, pistonH);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cylX - 6, cylTop - 15, 12, pistonY - pistonH - cylTop + 15);

    // Thermal Reservoir Contact at Base
    const resH = 40;
    const resY = cylBottom + 4;
    let resColor = '#334155';
    let resLabel = 'INSULATED (Q = 0)';

    if (state.stageIndex === 1) {
      resColor = '#ef4444';
      resLabel = `HOT SOURCE (T_H = ${state.temperatureK.toFixed(0)}K)`;
    } else if (state.stageIndex === 3) {
      resColor = '#0ea5e9';
      resLabel = `COLD SINK (T_C = ${state.temperatureK.toFixed(0)}K)`;
    }

    ctx.fillStyle = resColor;
    ctx.beginPath();
    ctx.roundRect(cylX - cylW * 0.5, resY, cylW, resH, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(resLabel, cylX, resY + 24);

    // Heat Flow Arrows
    if (state.stageIndex === 1) {
      // Heat in (upward red arrows)
      ctx.fillStyle = '#fca5a5';
      ctx.font = '10px monospace';
      ctx.fillText('↑ ↑ Q_H In ↑ ↑', cylX, cylBottom - 8);
    } else if (state.stageIndex === 3) {
      // Heat out (downward blue arrows)
      ctx.fillStyle = '#7dd3fc';
      ctx.font = '10px monospace';
      ctx.fillText('↓ ↓ Q_C Out ↓ ↓', cylX, cylBottom - 8);
    }

    // Cylinder Telemetry Readout
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`P: ${state.pressureAtm.toFixed(2)} atm (${(state.pressurePa / 1000).toFixed(0)} kPa)`, x + 12, y + 42);
    ctx.fillText(`V: ${state.volumeLiters.toFixed(1)} L`, x + 12, y + 56);
    ctx.fillText(`T: ${state.temperatureK.toFixed(1)} K`, x + 12, y + 70);
  }

  private renderPVDiagram(
    ctx: CanvasRenderingContext2D,
    state: CarnotState,
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
    ctx.fillText('P - V INDICATOR DIAGRAM', x + 12, y + 20);

    // Coordinate mapping
    const padL = 48;
    const padR = 24;
    const padT = 32;
    const padB = 28;

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const s1 = state.states.state1;
    const s2 = state.states.state2;
    const s3 = state.states.state3;
    const s4 = state.states.state4;

    const minV = s1.v * 0.8;
    const maxV = s3.v * 1.1;
    const minP = s3.p * 0.7;
    const maxP = s1.p * 1.15;

    const toX = (v: number) => x + padL + ((v - minV) / (maxV - minV)) * plotW;
    const toY = (p: number) => y + padT + (1.0 - (p - minP) / (maxP - minP)) * plotH;

    // Draw Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + padL, y + padT);
    ctx.lineTo(x + padL, y + padT + plotH);
    ctx.lineTo(x + padL + plotW, y + padT + plotH);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('P (kPa)', x + padL - 4, y + padT + 8);
    ctx.textAlign = 'left';
    ctx.fillText('V (Liters)', x + padL + plotW - 40, y + padT + plotH + 18);

    // Work Area Fill (Enclosed cycle)
    ctx.save();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.moveTo(toX(s1.v), toY(s1.p));
    // 1 -> 2 Isotherm
    for (let u = 0; u <= 1.0; u += 0.05) {
      const v = s1.v * Math.pow(s2.v / s1.v, u);
      const p = s1.p * (s1.v / v);
      ctx.lineTo(toX(v), toY(p));
    }
    // 2 -> 3 Adiabat
    for (let u = 0; u <= 1.0; u += 0.05) {
      const v = s2.v * Math.pow(s3.v / s2.v, u);
      const p = s2.p * Math.pow(s2.v / v, 1.667);
      ctx.lineTo(toX(v), toY(p));
    }
    // 3 -> 4 Isotherm
    for (let u = 0; u <= 1.0; u += 0.05) {
      const v = s3.v * Math.pow(s4.v / s3.v, u);
      const p = s3.p * (s3.v / v);
      ctx.lineTo(toX(v), toY(p));
    }
    // 4 -> 1 Adiabat
    for (let u = 0; u <= 1.0; u += 0.05) {
      const v = s4.v * Math.pow(s1.v / s4.v, u);
      const p = s4.p * Math.pow(s4.v / v, 1.667);
      ctx.lineTo(toX(v), toY(p));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw the 4 Cycle Paths with Distinct Stage Colors
    // 1 -> 2: Isothermal expansion (Red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let u = 0; u <= 1.0; u += 0.02) {
      const v = s1.v * Math.pow(s2.v / s1.v, u);
      const p = s1.p * (s1.v / v);
      const sx = toX(v);
      const sy = toY(p);
      if (u === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // 2 -> 3: Adiabatic expansion (Orange)
    ctx.strokeStyle = '#f97316';
    ctx.beginPath();
    for (let u = 0; u <= 1.0; u += 0.02) {
      const v = s2.v * Math.pow(s3.v / s2.v, u);
      const p = s2.p * Math.pow(s2.v / v, 1.667);
      const sx = toX(v);
      const sy = toY(p);
      if (u === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // 3 -> 4: Isothermal compression (Blue)
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    for (let u = 0; u <= 1.0; u += 0.02) {
      const v = s3.v * Math.pow(s4.v / s3.v, u);
      const p = s3.p * (s3.v / v);
      const sx = toX(v);
      const sy = toY(p);
      if (u === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // 4 -> 1: Adiabatic compression (Purple)
    ctx.strokeStyle = '#c084fc';
    ctx.beginPath();
    for (let u = 0; u <= 1.0; u += 0.02) {
      const v = s4.v * Math.pow(s1.v / s4.v, u);
      const p = s4.p * Math.pow(s4.v / v, 1.667);
      const sx = toX(v);
      const sy = toY(p);
      if (u === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // State Node Pins 1, 2, 3, 4
    const drawPin = (v: number, p: number, label: string) => {
      const sx = toX(v);
      const sy = toY(p);
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(label, sx + 5, sy - 5);
    };
    drawPin(s1.v, s1.p, '1');
    drawPin(s2.v, s2.p, '2');
    drawPin(s3.v, s3.p, '3');
    drawPin(s4.v, s4.p, '4');

    // Live State Cursor (Pulsing emerald ring)
    const curX = toX(state.volumeM3);
    const curY = toY(state.pressurePa);
    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private renderTSDiagram(
    ctx: CanvasRenderingContext2D,
    state: CarnotState,
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
    ctx.fillText('T - S (TEMPERATURE - ENTROPY) DIAGRAM', x + 12, y + 18);

    const padL = 48;
    const padR = 24;
    const padT = 28;
    const padB = 26;

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const Th = state.states.state1.t;
    const Tc = state.states.state3.t;
    const deltaS = state.states.state2.s;

    const minS = -deltaS * 0.2;
    const maxS = deltaS * 1.25;
    const minT = Tc * 0.7;
    const maxT = Th * 1.15;

    const toX = (s: number) => x + padL + ((s - minS) / (maxS - minS || 1)) * plotW;
    const toY = (t: number) => y + padT + (1.0 - (t - minT) / (maxT - minT || 1)) * plotH;

    // Draw Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + padL, y + padT);
    ctx.lineTo(x + padL, y + padT + plotH);
    ctx.lineTo(x + padL + plotW, y + padT + plotH);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('T (K)', x + padL - 4, y + padT + 8);
    ctx.textAlign = 'left';
    ctx.fillText('ΔS (J/K)', x + padL + plotW - 40, y + padT + plotH + 16);

    // Carnot Rectangle on T-S plane:
    // (0, Th) -> (deltaS, Th) -> (deltaS, Tc) -> (0, Tc)
    const x0 = toX(0);
    const x1 = toX(deltaS);
    const yTh = toY(Th);
    const yTc = toY(Tc);

    // Filled Rectangle (Area = (Th - Tc) * deltaS = Wnet)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fillRect(x0, yTh, x1 - x0, yTc - yTh);

    // Border Rectangle with Stage Colors
    // Top: Th (Red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, yTh);
    ctx.lineTo(x1, yTh);
    ctx.stroke();

    // Right: Isentropic drop (Orange)
    ctx.strokeStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(x1, yTh);
    ctx.lineTo(x1, yTc);
    ctx.stroke();

    // Bottom: Tc (Blue)
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(x1, yTc);
    ctx.lineTo(x0, yTc);
    ctx.stroke();

    // Left: Isentropic rise (Purple)
    ctx.strokeStyle = '#c084fc';
    ctx.beginPath();
    ctx.moveTo(x0, yTc);
    ctx.lineTo(x0, yTh);
    ctx.stroke();

    // Labels on Rectangle
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Area = W_net = ${(state.workNetJ).toFixed(0)} J`, (x0 + x1) * 0.5, (yTh + yTc) * 0.5 + 4);

    // Live state marker on T-S diagram
    const curTsX = toX(state.entropyJK);
    const curTsY = toY(state.temperatureK);
    ctx.beginPath();
    ctx.arc(curTsX, curTsY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
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

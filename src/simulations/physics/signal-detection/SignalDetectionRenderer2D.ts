import { ViewportRenderer } from '../../../core/types/simulation';
import { SignalDetectionState } from './SignalDetectionEngine';
import { normalPdf, normalCdf } from '../../../core/math/normalDistribution';
import { TOKENS } from '../../../ui/tokens';

export class SignalDetectionRenderer2D
  implements ViewportRenderer<SignalDetectionState>
{
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 800;
  private height = 600;

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
    this.resize(container.clientWidth || 800, container.clientHeight || 600);
  }

  resize(width: number, height: number): void {
    this.width = Math.max(width, 320);
    this.height = Math.max(height, 240);
    if (!this.canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(state: SignalDetectionState): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = TOKENS.ui.background;
    ctx.fillRect(0, 0, w, h);

    const pad = 16;
    if (w < 720) {
      const topH = Math.floor((h - pad * 3) * 0.46);
      const bH = h - pad * 3 - topH;
      const cW = Math.floor((w - pad * 3) / 2);
      this.drawDist(ctx, state, pad, pad, w - pad * 2, topH);
      this.drawROC(ctx, state, pad, pad * 2 + topH, cW, bH);
      this.drawStats(ctx, state, pad * 2 + cW, pad * 2 + topH, cW, bH);
    } else {
      const leftW = Math.floor((w - pad * 3) * 0.52);
      const rX = pad * 2 + leftW;
      const rW = w - rX - pad;
      const rocH = Math.floor((h - pad * 3) * 0.58);
      const sH = h - pad * 3 - rocH;
      this.drawDist(ctx, state, pad, pad, leftW, h - pad * 2);
      this.drawROC(ctx, state, rX, pad, rW, rocH);
      this.drawStats(ctx, state, rX, pad * 2 + rocH, rW, sH);
    }
  }

  private panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string): void {
    ctx.fillStyle = TOKENS.ui.surface;
    ctx.strokeStyle = TOKENS.ui.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = TOKENS.ui.text;
    ctx.font = `600 ${TOKENS.typography.size.sm} ${TOKENS.typography.fontSans}`;
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 14, y + 22);
  }

  private drawDist(ctx: CanvasRenderingContext2D, s: SignalDetectionState, x0: number, y0: number, w: number, h: number): void {
    ctx.save();
    this.panel(ctx, x0, y0, w, h, 'Evidence Distributions & Criterion');

    const mL = 36, mR = 20, mT = 44, mB = 34;
    const pW = w - mL - mR, pH = h - mT - mB;
    const pX0 = x0 + mL, base = y0 + mT + pH;
    if (pW < 40 || pH < 40) { ctx.restore(); return; }

    const xMin = -3.0, xMax = Math.max(5.0, s.dPrime + 3.0);
    const mapX = (x: number) => pX0 + ((x - xMin) / (xMax - xMin)) * pW;
    const mapY = (p: number) => base - (p / 0.44) * pH;

    ctx.strokeStyle = TOKENS.ui.border;
    ctx.beginPath();
    ctx.moveTo(pX0, base);
    ctx.lineTo(pX0 + pW, base);
    ctx.stroke();

    ctx.fillStyle = TOKENS.ui.textMuted;
    ctx.font = `${TOKENS.typography.size.xs} ${TOKENS.typography.fontMono}`;
    ctx.textAlign = 'center';
    for (let t = Math.ceil(xMin); t <= Math.floor(xMax); t += 1) {
      const tx = mapX(t);
      if (tx >= pX0 && tx <= pX0 + pW) {
        ctx.beginPath();
        ctx.moveTo(tx, base);
        ctx.lineTo(tx, base + 4);
        ctx.stroke();
        ctx.fillText(`${t}`, tx, base + 16);
      }
    }
    ctx.font = `${TOKENS.typography.size.xs} ${TOKENS.typography.fontSans}`;
    ctx.fillText('Decision Variable x', pX0 + pW / 2, base + 28);

    const c = s.criterion, dP = s.dPrime, N = 80;

    // Shading
    const shade = (start: number, shift: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      const sx = Math.max(start, xMin);
      ctx.moveTo(mapX(sx), base);
      for (let i = 0; i <= N; i += 1) {
        const ev = sx + ((xMax - sx) * i) / N;
        ctx.lineTo(mapX(ev), mapY(normalPdf(ev - shift)));
      }
      ctx.lineTo(mapX(xMax), base);
      ctx.closePath();
      ctx.fill();
    };

    shade(c, 0, 'rgba(244, 63, 94, 0.25)'); // False alarms
    shade(c, dP, 'rgba(56, 189, 248, 0.30)'); // Hits

    // Curves
    const curve = (shift: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= N; i += 1) {
        const ev = xMin + ((xMax - xMin) * i) / N;
        const px = mapX(ev), py = mapY(normalPdf(ev - shift));
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    };

    curve(0, TOKENS.ui.textMuted);
    curve(dP, TOKENS.trace.primary);

    // Criterion line
    const cx = mapX(c);
    if (cx >= pX0 && cx <= pX0 + pW) {
      ctx.strokeStyle = TOKENS.qty.force;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, y0 + mT);
      ctx.lineTo(cx, base);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = TOKENS.qty.force;
      ctx.font = `600 ${TOKENS.typography.size.xs} ${TOKENS.typography.fontMono}`;
      ctx.fillText(`c = ${c.toFixed(2)}`, cx, y0 + mT - 6);
    }
    ctx.restore();
  }

  private drawROC(ctx: CanvasRenderingContext2D, s: SignalDetectionState, x0: number, y0: number, w: number, h: number): void {
    ctx.save();
    this.panel(ctx, x0, y0, w, h, 'ROC Space (FA vs H)');

    const mL = 36, mR = 18, mT = 38, mB = 34;
    const side = Math.min(w - mL - mR, h - mT - mB);
    if (side < 40) { ctx.restore(); return; }

    const pX0 = x0 + mL, pY0 = y0 + mT, base = pY0 + side;
    const mFA = (fa: number) => pX0 + Math.max(0, Math.min(1, fa)) * side;
    const mH = (hr: number) => base - Math.max(0, Math.min(1, hr)) * side;

    ctx.strokeStyle = TOKENS.ui.border;
    ctx.strokeRect(pX0, pY0, side, side);

    ctx.strokeStyle = TOKENS.trace.reference;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mFA(0), mH(0));
    ctx.lineTo(mFA(1), mH(1));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = TOKENS.ui.textMuted;
    ctx.font = `${TOKENS.typography.size.xs} ${TOKENS.typography.fontMono}`;
    ctx.textAlign = 'center';
    [0, 0.5, 1].forEach((v) => ctx.fillText(v.toFixed(1), mFA(v), base + 14));
    ctx.textAlign = 'right';
    [0, 0.5, 1].forEach((v) => ctx.fillText(v.toFixed(1), pX0 - 6, mH(v) + 4));

    ctx.font = `${TOKENS.typography.size.xs} ${TOKENS.typography.fontSans}`;
    ctx.textAlign = 'center';
    ctx.fillText('False-Alarm Rate (FA)', pX0 + side / 2, base + 28);

    ctx.save();
    ctx.translate(pX0 - 24, pY0 + side / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Hit Rate (H)', 0, 0);
    ctx.restore();

    // Theoretical ROC curve
    ctx.strokeStyle = TOKENS.ui.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 60; i += 1) {
      const z = -3.5 + (7.0 * i) / 60;
      const px = mFA(normalCdf(-z)), py = mH(normalCdf(s.dPrime - z));
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Earlier blocks
    for (const b of s.history) {
      ctx.fillStyle = TOKENS.trace.secondary;
      ctx.strokeStyle = TOKENS.ui.text;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mFA(b.fa), mH(b.h), 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // Current block point
    if (s.trials > 0) {
      ctx.fillStyle = TOKENS.trace.primary;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mFA(s.faRate), mH(s.hitRate), 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawStats(ctx: CanvasRenderingContext2D, s: SignalDetectionState, x0: number, y0: number, w: number, h: number): void {
    ctx.save();
    this.panel(ctx, x0, y0, w, h, 'Telemetry & Counts');

    let curY = y0 + 40;
    const lineH = 18;
    // In a narrow panel the long label would run into the value, so fall back to the short one. Below 280 px the
    // paired counts (up to "20000 / 20000") do not fit beside any label; the Live Telemetry card still lists them.
    const row = (lbl: string, short: string, val: string, col: string = TOKENS.ui.text) => {
      if (curY > y0 + h - 10) return;
      ctx.font = `${TOKENS.typography.size.xs} ${TOKENS.typography.fontSans}`;
      ctx.fillStyle = TOKENS.ui.textMuted;
      ctx.textAlign = 'left';
      ctx.fillText(ctx.measureText(lbl).width + val.length * 8 > w - 40 ? short : lbl, x0 + 14, curY);

      ctx.font = `${TOKENS.typography.size.xs} ${TOKENS.typography.fontMono}`;
      ctx.fillStyle = col;
      ctx.textAlign = 'right';
      ctx.fillText(val, x0 + w - 14, curY);
      curY += lineH;
    };

    row('Total Trials', 'Trials', `${s.trials}`);
    if (w >= 280) {
      row('Signal / Noise Trials', '', `${s.signalTrials} / ${s.noiseTrials}`);
      row('Hits / Misses', '', `${s.hits} / ${s.misses}`, TOKENS.trace.primary);
      row('False Alarms / CR', '', `${s.falseAlarms} / ${s.correctRejections}`, TOKENS.qty.force);
    }

    curY += 4;
    ctx.strokeStyle = TOKENS.ui.border;
    ctx.beginPath();
    ctx.moveTo(x0 + 14, curY - 2);
    ctx.lineTo(x0 + w - 14, curY - 2);
    ctx.stroke();
    curY += 6;

    row('Hit Rate (H)', 'H', s.hitRate.toFixed(3), TOKENS.trace.primary);
    row('False Alarm Rate (FA)', 'FA', s.faRate.toFixed(3), TOKENS.qty.force);
    row("Measured d'", "d'", s.dPrimeMeasured.toFixed(3), TOKENS.state.success);
    row('Measured Criterion (c)', 'c', s.criterionMeasured.toFixed(3));

    ctx.restore();
  }

  unmount(): void {
    this.dispose();
  }

  dispose(): void {
    if (this.canvas?.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}

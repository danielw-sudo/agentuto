import { ViewportRenderer } from '../../../core/types/simulation';
import { StandingWavesState } from './StandingWavesEngine';

export class StandingWavesRenderer2D implements ViewportRenderer<StandingWavesState> {
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

  render(state: StandingWavesState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Clear background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // 2. Viewport Coordinate Scaling
    const padL = 70;
    const padR = 60;
    const midY = Math.floor(h * 0.44);
    const plotW = Math.max(100, w - padL - padR);
    const maxStringL = state.stringX[state.stringX.length - 1] || 2.0;

    // Scale displacement y (meters -> pixels): typically max A = 0.2m -> map to 110px
    const yPxScale = Math.min(140, Math.floor(h * 0.28)) / 0.20;

    const toPx = (x: number): number => padL + (x / maxStringL) * plotW;
    const toPy = (y: number): number => midY - y * yPxScale;

    // 3. Grid & Reference Axis
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = 1;

    // Horizontal equilibrium baseline y = 0
    ctx.beginPath();
    ctx.moveTo(padL - 20, midY);
    ctx.lineTo(w - padR + 20, midY);
    ctx.stroke();

    // Measurement ticks on baseline
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const numTicks = 8;
    for (let k = 0; k <= numTicks; k++) {
      const rx = (k / numTicks) * maxStringL;
      const px = toPx(rx);
      ctx.beginPath();
      ctx.moveTo(px, midY - 4);
      ctx.lineTo(px, midY + 4);
      ctx.stroke();
      ctx.fillText(`${rx.toFixed(2)}m`, px, midY + 8);
    }

    // 4. Clamped Fixed Boundary Supports (Posts at x = 0 and x = L)
    const postW = 14;
    const postH = 160;

    // Left post
    ctx.fillStyle = '#334155';
    ctx.fillRect(padL - postW, midY - postH / 2, postW, postH);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padL - postW, midY - postH / 2, postW, postH);

    // Right post
    const rightPx = toPx(maxStringL);
    ctx.fillStyle = '#334155';
    ctx.fillRect(rightPx, midY - postH / 2, postW, postH);
    ctx.strokeRect(rightPx, midY - postH / 2, postW, postH);

    // Fixed clamps clamping the string ends
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(padL, midY, 5, 0, Math.PI * 2);
    ctx.arc(rightPx, midY, 5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Stationary Envelope Outline ±Envelope(x)
    const pts = state.stringX.length;
    if (pts > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      // Top envelope
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        const px = toPx(state.stringX[i]);
        const py = toPy(state.envelopeY[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Bottom envelope
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        const px = toPx(state.stringX[i]);
        const py = toPy(-state.envelopeY[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 6. Traveling Wave Components (Optional visual superposition)
    if (pts > 1) {
      ctx.save();
      // Component 1: Right-traveling wave (faint cyan dashed)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        const px = toPx(state.stringX[i]);
        const py = toPy(state.rightWaveY[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Component 2: Left-traveling wave (faint purple dashed)
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        const px = toPx(state.stringX[i]);
        const py = toPy(state.leftWaveY[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 7. Vibrating Superposed String (Solid bold glowing cyan)
    if (pts > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        const px = toPx(state.stringX[i]);
        const py = toPy(state.stringY[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 8. Stationary Node Markers (Red Badges with zero motion)
    state.nodes.forEach((node, idx) => {
      const nx = toPx(node.x);
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(nx, midY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`N${idx + 1}`, nx, midY - 8);
    });

    // 9. Antinode Markers (Green Badges at displacement peaks)
    state.antinodes.forEach((an, idx) => {
      const ax = toPx(an.x);
      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#16a34a';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(ax, midY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`A${idx + 1}`, ax, midY + 24);
    });

    // 10. Kinetic vs Potential Energy Partition Bar
    const te = state.totalEnergy;
    const ke = state.kineticEnergy;
    const pe = state.potentialEnergy;
    const kePct = te > 0 ? (ke / te) * 100 : 0;
    const pePct = te > 0 ? (pe / te) * 100 : 0;

    const barX = padL;
    const barY = h - 68;
    const barW = plotW;
    const barH = 10;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(barX, barY - 20, barW, 48);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.strokeRect(barX, barY - 20, barW, 48);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`HARMONIC ENERGY OSCILLATION: E_total = ${(te * 1e3).toFixed(2)} mJ`, barX + 8, barY - 6);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`K: ${kePct.toFixed(0)}%`, barX + barW - 90, barY - 6);
    ctx.fillStyle = '#a855f7';
    ctx.fillText(`U: ${pePct.toFixed(0)}%`, barX + barW - 8, barY - 6);

    // Track
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX + 8, barY + 4, barW - 16, barH);

    // Kinetic segment
    const kWidth = (barW - 16) * (kePct / 100);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(barX + 8, barY + 4, kWidth, barH);

    // Potential segment
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(barX + 8 + kWidth, barY + 4, (barW - 16) - kWidth, barH);

    // 11. Top Legend HUD
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('━ Standing Wave y(x,t)', padL, 26);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('╌╌ Stationary Envelope 2A·sin(kx)', padL + 180, 26);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.fillText('╌╌ Right Traveling Wave', padL + 420, 26);
    ctx.fillStyle = 'rgba(192, 132, 252, 0.5)';
    ctx.fillText('╌╌ Left Traveling Wave', padL + 600, 26);
  }

  unmount(): void {
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}

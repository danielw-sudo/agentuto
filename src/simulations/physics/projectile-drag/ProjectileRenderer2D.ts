import { ViewportRenderer } from '../../../core/types/simulation';
import { ProjectileState } from './ProjectileEngine';

export class ProjectileRenderer2D implements ViewportRenderer<ProjectileState> {
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

  render(state: ProjectileState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Clear & Background
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#070a14');
    grad.addColorStop(1, '#0c1220');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Viewport Coordinate Scaling
    const padL = 70;
    const padR = 40;
    const padB = 60;
    const padT = 50;
    const plotW = Math.max(100, w - padL - padR);
    const plotH = Math.max(100, h - padB - padT);

    // Auto-range max coordinates with headroom
    const maxX = Math.max(70, state.vacuumRange * 1.15, state.x * 1.25);
    const maxY = Math.max(25, state.vacuumMaxAltitude * 1.3, state.y * 1.3);

    const toPx = (x: number): number => padL + (x / maxX) * plotW;
    const toPy = (y: number): number => h - padB - (y / maxY) * plotH;

    // 3. Coordinate Grid & Axes
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = 1;
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#64748b';

    // Horizontal grid lines (Altitude y)
    const yStep = maxY > 80 ? 20 : maxY > 30 ? 10 : 5;
    for (let gy = 0; gy <= maxY; gy += yStep) {
      const py = toPy(gy);
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(w - padR, py);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${gy}m`, padL - 8, py);
    }

    // Vertical grid lines (Range x)
    const xStep = maxX > 150 ? 50 : maxX > 70 ? 20 : 10;
    for (let gx = 0; gx <= maxX; gx += xStep) {
      const px = toPx(gx);
      ctx.beginPath();
      ctx.moveTo(px, toPy(0));
      ctx.lineTo(px, padT);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${gx}m`, px, toPy(0) + 8);
    }

    // Ground plane line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL - 10, toPy(0));
    ctx.lineTo(w - padR + 10, toPy(0));
    ctx.stroke();

    // 4. Ghost Vacuum Parabola (Ideal b = 0)
    if (state.vacuumTrajectory && state.vacuumTrajectory.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      state.vacuumTrajectory.forEach((pt, idx) => {
        const px = toPx(pt.x);
        const py = toPy(pt.y);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Vacuum Range Tag at landing
      const vacEndX = toPx(state.vacuumRange);
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Vac: ${state.vacuumRange.toFixed(1)}m`, vacEndX, toPy(0) - 6);
      ctx.restore();
    }

    // 5. Atmospheric Trajectory Trail (Solid glowing amber)
    const trail = state.trailPoints;
    if (trail.length > 1) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      trail.forEach((pt, idx) => {
        const px = toPx(pt.x);
        const py = toPy(pt.y);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 6. Max Altitude Guide Marker
    if (state.maxAltitude > 0) {
      const pMaxY = toPy(state.maxAltitude);
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, pMaxY);
      ctx.lineTo(toPx(state.x), pMaxY);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.fillText(`H_max: ${state.maxAltitude.toFixed(1)}m`, padL + 6, pMaxY - 4);
      ctx.restore();
    }

    // 7. Projectile Body & Dynamic Vector Arrows
    const curPx = toPx(state.x);
    const curPy = toPy(state.y);

    // Vector scale: map 1 m/s to 1.5 pixels
    const speed = state.speed;
    if (speed > 0.05) {
      const vScale = 1.4;

      // Velocity Vector (Green Arrow)
      const vEndX = curPx + state.vx * vScale;
      const vEndY = curPy - state.vy * vScale;
      this.drawArrow(ctx, curPx, curPy, vEndX, vEndY, '#22c55e', 2);

      // Drag Force Vector (Rose Arrow, opposite to velocity)
      if (state.dragForce > 0.01) {
        const dragScale = Math.min(40, state.dragForce * 3.0);
        const dEndX = curPx - (state.vx / speed) * dragScale;
        const dEndY = curPy + (state.vy / speed) * dragScale;
        this.drawArrow(ctx, curPx, curPy, dEndX, dEndY, '#f43f5e', 2);
      }
    }

    // Projectile Sphere
    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(curPx, curPy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 8. Impact / Landed Bullseye
    if (state.isLanded) {
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(curPx, curPy, 10, 0, Math.PI * 2);
      ctx.arc(curPx, curPy, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Impact: ${state.impactDistance.toFixed(1)}m`, curPx, curPy - 20);
      ctx.restore();
    }

    // 9. Legend HUD
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('━━ Trajectory with Air Drag', w - 210, padT + 12);
    ctx.fillText('╌╌ Vacuum Ideal (b = 0)', w - 210, padT + 26);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('→ Velocity v', w - 210, padT + 40);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('→ Aerodynamic Drag F_d', w - 210, padT + 54);
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    width: number
  ): void {
    const headLen = 7;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;

    // Line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
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

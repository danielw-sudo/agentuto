import { ViewportRenderer } from '../../../core/types/simulation';
import { MomentumState } from './MomentumEngine';

export class MomentumRenderer2D implements ViewportRenderer<MomentumState> {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 800;
  private height: number = 600;

  private comTrail: { x: number; y: number }[] = [];

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

  render(state: MomentumState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Clear background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // 2. Coordinate System: Center of table at (w*0.5, h*0.5)
    // Table bounds: x in [-5.2, 5.2], y in [-2.8, 2.8]
    const centerX = w * 0.5;
    const centerY = h * 0.52;
    const scale = Math.min(w / 12.0, h / 7.0); // pixels per meter

    const toScreenX = (x: number) => centerX + x * scale;
    const toScreenY = (y: number) => centerY - y * scale;

    // 3. Draw Air Table Boundary & Rails
    const tableW = 10.4 * scale;
    const tableH = 5.6 * scale;
    const tableLeft = centerX - tableW * 0.5;
    const tableTop = centerY - tableH * 0.5;

    ctx.fillStyle = '#0a0f1d';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(tableLeft, tableTop, tableW, tableH, 12);
    ctx.fill();
    ctx.stroke();

    // Table Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -5; x <= 5; x++) {
      const sx = toScreenX(x);
      ctx.moveTo(sx, tableTop);
      ctx.lineTo(sx, tableTop + tableH);
    }
    for (let y = -2; y <= 2; y++) {
      const sy = toScreenY(y);
      ctx.moveTo(tableLeft, sy);
      ctx.lineTo(tableLeft + tableW, sy);
    }
    ctx.stroke();

    // 4. Update & Draw Center of Mass Trail
    this.comTrail.push({ x: state.comX, y: state.comY });
    if (this.comTrail.length > 60) {
      this.comTrail.shift();
    }

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = 0; i < this.comTrail.length; i++) {
      const p = this.comTrail[i];
      const sx = toScreenX(p.x);
      const sy = toScreenY(p.y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Connecting Line Between Pucks (passes through CoM)
    const b1x = toScreenX(state.body1.x);
    const b1y = toScreenY(state.body1.y);
    const b2x = toScreenX(state.body2.x);
    const b2y = toScreenY(state.body2.y);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(b1x, b1y);
    ctx.lineTo(b2x, b2y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. Draw Center of Mass (CoM Marker)
    const comSx = toScreenX(state.comX);
    const comSy = toScreenY(state.comY);

    ctx.save();
    // CoM pulsating emerald ring
    ctx.beginPath();
    ctx.arc(comSx, comSy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    // CoM crosshair
    ctx.beginPath();
    ctx.moveTo(comSx - 12, comSy);
    ctx.lineTo(comSx + 12, comSy);
    ctx.moveTo(comSx, comSy - 12);
    ctx.lineTo(comSx, comSy + 12);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = state.isSystemIsolated ? '#34d399' : '#fbbf24';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      state.isSystemIsolated ? 'CoM (V=const)' : 'CoM (wall impulse)',
      comSx,
      comSy - 14
    );
    ctx.restore();

    // 7. Draw Puck 1 (Cyan Body)
    const r1Px = state.body1.radius * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(b1x, b1y, r1Px, 0, Math.PI * 2);
    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Velocity vector 1
    const v1ArrowLen = Math.hypot(state.body1.vx, state.body1.vy) * scale * 0.18;
    if (v1ArrowLen > 2) {
      const v1Angle = Math.atan2(-state.body1.vy, state.body1.vx);
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b1x, b1y);
      ctx.lineTo(b1x + Math.cos(v1Angle) * v1ArrowLen, b1y + Math.sin(v1Angle) * v1ArrowLen);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`m₁ (${state.body1.mass.toFixed(1)}kg)`, b1x, b1y + 3);
    ctx.restore();

    // 8. Draw Puck 2 (Amber Body)
    const r2Px = state.body2.radius * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(b2x, b2y, r2Px, 0, Math.PI * 2);
    ctx.fillStyle = '#d97706';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Velocity vector 2
    const v2ArrowLen = Math.hypot(state.body2.vx, state.body2.vy) * scale * 0.18;
    if (v2ArrowLen > 2) {
      const v2Angle = Math.atan2(-state.body2.vy, state.body2.vx);
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b2x, b2y);
      ctx.lineTo(b2x + Math.cos(v2Angle) * v2ArrowLen, b2y + Math.sin(v2Angle) * v2ArrowLen);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`m₂ (${state.body2.mass.toFixed(1)}kg)`, b2x, b2y + 3);
    ctx.restore();

    // 9. Collision Flash Indicator
    if (state.justCollided) {
      const midColX = (b1x + b2x) * 0.5;
      const midColY = (b1y + b2y) * 0.5;
      ctx.beginPath();
      ctx.arc(midColX, midColY, 28, 0, Math.PI * 2);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 10. Top-Left HUD Telemetry Overlay Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(16, 16, 270, 134, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      state.isSystemIsolated
        ? 'LINEAR MOMENTUM (ISOLATED SYSTEM)'
        : 'WALL CONTACT: EXTERNAL IMPULSE APPLIED',
      26,
      34
    );

    ctx.fillStyle = state.isSystemIsolated ? '#10b981' : '#f59e0b';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`P_total: [${state.totalMomentumX.toFixed(2)}, ${state.totalMomentumY.toFixed(2)}] kg·m/s`, 26, 52);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '10px monospace';
    ctx.fillText(
      `V_cm:    [${state.comVx.toFixed(2)}, ${state.comVy.toFixed(2)}] m/s (${state.isSystemIsolated ? 'Invariant' : 'Shifted by wall'})`,
      26,
      70
    );
    ctx.fillText(`p₁:      [${(state.body1.mass * state.body1.vx).toFixed(2)}, ${(state.body1.mass * state.body1.vy).toFixed(2)}] kg·m/s`, 26, 86);
    ctx.fillText(`p₂:      [${(state.body2.mass * state.body2.vx).toFixed(2)}, ${(state.body2.mass * state.body2.vy).toFixed(2)}] kg·m/s`, 26, 102);

    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Total KE: ${state.totalKineticEnergy.toFixed(1)} J (K_cm = ${state.comKineticEnergy.toFixed(1)} J)`, 26, 120);
    ctx.fillText(`Collisions: ${state.collisionCount} | Walls: ${state.wallContactCount} (e = ${(state.restitution ?? 1.0).toFixed(2)})`, 26, 136);

    // 11. Bottom Pedagogical Guidance Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(16, h - 38, w - 32, 26, 6);
    ctx.fill();

    ctx.fillStyle = state.isSystemIsolated ? '#94a3b8' : '#fbbf24';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const bottomText = state.isSystemIsolated
      ? 'Isolated System: Before wall contact, total linear momentum P and Center-of-Mass velocity V_cm remain strictly constant.'
      : 'Boundary Impulse: A puck touched the table rail (external force), changing total P and V_cm. Reset to measure an isolated collision.';
    ctx.fillText(bottomText, w * 0.5, h - 22);
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
    this.comTrail = [];
  }
}

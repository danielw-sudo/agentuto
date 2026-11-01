import type { ViewportRenderer } from '../../src/core/types/simulation';
import type { FreeFallState } from './FreeFallEngine';

/**
 * What the learner sees. All drawing lives here and none of the physics does: it only reads the state the
 * engine reports. A 2D canvas needs no GPU and works on every machine.
 */
export class FreeFallRenderer2D implements ViewportRenderer<FreeFallState> {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 800;
  private height = 600;
  private topOfScale = 20;

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
    this.width = width;
    this.height = height;
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(state: FreeFallState): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width: w, height: h } = this;

    // The scale only ever grows, so the ball does not seem to jump when it rises above the old top.
    this.topOfScale = Math.max(this.topOfScale, state.height * 1.1);
    const groundY = h - 60;
    const toPy = (metres: number) => groundY - (metres / this.topOfScale) * (groundY - 40);

    ctx.fillStyle = '#0d1015';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#9aa4b2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, groundY);
    ctx.lineTo(w - 40, groundY);
    ctx.stroke();

    ctx.fillStyle = '#8fa6ff';
    ctx.beginPath();
    ctx.arc(w / 2, toPy(state.height), 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e9ecf1';
    ctx.font = '14px ui-monospace, monospace';
    ctx.fillText(`t = ${state.time.toFixed(2)} s`, 48, 32);
    ctx.fillText(`height = ${state.height.toFixed(2)} m`, 48, 54);
    ctx.fillText(`velocity = ${state.velocity.toFixed(2)} m/s`, 48, 76);
  }

  unmount(): void {
    if (this.canvas && this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
    this.canvas = null;
    this.ctx = null;
  }
}

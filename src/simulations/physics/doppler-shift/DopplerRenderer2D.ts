import { ViewportRenderer } from '../../../core/types/simulation';
import { DopplerState, WavefrontCircle } from './DopplerEngine';

export class DopplerRenderer2D implements ViewportRenderer<DopplerState> {
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

  render(state: DopplerState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Clear background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // 2. Coordinate System: Center at mid-x, mid-y
    // Range: x in [-140m, 140m], y in [-80m, 80m]
    const centerX = w * 0.5;
    const centerY = h * 0.52;
    const scale = Math.min(w / 280.0, h / 170.0); // pixels per meter

    const toScreenX = (x: number) => centerX + x * scale;
    const toScreenY = (y: number) => centerY - y * scale; // Invert y for standard math coords

    // 3. Draw Grid and Distance Markings
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -140; x <= 140; x += 20) {
      const sx = toScreenX(x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    }
    for (let y = -80; y <= 80; y += 20) {
      const sy = toScreenY(y);
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
    }
    ctx.stroke();

    // Primary motion axis (y = 0)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    // Axis meter ticks
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let x = -120; x <= 120; x += 40) {
      if (x === 0) continue;
      const sx = toScreenX(x);
      ctx.fillText(`${x > 0 ? '+' : ''}${x}m`, sx, centerY + 16);
    }

    // 4. Supersonic Mach Cone Envelope (if M >= 1.0)
    if (state.isSupersonic && state.machNumber >= 1.0) {
      const muRad = (state.machAngleDeg * Math.PI) / 180.0;
      const srcSx = toScreenX(state.sourceX);
      const srcSy = toScreenY(state.sourceY);
      const coneLength = Math.max(w, h) * 1.5;

      // Mach cone opens opposite to motion direction
      // Assuming vs > 0 (moving right), opening angles are backwards: (π - μ) and (π + μ)
      const baseAngle = state.sourceX >= -130 ? Math.PI : 0; // backward from rightward travel

      const angle1 = baseAngle - muRad;
      const angle2 = baseAngle + muRad;

      const x1 = srcSx + coneLength * Math.cos(angle1);
      const y1 = srcSy - coneLength * Math.sin(angle1);
      const x2 = srcSx + coneLength * Math.cos(angle2);
      const y2 = srcSy - coneLength * Math.sin(angle2);

      // Mach cone filled shock zone
      ctx.save();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.07)';
      ctx.beginPath();
      ctx.moveTo(srcSx, srcSy);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      ctx.fill();

      // Tangent shock lines
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(srcSx, srcSy);
      ctx.lineTo(x1, y1);
      ctx.moveTo(srcSx, srcSy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mach angle arc visualization
      ctx.beginPath();
      ctx.arc(srcSx, srcSy, 45, baseAngle - muRad, baseAngle, false);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`μ = ${state.machAngleDeg.toFixed(1)}°`, srcSx - 52, srcSy - 10);
      ctx.restore();
    }

    // 5. Render Circular Wavefronts
    for (let i = 0; i < state.wavefronts.length; i++) {
      const wf: WavefrontCircle = state.wavefronts[i];
      const wx = toScreenX(wf.emitX);
      const wy = toScreenY(wf.emitY);
      const rPx = wf.radius * scale;

      // Age fade
      const alpha = Math.max(0.08, 1.0 - wf.radius / 250.0);

      ctx.beginPath();
      ctx.arc(wx, wy, rPx, 0, Math.PI * 2);
      ctx.strokeStyle = state.isSupersonic
        ? `rgba(245, 158, 11, ${alpha * 0.8})`
        : `rgba(56, 189, 248, ${alpha * 0.9})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw faint center emission dot
      if (wf.radius < 35.0) {
        ctx.fillStyle = `rgba(148, 163, 184, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(wx, wy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Draw Line of Sight from Source to Receiver
    const srcSx = toScreenX(state.sourceX);
    const srcSy = toScreenY(state.sourceY);
    const recvSx = toScreenX(state.receiverX);
    const recvSy = toScreenY(state.receiverY);

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(srcSx, srcSy);
    ctx.lineTo(recvSx, recvSy);
    ctx.stroke();
    ctx.restore();

    // 7. Draw Receiver / Detector
    ctx.save();
    // Receiver glow ring
    ctx.beginPath();
    ctx.arc(recvSx, recvSy, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Detector central dot
    ctx.beginPath();
    ctx.arc(recvSx, recvSy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#a855f7';
    ctx.fill();

    // Detector Badge
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Detector', recvSx, recvSy - 18);
    ctx.fillStyle = '#c084fc';
    ctx.font = '10px monospace';
    ctx.fillText(`f' = ${state.observedFrequencyAtReceiver.toFixed(1)} Hz`, recvSx, recvSy + 24);
    ctx.restore();

    // 8. Draw Moving Source (Jet / Sound Emitter)
    ctx.save();
    // Emitter pulse halo
    ctx.beginPath();
    ctx.arc(srcSx, srcSy, 16, 0, Math.PI * 2);
    ctx.fillStyle = state.isSupersonic ? 'rgba(239, 68, 68, 0.25)' : 'rgba(14, 165, 233, 0.25)';
    ctx.fill();
    ctx.strokeStyle = state.isSupersonic ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Central emitter core
    ctx.beginPath();
    ctx.arc(srcSx, srcSy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Velocity arrow
    const arrowLen = Math.min(60, Math.max(15, scale * 20));
    const arrowDir = 1; // along +x
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(srcSx, srcSy);
    ctx.lineTo(srcSx + arrowLen * arrowDir, srcSy);
    ctx.stroke();
    // Arrow head
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(srcSx + arrowLen * arrowDir, srcSy);
    ctx.lineTo(srcSx + (arrowLen - 6) * arrowDir, srcSy - 4);
    ctx.lineTo(srcSx + (arrowLen - 6) * arrowDir, srcSy + 4);
    ctx.closePath();
    ctx.fill();

    // Source Label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Source (Emitter)', srcSx, srcSy - 20);
    ctx.restore();

    // 9. HUD Overlay Card (Top Left)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(16, 16, 260, 130, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DOPPLER WAVE KINEMATICS', 26, 34);

    // Regime pill
    const regimeColor = state.isSupersonic ? '#f59e0b' : '#38bdf8';
    const regimeText = state.machNumber >= 1.0 ? 'SUPERSONIC (M ≥ 1)' : 'SUBSONIC (M < 1)';
    ctx.fillStyle = regimeColor;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`Mach: M = ${state.machNumber.toFixed(2)} [${regimeText}]`, 26, 52);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px monospace';
    ctx.fillText(`f₀ (rest):     ${state.totalWavefrontsEmitted > 0 ? (10).toFixed(1) : '10.0'} Hz`, 26, 70);
    ctx.fillText(`f' (ahead):    ${state.observedFrequencyAhead.toFixed(1)} Hz (λ' = ${state.compressedWavelengthAhead.toFixed(1)}m)`, 26, 86);
    ctx.fillText(`f' (behind):   ${state.observedFrequencyBehind.toFixed(1)} Hz (λ' = ${state.stretchedWavelengthBehind.toFixed(1)}m)`, 26, 102);

    if (state.isSupersonic) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`Mach Angle:    μ = ${state.machAngleDeg.toFixed(1)}°`, 26, 122);
    } else {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`Observer Pitch: f' = ${state.observedFrequencyAtReceiver.toFixed(1)} Hz`, 26, 122);
    }

    // 10. Bottom Pedagogical Guidance Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(16, h - 38, w - 32, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const bottomText = state.isSupersonic
      ? 'Supersonic Regime: Source outruns waves; wavefront envelope forms shock cone with half-angle sin(μ) = c/vs'
      : state.machNumber > 0.95
      ? 'Transonic Sound Barrier: Wavefronts pile up directly ahead in high-pressure shock boundary'
      : 'Subsonic Doppler Effect: Wavefront compression yields higher pitch ahead, wave stretching yields lower pitch behind';
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
  }
}

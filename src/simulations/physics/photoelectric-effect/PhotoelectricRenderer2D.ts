import { ViewportRenderer } from '../../../core/types/simulation';
import { PhotoelectricState } from './PhotoelectricEngine';
import { wavelengthToRGB } from '../wave-optics/OpticsEngine';

export class PhotoelectricRenderer2D implements ViewportRenderer<PhotoelectricState> {
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

  render(state: PhotoelectricState): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Clear background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // Compute light color from wavelength
    // OpticsEngine wavelengthToRGB supports 380-750nm; clamp for UV below 380
    const lightWavelength = state.photonEnergyEv > 0
      ? 1239.84 / state.photonEnergyEv
      : 400;
    const clampedWl = Math.max(380, Math.min(750, lightWavelength));
    const [r, g, b] = wavelengthToRGB(clampedWl);
    const beamColor = `rgb(${r}, ${g}, ${b})`;

    // 2. Geometry Layout
    // Vacuum phototube center
    const tubeX = w * 0.46;
    const tubeY = h * 0.44;
    const tubeWidth = Math.min(460, w * 0.52);
    const tubeHeight = Math.min(220, h * 0.42);

    const tubeLeft = tubeX - tubeWidth * 0.5;
    const tubeRight = tubeX + tubeWidth * 0.5;
    const tubeTop = tubeY - tubeHeight * 0.5;
    const tubeBottom = tubeY + tubeHeight * 0.5;

    // Cathode (left) and Anode (right) screen coordinates
    // Engine uses x in [0.2, 0.8]
    const mapSimX = (simX: number) => tubeLeft + (simX / 1.0) * tubeWidth;
    const mapSimY = (simY: number) => tubeY + simY * (tubeHeight * 0.7);

    const cathodeScreenX = mapSimX(0.2);
    const anodeScreenX = mapSimX(0.8);

    // 3. Draw Incident Light Beam (Lamp at left)
    const lampX = Math.max(30, tubeLeft - 100);
    const lampY = tubeY - 30;

    ctx.save();
    // Light beam cone from lamp to cathode
    const grad = ctx.createLinearGradient(lampX, lampY, cathodeScreenX, tubeY);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
    grad.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, 0.3)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.05)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(lampX + 25, lampY - 15);
    ctx.lineTo(cathodeScreenX, tubeY - tubeHeight * 0.35);
    ctx.lineTo(cathodeScreenX, tubeY + tubeHeight * 0.35);
    ctx.lineTo(lampX + 25, lampY + 15);
    ctx.closePath();
    ctx.fill();

    // Lamp housing
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(lampX - 25, lampY - 22, 50, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Lamp lens
    ctx.beginPath();
    ctx.arc(lampX + 25, lampY, 16, -Math.PI / 2, Math.PI / 2);
    ctx.fillStyle = beamColor;
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Monochromatic', lampX, lampY - 28);
    ctx.fillText('Light Source', lampX, lampY + 36);
    ctx.restore();

    // 4. Photons Streaming
    for (let i = 0; i < state.photons.length; i++) {
      const p = state.photons[i];
      const px = mapSimX(p.x);
      const py = mapSimY(p.y);

      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = beamColor;
      ctx.shadowColor = beamColor;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. Vacuum Glass Bulb
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    ctx.roundRect(tubeLeft, tubeTop, tubeWidth, tubeHeight, tubeHeight * 0.45);
    ctx.fill();
    ctx.stroke();

    // Subtle glass reflection highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(tubeX, tubeTop + 14, tubeWidth * 0.35, Math.PI * 0.8, Math.PI * 0.2, true);
    ctx.stroke();
    ctx.restore();

    // 6. Cathode Plate (Emitter Target Metal)
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Curved emitter plate
    ctx.arc(cathodeScreenX + 15, tubeY, tubeHeight * 0.36, Math.PI * 0.65, Math.PI * 1.35);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Cathode', cathodeScreenX, tubeTop + 24);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`(Φ = ${(state.thresholdWavelengthNm > 0 ? (1239.84 / state.thresholdWavelengthNm) : 2.3).toFixed(2)} eV)`, cathodeScreenX, tubeTop + 38);
    ctx.restore();

    // 7. Anode Plate (Collector)
    ctx.save();
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(anodeScreenX, tubeY - tubeHeight * 0.32);
    ctx.lineTo(anodeScreenX, tubeY + tubeHeight * 0.32);
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Collector', anodeScreenX, tubeTop + 24);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('Anode (+/-)', anodeScreenX, tubeTop + 38);
    ctx.restore();

    // 8. Photoelectrons Traveling in Tube
    for (let i = 0; i < state.electrons.length; i++) {
      const e = state.electrons[i];
      const ex = mapSimX(e.x);
      const ey = mapSimY(e.y);

      ctx.beginPath();
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Small minus sign on electron
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('-', ex, ey + 2.5);
    }

    // 9. Retarding / Accelerating Electric Field Arrows (between plates)
    const midPlateX = (cathodeScreenX + anodeScreenX) * 0.5;
    const arrowY = tubeBottom - 26;
    ctx.save();
    const isRetarding = state.stoppingPotentialV > 0 && state.isCurrentCutoff;
    ctx.fillStyle = isRetarding ? '#f87171' : '#34d399';
    ctx.strokeStyle = isRetarding ? '#f87171' : '#34d399';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    if (state.isCurrentCutoff && state.isEmissionActive) {
      ctx.fillText('← Retarding E-Field (V ≤ -Vstop: Electrons Turned Back) ←', midPlateX, arrowY);
    } else if (state.isEmissionActive) {
      ctx.fillText('→ Electric Field Direction →', midPlateX, arrowY);
    }
    ctx.restore();

    // 10. External Circuit & Voltage Source / Microammeter (Bottom Loop)
    const wireY = tubeBottom + 45;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Cathode wire down
    ctx.moveTo(cathodeScreenX, tubeBottom);
    ctx.lineTo(cathodeScreenX, wireY);
    ctx.lineTo(tubeX - 60, wireY);

    // Anode wire down
    ctx.moveTo(anodeScreenX, tubeBottom);
    ctx.lineTo(anodeScreenX, wireY);
    ctx.lineTo(tubeX + 60, wireY);
    ctx.stroke();

    // Center Voltage Power Supply Box
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(tubeX - 55, wireY - 22, 110, 44, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Applied Voltage V', tubeX, wireY - 6);
    ctx.fillStyle = state.isCurrentCutoff ? '#f87171' : '#38bdf8';
    ctx.font = 'bold 12px monospace';
    const vText = `${state.isCurrentCutoff ? '-' : '+'}${(Math.abs(state.stoppingPotentialV)).toFixed(2)} V`;
    ctx.fillText(vText, tubeX, wireY + 12);

    // Microammeter Gauge (Right of circuit)
    const meterX = Math.min(w - 70, tubeRight + 45);
    const meterY = wireY;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(meterX, meterY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('μA', meterX, meterY - 6);
    ctx.fillStyle = state.photocurrentMicroAmps > 0 ? '#34d399' : '#f87171';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`${state.photocurrentMicroAmps.toFixed(1)}`, meterX, meterY + 10);

    // 11. Mini I-V Characteristic Curve Plot (Bottom Right / Left Corner)
    const plotW = 180;
    const plotH = 90;
    const plotX = w - plotW - 20;
    const plotY = h - plotH - 20;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(plotX, plotY, plotW, plotH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('I - V CHARACTERISTIC', plotX + 10, plotY + 14);

    // Plot axes: Origin at (plotX + 60, plotY + plotH - 18)
    const ox = plotX + 65;
    const oy = plotY + plotH - 18;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX + 15, oy);
    ctx.lineTo(plotX + plotW - 12, oy); // V axis
    ctx.moveTo(ox, plotY + 22);
    ctx.lineTo(ox, oy + 8);             // I axis
    ctx.stroke();

    // Stopping potential tick mark on V axis
    const vStopPx = Math.min(45, state.stoppingPotentialV * 12);
    const stopX = ox - vStopPx;
    ctx.strokeStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(stopX, oy - 4);
    ctx.lineTo(stopX, oy + 4);
    ctx.stroke();

    ctx.fillStyle = '#f87171';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('-Vstop', stopX, oy + 12);

    // Saturation current line
    const iSatH = Math.min(45, (state.saturationCurrentMicroAmps / 50.0) * 40);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // From -Vstop to 0: quadratic rise
    ctx.moveTo(stopX, oy);
    for (let vx = stopX; vx <= ox; vx += 2) {
      const frac = (vx - stopX) / (ox - stopX || 1);
      const iy = oy - iSatH * Math.pow(frac, 1.8);
      ctx.lineTo(vx, iy);
    }
    // V >= 0: flat saturation
    ctx.lineTo(plotX + plotW - 15, oy - iSatH);
    ctx.stroke();

    // 12. Top-Left HUD Telemetry Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(16, 16, 260, 136, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PHOTOELECTRIC QUANTUM KINEMATICS', 26, 34);

    const statusColor = state.isEmissionActive ? '#34d399' : '#f87171';
    const statusText = state.isEmissionActive ? 'EMISSION ACTIVE (E ≥ Φ)' : 'BELOW THRESHOLD (E < Φ)';
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`Status: ${statusText}`, 26, 50);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px monospace';
    ctx.fillText(`Photon Energy E:  ${state.photonEnergyEv.toFixed(2)} eV`, 26, 68);
    ctx.fillText(`Target Work Φ:   ${(state.thresholdWavelengthNm > 0 ? (1239.84 / state.thresholdWavelengthNm) : 2.3).toFixed(2)} eV`, 26, 84);
    ctx.fillText(`K_max (hf - Φ):  ${state.maxKineticEnergyEv.toFixed(2)} eV`, 26, 100);
    ctx.fillText(`Stopping V_stop: ${state.stoppingPotentialV.toFixed(2)} V`, 26, 116);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px monospace';
    ctx.fillText(`Cutoff λ_c:      ${state.thresholdWavelengthNm.toFixed(1)} nm`, 26, 134);

    // 13. Bottom Pedagogical Guidance Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(16, h - 38, w - plotW - 46, 26, 6);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const bottomText = !state.isEmissionActive
      ? `Incident photon energy (${state.photonEnergyEv.toFixed(2)} eV) is below work function Φ. No electrons can be emitted.`
      : state.isCurrentCutoff
      ? `Stopping potential reached (V ≤ -Vstop = -${state.stoppingPotentialV.toFixed(2)}V). Maximum kinetic electrons are turned back.`
      : `Photoelectrons emitted with K_max = ${state.maxKineticEnergyEv.toFixed(2)} eV. Current is flowing into collector.`;
    ctx.fillText(bottomText, (w - plotW - 46) * 0.5 + 8, h - 22);
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

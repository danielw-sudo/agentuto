import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { TelemetrySparkline } from './TelemetrySparkline';

export interface LiveTelemetryCardProps {
  sandboxId: string;
  state: any;
}

export const LiveTelemetryCard: React.FC<LiveTelemetryCardProps> = React.memo(({ sandboxId, state }) => {
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!state) return;
    const metric =
      sandboxId === 'harmonic-oscillator'
        ? (state.x ?? 0)
        : sandboxId === 'lorenz-attractor'
        ? (state.divergence ?? 0)
        : sandboxId === 'faraday-induction'
        ? (state.emf ?? 0)
        : sandboxId === 'maxwell-boltzmann'
        ? (state.empiricalPressure ?? 0)
        : sandboxId === 'quantum-tunneling'
        ? (state.transmission ?? 0)
        : sandboxId === 'wave-optics'
        ? (state.fringeSpacingMm ?? 0)
        : sandboxId === 'kepler-orbits'
        ? (state.r ?? 0)
        : sandboxId === 'projectile-drag'
        ? (state.y ?? 0)
        : sandboxId === 'lcr-circuit'
        ? (state.current ?? 0)
        : sandboxId === 'standing-waves'
        ? (state.kineticEnergy ?? 0)
        : sandboxId === 'doppler-shift'
        ? (state.observedFrequencyAtReceiver ?? 0)
        : sandboxId === 'photoelectric-effect'
        ? (state.photocurrentMicroAmps ?? 0)
        : sandboxId === 'carnot-cycle'
        ? (state.pressureAtm ?? 0)
        : sandboxId === 'gauss-flux'
        ? (state.enclosedChargeNc ?? 0)
        : sandboxId === 'conservation-momentum'
        ? (state.totalMomentumMag ?? 0)
        : sandboxId === 'rc-rl-circuits'
        ? (state.componentVoltage ?? 0)
        : (state.speed ?? 0);

    setHistory((prev) => {
      const next = [...prev, metric];
      return next.length > 45 ? next.slice(next.length - 45) : next;
    });
  }, [state, sandboxId]);

  if (!state) return null;

  if (sandboxId === 'lorenz-attractor') {
    const div = state.divergence ?? 0;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Chaos Telemetry (MIT 18.03)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Particle 1 (x, y)</span>
            <span className="text-sky-300">
              ({state.pos1?.x?.toFixed(1) ?? 0}, {state.pos1?.y?.toFixed(1) ?? 0})
            </span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Particle 2 (x, y)</span>
            <span className="text-pink-300">
              ({state.pos2?.x?.toFixed(1) ?? 0}, {state.pos2?.y?.toFixed(1) ?? 0})
            </span>
          </div>

          <div className="col-span-2 flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Lyapunov Separation Δr</span>
            <span className="text-amber-300 font-bold text-xs">{div.toFixed(4)}</span>
          </div>
        </div>

        {/* Real-time Lyapunov Divergence Sparkline */}
        <TelemetrySparkline
          data={history}
          color="#ec4899"
          label="Separation Δr(t)"
          unit=""
        />
      </GlassPanel>
    );
  }

  if (sandboxId === 'faraday-induction') {
    const emf = state.emf ?? 0;
    const current = state.current ?? 0;
    const lenzF = state.lenzForce ?? 0;
    const power = state.dissipatedPower ?? 0;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Faraday & Lenz (MIT 8.02)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Axis Pos z</span>
            <span className="text-ink font-semibold">{state.z?.toFixed(2) ?? 0} m</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Induced EMF</span>
            <span className="text-sky-300 font-semibold">{emf.toFixed(3)} V</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Induced I</span>
            <span className={`font-semibold ${current >= 0 ? 'text-cyan-300' : 'text-amber-300'}`}>
              {current.toFixed(3)} A
            </span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Lenz Braking</span>
            <span className="text-rose-400 font-semibold">{lenzF.toFixed(3)} N</span>
          </div>
        </div>

        {/* Real-time EMF Oscilloscope Sparkline */}
        <TelemetrySparkline
          data={history}
          color="#f59e0b"
          label="Induced EMF ℰ(t)"
          unit="V"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>Ohmic Loss (I²R):</span>
          <span className="text-amber-300 font-semibold">{power.toFixed(3)} W</span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'maxwell-boltzmann') {
    const pEmp = state.empiricalPressure ?? 0;
    const pIdeal = state.idealPressure ?? 0;
    const area = (state.chamberWidth ?? 6) * (state.chamberHeight ?? 6);

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Kinetic Gas (MIT 8.044)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Temperature</span>
            <span className="text-amber-300 font-semibold">{state.temperature?.toFixed(0) ?? 300} K</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Volume / Area</span>
            <span className="text-ink font-semibold">{area.toFixed(1)} m²</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Empirical P</span>
            <span className="text-emerald-300 font-semibold">{pEmp.toFixed(1)} Pa</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Ideal Gas P</span>
            <span className="text-sky-300 font-semibold">{pIdeal.toFixed(1)} Pa</span>
          </div>
        </div>

        {/* Real-time Pressure Sparkline */}
        <TelemetrySparkline
          data={history}
          color="#10b981"
          label="Wall Pressure P(t)"
          unit="Pa"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>RMS Speed v_rms:</span>
          <span className="text-accent font-semibold">{state.vRms?.toFixed(1) ?? 0} m/s</span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'quantum-tunneling') {
    const tPercent = Math.min(100, Math.max(0, (state.transmission ?? 0) * 100));
    const rPercent = Math.min(100, Math.max(0, (state.reflection ?? 0) * 100));
    const norm = state.norm ?? 1.0;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Quantum Waves (MIT 8.04)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Transmission T</span>
            <span className="text-cyan-300 font-semibold">{tPercent.toFixed(1)}%</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Reflection R</span>
            <span className="text-rose-400 font-semibold">{rPercent.toFixed(1)}%</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Energy / Barrier</span>
            <span className="text-amber-300 font-semibold">
              {state.particleEnergy?.toFixed(1) ?? 0} / {state.barrierHeight?.toFixed(1) ?? 0}
            </span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Wave Vector k0</span>
            <span className="text-accent font-semibold">{state.waveNumber?.toFixed(2) ?? 0}</span>
          </div>
        </div>

        {/* Real-time Transmission Sparkline */}
        <TelemetrySparkline
          data={history}
          color="#38bdf8"
          label="Transmission T(t)"
          unit="%"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>Unitarity ∫|ψ|²:</span>
          <span className="text-emerald-400 font-semibold">{norm.toFixed(6)}</span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'wave-optics') {
    const [r, g, b] = state.rgbColor ?? [255, 60, 60];
    const laserColorStr = `rgb(${r}, ${g}, ${b})`;
    const dy = state.fringeSpacingMm ?? 0;
    const wEnv = state.envelopeWidthMm ?? 0;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Wave Optics (MIT 8.03)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Wavelength λ</span>
            <span className="font-semibold flex items-center gap-1.5" style={{ color: laserColorStr }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: laserColorStr }} />
              {state.wavelength?.toFixed(0) ?? 633} nm
            </span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Slit Separation d</span>
            <span className="text-ink font-semibold">{state.slitSeparation?.toFixed(1) ?? 25} μm</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Fringe Spacing Δy</span>
            <span className="text-sky-300 font-semibold">{dy > 0 ? `${dy.toFixed(2)} mm` : 'Single Slit'}</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Envelope 2λL/a</span>
            <span className="text-amber-300 font-semibold">{wEnv.toFixed(2)} mm</span>
          </div>
        </div>

        {/* Real-time Fringe Spacing Sparkline */}
        <TelemetrySparkline
          data={history}
          color={laserColorStr}
          label="Fringe Spacing Δy(t)"
          unit="mm"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>Screen Distance L:</span>
          <span className="text-ink font-semibold">{state.screenDistance?.toFixed(1) ?? 1.2} m</span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'kepler-orbits') {
    const r = state.r ?? 0;
    const speed = state.speed ?? 0;
    const energy = state.specificEnergy ?? 0;
    const ecc = state.eccentricity ?? 0;
    const sma = state.semiMajorAxis ?? 0;
    const period = state.orbitalPeriod ?? 0;
    const measuredPeriod = state.measuredPeriod ?? 0;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Keplerian Orbits (MIT 8.01)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Radius r</span>
            <span className="text-ink font-semibold">{r.toFixed(2)} AU</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Speed |v|</span>
            <span className="text-emerald-400 font-semibold">{speed.toFixed(2)} AU/yr</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Eccentricity e</span>
            <span className="text-amber-300 font-semibold">{ecc.toFixed(3)}</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Semi-Major a</span>
            <span className="text-sky-300 font-semibold">{sma > 0 ? `${sma.toFixed(2)} AU` : 'Unbound'}</span>
          </div>

          <div className="col-span-2 flex flex-col bg-sunken p-1.5 rounded border border-line">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted">Specific Energy ε</span>
              <span className={`text-xs font-bold ${energy < 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                {energy < 0 ? 'Bound (Elliptic)' : 'Unbound (Hyperbolic)'}
              </span>
            </div>
            <span className="text-ink font-mono text-xs">{energy.toFixed(3)} (AU/yr)²</span>
          </div>
        </div>

        {/* Real-time Radius Oscillation Sparkline */}
        <TelemetrySparkline
          data={history}
          color="#f59e0b"
          label="Radial Distance r(t)"
          unit="AU"
        />

        {sma > 0 && ecc < 1 && (
          <div className="flex flex-col gap-1 pt-1 border-t border-line text-xs font-mono text-muted">
            <div className="flex justify-between items-center">
              <span>Measured T (2π orbit):</span>
              <span className="text-emerald-400 font-semibold">
                {measuredPeriod > 0 ? `${measuredPeriod.toFixed(2)} yr` : 'Measuring 1st orbit…'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Predicted T (Kepler III):</span>
              <span className="text-amber-300 font-semibold">{period.toFixed(2)} yr</span>
            </div>
          </div>
        )}
      </GlassPanel>
    );
  }

  if (sandboxId === 'projectile-drag') {
    const x = state.x ?? 0;
    const y = state.y ?? 0;
    const speed = state.speed ?? 0;
    const dragF = state.dragForce ?? 0;
    const maxAlt = state.maxAltitude ?? 0;
    const vacR = state.vacuumRange ?? 0;
    const isLanded = !!state.isLanded;
    const vTerm = state.terminalVelocity ?? Infinity;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Projectile Drag (MIT 8.01)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Range x</span>
            <span className="text-ink font-semibold">{x.toFixed(1)} m</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Altitude y</span>
            <span className="text-amber-300 font-semibold">{y.toFixed(1)} m</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Speed |v|</span>
            <span className="text-emerald-400 font-semibold">{speed.toFixed(1)} m/s</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Drag Force F_d</span>
            <span className="text-rose-400 font-semibold">{dragF.toFixed(2)} N</span>
          </div>

          <div className="col-span-2 flex flex-col bg-sunken p-1.5 rounded border border-line">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Status</span>
              <span className={`font-semibold ${isLanded ? 'text-amber-400' : 'text-sky-400'}`}>
                {isLanded ? `Landed at ${state.impactDistance?.toFixed(1)} m` : 'In Flight'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted mt-1">
              <span>Peak Alt: <strong className="text-ink">{maxAlt.toFixed(1)} m</strong></span>
              <span>Vac Range: <strong className="text-sky-300">{vacR.toFixed(1)} m</strong></span>
            </div>
          </div>
        </div>

        {/* Real-time Altitude Arc Sparkline */}
        <TelemetrySparkline
          data={history}
          color="#f59e0b"
          label="Altitude y(t)"
          unit="m"
        />

        {Number.isFinite(vTerm) && (
          <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
            <span>Terminal v_term:</span>
            <span className="text-amber-300 font-semibold">{vTerm.toFixed(1)} m/s</span>
          </div>
        )}
      </GlassPanel>
    );
  }

  if (sandboxId === 'lcr-circuit') {
    const cur = state.current ?? 0;
    const vSrc = state.vSource ?? 0;
    const z = state.impedance ?? 0;
    const phi = state.phaseAngleDeg ?? 0;
    const f0 = state.resonantFrequency ?? 0;
    const q = state.qualityFactor ?? 0;
    const power = state.power ?? 0;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">LCR Resonance (MIT 8.02)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Current I(t)</span>
            <span className="text-cyan-300 font-semibold">{cur.toFixed(3)} A</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Source V(t)</span>
            <span className="text-amber-300 font-semibold">{vSrc.toFixed(1)} V</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Impedance Z</span>
            <span className="text-ink font-semibold">{z.toFixed(1)} Ω</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Phase Angle φ</span>
            <span className={`font-semibold ${Math.abs(phi) < 3 ? 'text-emerald-400' : phi > 0 ? 'text-purple-300' : 'text-sky-300'}`}>
              {phi.toFixed(1)}°
            </span>
          </div>

          <div className="col-span-2 flex flex-col bg-sunken p-1.5 rounded border border-line">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Resonant f₀: <strong className="text-ink">{f0.toFixed(1)} Hz</strong></span>
              <span className="text-muted">Q-Factor: <strong className="text-emerald-400">{q.toFixed(2)}</strong></span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted mt-1">
              <span>Instant Power P:</span>
              <span className="text-amber-300 font-mono font-semibold">{power.toFixed(2)} W</span>
            </div>
          </div>
        </div>

        {/* Real-time Current Waveform Sparkline */}
        <TelemetrySparkline
          data={history}
          color="#22d3ee"
          label="Current Waveform I(t)"
          unit="A"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>Capacitor Charge:</span>
          <span className="text-cyan-300 font-semibold">{((state.charge ?? 0) * 1e6).toFixed(1)} μC</span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'standing-waves') {
    const v = state.waveSpeed ?? 0;
    const fn = state.harmonicFrequency ?? 0;
    const lambda = state.wavelength ?? 0;
    const nodes = state.nodeCount ?? 0;
    const antinodes = state.antinodeCount ?? 0;
    const ke = (state.kineticEnergy ?? 0) * 1e3;
    const te = (state.totalEnergy ?? 0) * 1e3;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Standing Waves (MIT 8.03)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Wave Speed v</span>
            <span className="text-emerald-400 font-semibold">{v.toFixed(1)} m/s</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Frequency f_n</span>
            <span className="text-amber-300 font-semibold">{fn.toFixed(1)} Hz</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Wavelength λ</span>
            <span className="text-sky-300 font-semibold">{lambda.toFixed(2)} m</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Nodes / Antinodes</span>
            <span className="text-ink font-semibold">{nodes} N / {antinodes} A</span>
          </div>

          <div className="col-span-2 flex flex-col bg-sunken p-1.5 rounded border border-line">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Total: <strong className="text-ink">{te.toFixed(2)} mJ</strong></span>
              <span className="text-muted">Kinetic: <strong className="text-sky-300">{ke.toFixed(2)} mJ</strong></span>
            </div>
          </div>
        </div>

        {/* Real-time Kinetic Energy Oscillation Sparkline */}
        <TelemetrySparkline
          data={history}
          color="#38bdf8"
          label="Kinetic Energy E_k(t)"
          unit="J"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>Fundamental f₁:</span>
          <span className="text-amber-300 font-semibold">{(state.fundamentalFrequency ?? 0).toFixed(1)} Hz</span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'doppler-shift') {
    const mach = state.machNumber ?? 0;
    const isSuper = state.isSupersonic ?? false;
    const mu = state.machAngleDeg ?? 90;
    const fAhead = state.observedFrequencyAhead ?? 0;
    const fBehind = state.observedFrequencyBehind ?? 0;
    const fRecv = state.observedFrequencyAtReceiver ?? 0;
    const lamAhead = state.compressedWavelengthAhead ?? 0;
    const lamBehind = state.stretchedWavelengthBehind ?? 0;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Doppler Kinematics (MIT 8.03)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Mach Number M</span>
            <span className={isSuper ? 'text-amber-400 font-bold' : 'text-sky-400 font-semibold'}>
              {mach.toFixed(2)} {isSuper ? '(M ≥ 1)' : ''}
            </span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Detector f'</span>
            <span className="text-purple-300 font-semibold">{fRecv.toFixed(1)} Hz</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Ahead f'</span>
            <span className="text-emerald-400 font-semibold">{fAhead.toFixed(1)} Hz</span>
            <span className="text-[9px] text-muted">λ'={lamAhead.toFixed(1)}m</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Behind f'</span>
            <span className="text-rose-400 font-semibold">{fBehind.toFixed(1)} Hz</span>
            <span className="text-[9px] text-muted">λ'={lamBehind.toFixed(1)}m</span>
          </div>

          {isSuper && (
            <div className="col-span-2 flex justify-between items-center bg-amber-950/20 px-2 py-1 rounded border border-amber-600/30 text-xs font-mono">
              <span className="text-amber-300">Mach Angle μ:</span>
              <span className="text-amber-200 font-bold">{mu.toFixed(1)}° (sin μ = 1/M)</span>
            </div>
          )}
        </div>

        <TelemetrySparkline
          data={history}
          color="#c084fc"
          label="Detector Pitch f'(t)"
          unit="Hz"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>Source x:</span>
          <span className="text-ink font-semibold">{(state.sourceX ?? 0).toFixed(1)} m</span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'photoelectric-effect') {
    const ePhot = state.photonEnergyEv ?? 0;
    const kMax = state.maxKineticEnergyEv ?? 0;
    const vStop = state.stoppingPotentialV ?? 0;
    const iCurrent = state.photocurrentMicroAmps ?? 0;
    const iSat = state.saturationCurrentMicroAmps ?? 0;
    const lamCut = state.thresholdWavelengthNm ?? 0;
    const isEmit = state.isEmissionActive ?? false;
    const isCut = state.isCurrentCutoff ?? false;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Photoelectric Effect (MIT 8.04)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Photon E</span>
            <span className={isEmit ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {ePhot.toFixed(2)} eV
            </span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Photocurrent I</span>
            <span className={iCurrent > 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-semibold'}>
              {iCurrent.toFixed(1)} μA
            </span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">K_max (hf - Φ)</span>
            <span className="text-sky-300 font-semibold">{kMax.toFixed(2)} eV</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Stopping V_stop</span>
            <span className="text-amber-300 font-semibold">{vStop.toFixed(2)} V</span>
          </div>

          <div className="col-span-2 flex justify-between items-center bg-sunken px-2 py-1 rounded border border-line text-xs">
            <span className="text-muted">Cutoff λ_c: <strong className="text-amber-300">{lamCut.toFixed(1)} nm</strong></span>
            <span className="text-muted">I_sat: <strong className="text-ink">{iSat.toFixed(1)} μA</strong></span>
          </div>
        </div>

        <TelemetrySparkline
          data={history}
          color={isCut ? '#f87171' : '#34d399'}
          label="Photocurrent I(t)"
          unit="μA"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>Target Status:</span>
          <span className={isEmit ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {isEmit ? (isCut ? 'V ≤ -Vstop (Cutoff)' : 'Emitting') : 'E < Φ (No Emission)'}
          </span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'carnot-cycle') {
    const stage = state.stageIndex ?? 1;
    const pAtm = state.pressureAtm ?? 1;
    const vLit = state.volumeLiters ?? 10;
    const eff = (state.carnotEfficiency ?? 0) * 100;
    const wNet = state.workNetJ ?? 0;
    const qH = state.heatAbsorbedQhJ ?? 0;
    const qC = state.heatRejectedQcJ ?? 0;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Carnot Cycle (MIT 8.044)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Carnot η</span>
            <span className="text-emerald-400 font-bold">{eff.toFixed(1)}%</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Net Work W</span>
            <span className="text-sky-300 font-semibold">{wNet.toFixed(0)} J</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Pressure P</span>
            <span className="text-ink font-semibold">{pAtm.toFixed(2)} atm</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Volume V</span>
            <span className="text-ink font-semibold">{vLit.toFixed(1)} L</span>
          </div>

          <div className="col-span-2 flex justify-between items-center bg-sunken px-2 py-1 rounded border border-line text-xs">
            <span className="text-muted">Q_H In: <strong className="text-rose-400">{qH.toFixed(0)} J</strong></span>
            <span className="text-muted">Q_C Out: <strong className="text-sky-400">{qC.toFixed(0)} J</strong></span>
          </div>
        </div>

        <TelemetrySparkline
          data={history}
          color="#10b981"
          label="Pressure P(t)"
          unit="atm"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>Stage {stage}:</span>
          <span className="text-amber-300 font-semibold truncate max-w-[150px]">
            {stage === 1 ? 'Isothermal Exp.' : stage === 2 ? 'Adiabatic Exp.' : stage === 3 ? 'Isothermal Comp.' : 'Adiabatic Comp.'}
          </span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'gauss-flux') {
    const qEnc = state.enclosedChargeNc ?? 0;
    const fluxTh = state.theoreticalFlux ?? 0;
    const fluxNum = state.numericalFlux ?? 0;
    const errPct = state.fluxErrorPercent ?? 0;
    const q1In = state.charge1Enclosed ?? false;
    const q2In = state.charge2Enclosed ?? false;
    const rG = state.surfaceRadius ?? 1.5;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Gauss's Law Flux (MIT 8.02)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Enclosed Q_enc</span>
            <span className={qEnc > 0 ? 'text-amber-400 font-bold' : qEnc < 0 ? 'text-sky-400 font-bold' : 'text-emerald-400 font-bold'}>
              {qEnc > 0 ? `+${qEnc.toFixed(1)}` : qEnc.toFixed(1)} nC
            </span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Surface R_G</span>
            <span className="text-ink font-semibold">{rG.toFixed(2)} m</span>
          </div>

          <div className="col-span-2 flex flex-col bg-sunken p-1.5 rounded border border-line">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">∮ E · dA:</span>
              <strong className="text-emerald-400">{fluxNum.toFixed(1)} N·m²/C</strong>
            </div>
            <div className="flex justify-between items-center text-xs pt-0.5">
              <span className="text-muted">Theory Q/ε₀:</span>
              <strong className="text-ink">{fluxTh.toFixed(1)} N·m²/C</strong>
            </div>
          </div>

          <div className="col-span-2 flex justify-between items-center bg-sunken px-2 py-1 rounded border border-line text-xs">
            <span className="text-muted">q₁ ({q1In ? 'Inside' : 'Outside'})</span>
            <span className="text-muted">q₂ ({q2In ? 'Inside' : 'Outside'})</span>
          </div>
        </div>

        <TelemetrySparkline
          data={history}
          color="#38bdf8"
          label="Enclosed Charge Q_enc(t)"
          unit="nC"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>Integration Precision:</span>
          <span className="text-emerald-400 font-semibold">
            {Math.abs(fluxTh) > 1e-3 ? `${(100 - errPct).toFixed(1)}% match` : 'Net 0.0 N·m²/C'}
          </span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'conservation-momentum') {
    const pTot = state.totalMomentumMag ?? 0;
    const px = state.totalMomentumX ?? 0;
    const py = state.totalMomentumY ?? 0;
    const vcm = Math.hypot(state.comVx ?? 0, state.comVy ?? 0);
    const keTot = state.totalKineticEnergy ?? 0;
    const keCom = state.comKineticEnergy ?? 0;
    const keInt = state.internalKineticEnergy ?? 0;
    const colCount = state.collisionCount ?? 0;
    const isIsolated = state.isSystemIsolated ?? true;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Momentum & CoM (MIT 8.01)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">P_total</span>
            <span className={`${isIsolated ? 'text-emerald-400' : 'text-amber-300'} font-bold`}>{pTot.toFixed(2)} kg·m/s</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">{isIsolated ? 'V_cm (Isolated)' : 'V_cm (Shifted)'}</span>
            <span className="text-sky-300 font-semibold">{vcm.toFixed(2)} m/s</span>
          </div>

          <div className="col-span-2 flex flex-col bg-sunken p-1.5 rounded border border-line">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Momentum Vector:</span>
              <strong className="text-ink">[{px.toFixed(2)}, {py.toFixed(2)}]</strong>
            </div>
            <div className="flex justify-between items-center text-xs pt-0.5">
              <span className="text-muted">KE (Total / CoM):</span>
              <strong className="text-amber-300">{keTot.toFixed(1)} J / {keCom.toFixed(1)} J</strong>
            </div>
          </div>

          <div className="col-span-2 flex justify-between items-center bg-sunken px-2 py-1 rounded border border-line text-xs">
            <span className="text-muted">Internal KE: <strong className="text-purple-300">{keInt.toFixed(1)} J</strong></span>
            <span className="text-muted">Collisions: <strong className="text-ink">{colCount}</strong></span>
          </div>
        </div>

        <TelemetrySparkline
          data={history}
          color={isIsolated ? '#10b981' : '#f59e0b'}
          label="Total Momentum |P|(t)"
          unit="kg·m/s"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>System State:</span>
          <span className={`${isIsolated ? 'text-emerald-400' : 'text-amber-400'} font-semibold`}>
            {isIsolated ? 'Isolated (P Invariant)' : 'Wall Contact (External F)'}
          </span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'rc-rl-circuits') {
    const isRL = state.circuitType === 1;
    const vIn = state.inputVoltage ?? 0;
    const vOut = state.componentVoltage ?? 0;
    const vR = state.resistorVoltage ?? 0;
    const currentMa = state.currentMilliAmps ?? 0;
    const tauMs = state.timeConstantMs ?? 0;
    const uStore = state.storedEnergyMilliJoules ?? 0;
    const qU = state.chargeMicroCoulombs ?? 0;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">
            {isRL ? 'RL Inductive' : 'RC Capacitive'} Transient
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Time Constant τ</span>
            <span className="text-cyan-300 font-bold">{tauMs.toFixed(2)} ms</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Current I(t)</span>
            <span className="text-amber-300 font-semibold">{currentMa.toFixed(1)} mA</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">{isRL ? 'Back EMF VL(t)' : 'Capacitor VC(t)'}</span>
            <span className="text-emerald-400 font-bold">{vOut.toFixed(2)} V</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Resistor VR(t)</span>
            <span className="text-rose-300 font-semibold">{vR.toFixed(2)} V</span>
          </div>

          <div className="col-span-2 flex flex-col bg-sunken p-1.5 rounded border border-line">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Source V_in:</span>
              <strong className="text-ink">{vIn.toFixed(1)} V</strong>
            </div>
            <div className="flex justify-between items-center text-xs pt-0.5">
              <span className="text-muted">Stored Energy:</span>
              <strong className="text-purple-300">{uStore.toFixed(2)} mJ</strong>
            </div>
          </div>

          {!isRL && (
            <div className="col-span-2 flex justify-between items-center bg-sunken px-2 py-1 rounded border border-line text-xs">
              <span className="text-muted">Stored Charge:</span>
              <span className="text-ink font-mono font-semibold">{qU.toFixed(1)} μC</span>
            </div>
          )}
        </div>

        <TelemetrySparkline
          data={history}
          color="#06b6d4"
          label={isRL ? 'V_L(t) Back EMF' : 'V_C(t) Voltage'}
          unit="V"
        />

        <div className="flex justify-between items-center pt-1 border-t border-line text-xs font-mono text-muted">
          <span>63.2% Threshold (1τ):</span>
          <span className="text-cyan-400 font-semibold">
            {isRL ? `${(vIn * 0.368).toFixed(1)} V (decay)` : `${(vIn * 0.632).toFixed(1)} V (rise)`}
          </span>
        </div>
      </GlassPanel>
    );
  }

  if (sandboxId === 'harmonic-oscillator') {
    const ke = state.kineticEnergy ?? 0;
    const pe = state.potentialEnergy ?? 0;
    const te = state.totalEnergy ?? (ke + pe);
    const kePercent = te > 0 ? Math.min(100, Math.max(0, (ke / te) * 100)) : 0;

    return (
      <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-semibold tracking-wider uppercase">Live Telemetry (MIT 18.03)</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Displacement x</span>
            <span className="text-ink font-semibold">{state.x?.toFixed(2) ?? 0} m</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Velocity ẋ</span>
            <span className="text-ink font-semibold">{state.v?.toFixed(2) ?? 0} m/s</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Kinetic Energy</span>
            <span className="text-accent font-semibold">{ke.toFixed(2)} J</span>
          </div>

          <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
            <span className="text-xs text-muted">Potential Energy</span>
            <span className="text-emerald-300 font-semibold">{pe.toFixed(2)} J</span>
          </div>
        </div>

        {/* Real-time Oscilloscope Sparkline */}
        <TelemetrySparkline
          data={history}
          color="#818cf8"
          label="x(t) Waveform"
          unit="m"
        />

        {/* Energy Partition Bar */}
        <div className="flex flex-col gap-1 pt-1 border-t border-line text-xs font-mono">
          <div className="flex justify-between text-muted">
            <span>Total E: <strong className="text-ink">{te.toFixed(2)} J</strong></span>
            <span>K: {kePercent.toFixed(0)}%</span>
          </div>
          <div className="w-full h-1.5 bg-emerald-950/80 rounded-full overflow-hidden flex">
            <div
              className="bg-indigo-500 transition-all duration-75"
              style={{ width: `${kePercent}%` }}
              title={`Kinetic Energy: ${ke.toFixed(2)} J`}
            />
          </div>
        </div>
      </GlassPanel>
    );
  }

  // Default: Lorentz Force Telemetry
  return (
    <GlassPanel subtle className="w-full p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 border-b border-line pb-1.5 text-ink">
        <Activity className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-xs font-semibold tracking-wider uppercase">Live Telemetry (MIT 8.02)</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
          <span className="text-xs text-muted">Position (x, y)</span>
          <span className="text-ink">
            ({state.pos?.x?.toFixed(2) ?? 0}, {state.pos?.y?.toFixed(2) ?? 0})
          </span>
        </div>

        <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
          <span className="text-xs text-muted">Velocity (vx, vy)</span>
          <span className="text-ink">
            ({state.vel?.x?.toFixed(1) ?? 0}, {state.vel?.y?.toFixed(1) ?? 0})
          </span>
        </div>

        <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
          <span className="text-xs text-muted">Speed |v|</span>
          <span className="text-accent font-semibold">{state.speed?.toFixed(2) ?? 0} m/s</span>
        </div>

        <div className="flex flex-col bg-sunken p-1.5 rounded border border-line">
          <span className="text-xs text-muted">Kinetic Energy</span>
          <span className="text-emerald-300 font-semibold">{state.kineticEnergy?.toFixed(1) ?? 0} μJ</span>
        </div>
      </div>

      {/* Real-time Speed Oscilloscope Sparkline */}
      <TelemetrySparkline
        data={history}
        color="#38bdf8"
        label="|v|(t) Magnitude"
        unit="m/s"
      />
    </GlassPanel>
  );
});

/**
 * What the Virtual Photogate reads from a running instrument: a position it watches cross the gate, and the
 * speed it reports at that moment. The choice is per instrument, because each engine names its state
 * differently. Pure, so the suite can run it against the real engines without React.
 *
 * It returns null when the instrument offers the gate nothing to read: the gate is then not offered, instead
 * of showing a flat 0 in a box labelled m and m/s. An instrument the function does not name is read through
 * `pos.x` and `speed`, and only if its state really has both as finite numbers.
 */
export interface PhotogateReading {
  position: number;
  speed: number;
}

export function photogateReading(
  sandboxId: string,
  state: any,
  params: Record<string, number> | undefined,
): PhotogateReading | null {
  const s = state ?? {};
  let position: number;
  switch (sandboxId) {
    case 'harmonic-oscillator':
    case 'projectile-drag':
    case 'doppler-shift':
      position = s.x ?? s.sourceX ?? 0;
      break;
    case 'photoelectric-effect':
      position = s.photocurrentMicroAmps ?? 0;
      break;
    case 'carnot-cycle':
      position = s.volumeLiters ?? 0;
      break;
    case 'gauss-flux':
      position = s.enclosedChargeNc ?? 0;
      break;
    case 'conservation-momentum':
      position = s.body1?.x ?? 0;
      break;
    case 'rc-rl-circuits':
      position = s.componentVoltage ?? 0;
      break;
    case 'lcr-circuit':
      position = (s.charge ?? 0) * 1e6;
      break;
    case 'standing-waves':
      position = (s.stringY?.[Math.floor((s.stringY?.length || 1) / 2)] ?? 0) * 100;
      break;
    case 'faraday-induction':
      position = s.z ?? 0;
      break;
    case 'lorenz-attractor':
      position = s.pos1?.x ?? 0;
      break;
    default:
      // Not named above: only a state that really carries a position and a speed has anything to read.
      if (!Number.isFinite(s.pos?.x) || !Number.isFinite(s.speed)) return null;
      position = s.pos.x;
  }
  let speed: number;
  switch (sandboxId) {
    case 'harmonic-oscillator':
      speed = Math.abs(s.v ?? 0);
      break;
    case 'lcr-circuit':
      speed = Math.abs(s.current ?? 0);
      break;
    case 'standing-waves':
      speed = s.waveSpeed ?? 0;
      break;
    case 'doppler-shift':
      speed = Math.abs(params?.sourceSpeed ?? 0);
      break;
    case 'photoelectric-effect':
      speed = s.maxElectronSpeedMps ?? 0;
      break;
    case 'carnot-cycle':
      speed = s.pressureAtm ?? 0;
      break;
    case 'gauss-flux':
      speed = s.numericalFlux ?? 0;
      break;
    case 'conservation-momentum':
      speed = Math.hypot(s.body1?.vx ?? 0, s.body1?.vy ?? 0);
      break;
    case 'rc-rl-circuits':
      speed = s.currentMilliAmps ?? 0;
      break;
    case 'faraday-induction':
      speed = Math.abs(s.vz ?? 0);
      break;
    default:
      speed = s.speed ?? 0;
  }
  return { position, speed };
}

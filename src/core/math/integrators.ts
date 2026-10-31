import { Vec3 } from './vector3';

/**
 * 4th-Order Runge-Kutta integrator for vector ODEs:
 * dy/dt = f(t, y)
 */
export function rk4VectorStep(
  y: Vec3,
  t: number,
  dt: number,
  derivativeFn: (t: number, y: Vec3) => Vec3
): Vec3 {
  const k1 = derivativeFn(t, y);
  const k2 = derivativeFn(t + 0.5 * dt, y.addScaled(k1, 0.5 * dt));
  const k3 = derivativeFn(t + 0.5 * dt, y.addScaled(k2, 0.5 * dt));
  const k4 = derivativeFn(t + dt, y.addScaled(k3, dt));

  // y_next = y + (dt / 6) * (k1 + 2*k2 + 2*k3 + k4)
  const weightedSlope = k1
    .add(k2.scale(2))
    .add(k3.scale(2))
    .add(k4)
    .scale(dt / 6);

  return y.add(weightedSlope);
}

/**
 * Coupled 6-DOF (Position and Velocity) RK4 integrator:
 * dr/dt = v
 * dv/dt = a(t, r, v)
 */
export function rk4KinematicStep(
  pos: Vec3,
  vel: Vec3,
  t: number,
  dt: number,
  accelFn: (t: number, r: Vec3, v: Vec3) => Vec3
): { pos: Vec3; vel: Vec3 } {
  // k1
  const k1_v = vel;
  const k1_a = accelFn(t, pos, vel);

  // k2
  const k2_pos = pos.addScaled(k1_v, 0.5 * dt);
  const k2_vel = vel.addScaled(k1_a, 0.5 * dt);
  const k2_v = k2_vel;
  const k2_a = accelFn(t + 0.5 * dt, k2_pos, k2_vel);

  // k3
  const k3_pos = pos.addScaled(k2_v, 0.5 * dt);
  const k3_vel = vel.addScaled(k2_a, 0.5 * dt);
  const k3_v = k3_vel;
  const k3_a = accelFn(t + 0.5 * dt, k3_pos, k3_vel);

  // k4
  const k4_pos = pos.addScaled(k3_v, dt);
  const k4_vel = vel.addScaled(k3_a, dt);
  const k4_v = k4_vel;
  const k4_a = accelFn(t + dt, k4_pos, k4_vel);

  // Combined update
  const dPos = k1_v
    .add(k2_v.scale(2))
    .add(k3_v.scale(2))
    .add(k4_v)
    .scale(dt / 6);

  const dVel = k1_a
    .add(k2_a.scale(2))
    .add(k3_a.scale(2))
    .add(k4_a)
    .scale(dt / 6);

  return {
    pos: pos.add(dPos),
    vel: vel.add(dVel),
  };
}

/**
 * Velocity Verlet integrator for conservative/position-dependent forces:
 * r(t + dt) = r(t) + v(t)*dt + 0.5*a(t)*dt^2
 * v(t + dt) = v(t) + 0.5*(a(t) + a(t + dt))*dt
 */
export function verletStep(
  pos: Vec3,
  vel: Vec3,
  accel: Vec3,
  dt: number,
  accelFn: (r: Vec3) => Vec3
): { pos: Vec3; vel: Vec3; accel: Vec3 } {
  const nextPos = pos
    .addScaled(vel, dt)
    .addScaled(accel, 0.5 * dt * dt);

  const nextAccel = accelFn(nextPos);

  const nextVel = vel.addScaled(accel.add(nextAccel), 0.5 * dt);

  return { pos: nextPos, vel: nextVel, accel: nextAccel };
}

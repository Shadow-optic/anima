/**
 * Particle flow on the curvature field — ported from OCML/G4 leapfrog sampler.
 *
 * Particles follow the gradient of the health topology. They accelerate
 * towards hills (healthy regions) and away from wells, tracing orbits
 * that make the curvature visible.
 */

import type { MassPoint } from "./curvature";
import { gauss, FABRIC_SIGMA } from "./curvature";

const LEAPFROG_DT = 0.008;
const LEAPFROG_STEPS = 4;
const DAMPING = 0.92;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  factor: string; // which factor spawned it
}

/** Gradient of the curvature field at (px, py). */
function gradient(px: number, py: number, masses: MassPoint[]): [number, number] {
  let gx = 0;
  let gy = 0;
  for (const m of masses) {
    const dx = px - m.x;
    const dy = py - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const g = gauss(dist);
    const coeff = (-m.mass * g) / (FABRIC_SIGMA * FABRIC_SIGMA + 1e-9);
    gx += coeff * dx;
    gy += coeff * dy;
  }
  return [gx, gy];
}

/** Advance one particle by the leapfrog integrator. */
export function stepParticle(p: Particle, masses: MassPoint[]): void {
  for (let i = 0; i < LEAPFROG_STEPS; i++) {
    const [gx, gy] = gradient(p.x, p.y, masses);
    // Particles follow the gradient uphill (towards healthy peaks)
    p.vx += gx * LEAPFROG_DT;
    p.vy += gy * LEAPFROG_DT;
    // Add a slight orbital tangent so particles spiral instead of collapsing
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > 0.001) {
      const tangentX = -p.vy / speed;
      const tangentY = p.vx / speed;
      p.vx += tangentX * 0.003;
      p.vy += tangentY * 0.003;
    }
    p.vx *= DAMPING;
    p.vy *= DAMPING;
    p.x += p.vx * LEAPFROG_DT;
    p.y += p.vy * LEAPFROG_DT;
  }
  // Reflect off the disc boundary
  const r = Math.sqrt(p.x * p.x + p.y * p.y);
  if (r > 0.95) {
    const scale = 0.94 / r;
    p.x *= scale;
    p.y *= scale;
    p.vx *= -0.5;
    p.vy *= -0.5;
  }
  p.age++;
}

/** Spawn a particle near a mass point. */
export function spawnParticle(mass: MassPoint, rng: () => number): Particle {
  const angle = rng() * Math.PI * 2;
  const dist = 0.05 + rng() * 0.15;
  return {
    x: mass.x + Math.cos(angle) * dist,
    y: mass.y + Math.sin(angle) * dist,
    vx: (rng() - 0.5) * 0.02,
    vy: (rng() - 0.5) * 0.02,
    age: 0,
    maxAge: 120 + Math.floor(rng() * 80),
    factor: mass.factor,
  };
}

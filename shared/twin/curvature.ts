/**
 * Gaussian curvature field — ported from OCML/G4 mod.rs.
 *
 * Each health factor becomes a "mass" placed on a 2D disc. Its score
 * determines whether it creates a hill (healthy) or a well (poor).
 * The Gaussian kernel blends neighbouring masses into a smooth surface.
 */

import type { FactorKey, ScoreFactors } from "../types";
import { FACTOR_WEIGHTS } from "../score/longevity";

export const FABRIC_SIGMA = 0.12;
const TWO_SIGMA_SQ = 2 * FABRIC_SIGMA * FABRIC_SIGMA;

export function gauss(angularDist: number): number {
  return Math.exp(-(angularDist * angularDist) / TWO_SIGMA_SQ);
}

export interface MassPoint {
  x: number;
  y: number;
  mass: number; // positive = hill, negative = well
  factor: FactorKey;
  score: number; // 0–1
}

/** Place each health factor around a ring on a unit disc. */
export function factorsToMasses(factors: ScoreFactors): MassPoint[] {
  const keys = Object.keys(FACTOR_WEIGHTS) as FactorKey[];
  return keys.map((key, i) => {
    const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
    const r = 0.55;
    const score = factors[key];
    // Remap 0–1 score to signed mass: 1→+1 (hill), 0→−1 (well), 0.5→0
    const mass = (score - 0.5) * 2 * FACTOR_WEIGHTS[key] * 6;
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      factor: key,
      score,
      mass,
    };
  });
}

/** Sample the curvature field at a point on the disc. */
export function curvatureAt(px: number, py: number, masses: MassPoint[]): number {
  let k = 0;
  for (const m of masses) {
    const dx = px - m.x;
    const dy = py - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    k += m.mass * gauss(dist);
  }
  return k;
}

/** Build a height-map grid over the disc. */
export function buildHeightMap(
  masses: MassPoint[],
  resolution: number
): Float32Array {
  const map = new Float32Array(resolution * resolution);
  const step = 2 / (resolution - 1);
  for (let row = 0; row < resolution; row++) {
    const y = -1 + row * step;
    for (let col = 0; col < resolution; col++) {
      const x = -1 + col * step;
      if (x * x + y * y > 1.05) {
        map[row * resolution + col] = 0;
        continue;
      }
      map[row * resolution + col] = curvatureAt(x, y, masses);
    }
  }
  return map;
}

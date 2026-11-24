/**
 * Möbius orbifold circularity — ported from orbifold.rs.
 *
 * Maps the particle trail through a Möbius transform. High circularity
 * means the pet's health factors are balanced; low circularity means
 * they're lopsided. This gives a single "harmony" number.
 */

function csub(a: [number, number], b: [number, number]): [number, number] {
  return [a[0] - b[0], a[1] - b[1]];
}

function cdiv(a: [number, number], b: [number, number]): [number, number] {
  const d = Math.max(b[0] * b[0] + b[1] * b[1], 1e-12);
  return [
    (a[0] * b[0] + a[1] * b[1]) / d,
    (a[1] * b[0] - a[0] * b[1]) / d,
  ];
}

export function mobiusTransform(
  z: [number, number],
  z0: [number, number],
  z1: [number, number],
  z2: [number, number]
): [number, number] {
  const num = cdiv(csub(z, z0), csub(z, z2));
  const den = cdiv(csub(z1, z0), csub(z1, z2));
  return cdiv(num, den);
}

export interface OrbifoldSample {
  u: number;
  v: number;
  theta: number;
  radius: number;
}

/** Map a trail of [x,y] positions through the Möbius transform. */
export function orbifoldFlow(trail: [number, number][]): OrbifoldSample[] {
  if (trail.length < 4) return [];
  const z0 = trail[0];
  const z1 = trail[Math.floor(trail.length / 3)];
  const z2 = trail[Math.floor((2 * trail.length) / 3)];
  return trail.map((pt) => {
    const w = mobiusTransform(pt, z0, z1, z2);
    return {
      u: w[0],
      v: w[1],
      theta: Math.atan2(w[1], w[0]),
      radius: Math.sqrt(w[0] * w[0] + w[1] * w[1]),
    };
  });
}

/** Circularity: 1 = perfect circle, 0 = collapsed. */
export function flowCircularity(samples: OrbifoldSample[]): number {
  const finite = samples
    .map((s) => s.radius)
    .filter((r) => isFinite(r) && r < 1e5);
  if (finite.length < 4) return 0;
  const mean = finite.reduce((a, b) => a + b, 0) / finite.length;
  const variance =
    finite.reduce((a, r) => a + (r - mean) ** 2, 0) / finite.length;
  const cv = Math.sqrt(variance) / Math.max(mean, 1e-9);
  return 1 / (1 + cv);
}

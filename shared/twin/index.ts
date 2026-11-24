/**
 * ANIMA Digital Twin — health topology engine.
 *
 * Turns a pet's Longevity Score factors into a living, breathing
 * curvature field that renders as an animated hex-grid disc with
 * particle flow. Healthy factors create glowing peaks; weak factors
 * create dark wells. Particles orbit the peaks.
 */

export { gauss, curvatureAt, factorsToMasses, buildHeightMap } from "./curvature";
export type { MassPoint } from "./curvature";
export { stepParticle, spawnParticle } from "./flow";
export type { Particle } from "./flow";
export { mobiusTransform, orbifoldFlow, flowCircularity } from "./orbifold";
export type { OrbifoldSample } from "./orbifold";
export { buildHexGrid, lodRings } from "./hex";
export type { HexCell } from "./hex";

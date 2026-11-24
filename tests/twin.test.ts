import { describe, test, expect } from "vitest";
import {
  factorsToMasses,
  curvatureAt,
  buildHeightMap,
  buildHexGrid,
  lodRings,
  spawnParticle,
  stepParticle,
  orbifoldFlow,
  flowCircularity,
} from "../shared/twin";
import type { ScoreFactors } from "../shared/types";

const healthy: ScoreFactors = {
  nutritionQuality: 0.9,
  bodyCondition: 0.85,
  genetic: 0.7,
  ageHealth: 0.8,
  preventiveCare: 0.75,
  activityLevel: 0.8,
};

const poor: ScoreFactors = {
  nutritionQuality: 0.3,
  bodyCondition: 0.35,
  genetic: 0.4,
  ageHealth: 0.5,
  preventiveCare: 0.2,
  activityLevel: 0.25,
};

describe("curvature", () => {
  test("factorsToMasses places 6 masses on a ring", () => {
    const masses = factorsToMasses(healthy);
    expect(masses).toHaveLength(6);
    for (const m of masses) {
      const r = Math.sqrt(m.x * m.x + m.y * m.y);
      expect(r).toBeCloseTo(0.55, 1);
    }
  });

  test("healthy pet has positive curvature at centre", () => {
    const masses = factorsToMasses(healthy);
    expect(curvatureAt(0, 0, masses)).toBeGreaterThan(0);
  });

  test("poor-health pet has negative curvature at centre", () => {
    const masses = factorsToMasses(poor);
    expect(curvatureAt(0, 0, masses)).toBeLessThan(0);
  });

  test("curvature decays away from masses", () => {
    const masses = factorsToMasses(healthy);
    const near = Math.abs(curvatureAt(masses[0].x, masses[0].y, masses));
    const far = Math.abs(curvatureAt(0.95, 0.95, masses));
    expect(near).toBeGreaterThan(far);
  });

  test("buildHeightMap returns correct size", () => {
    const masses = factorsToMasses(healthy);
    const map = buildHeightMap(masses, 32);
    expect(map.length).toBe(32 * 32);
  });
});

describe("hex grid", () => {
  test("lodRings scales with zoom", () => {
    expect(lodRings(0.5)).toBe(6);
    expect(lodRings(1.2)).toBe(9);
    expect(lodRings(2.0)).toBe(12);
  });

  test("buildHexGrid produces cells inside the disc", () => {
    const cells = buildHexGrid(6, () => 0);
    expect(cells.length).toBeGreaterThan(30);
    for (const cell of cells) {
      const r = Math.sqrt(cell.cx * cell.cx + cell.cy * cell.cy);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});

describe("particle flow", () => {
  test("particles stay inside the disc", () => {
    const masses = factorsToMasses(healthy);
    const p = spawnParticle(masses[0], Math.random);
    for (let i = 0; i < 200; i++) {
      stepParticle(p, masses);
    }
    const r = Math.sqrt(p.x * p.x + p.y * p.y);
    expect(r).toBeLessThanOrEqual(1);
  });

  test("particle ages correctly", () => {
    const masses = factorsToMasses(healthy);
    const p = spawnParticle(masses[0], Math.random);
    expect(p.age).toBe(0);
    stepParticle(p, masses);
    expect(p.age).toBe(1);
  });
});

describe("orbifold", () => {
  test("circular trail has high circularity", () => {
    const trail: [number, number][] = [];
    for (let i = 0; i < 72; i++) {
      const angle = (Math.PI * 2 * i) / 72;
      trail.push([Math.cos(angle) * 0.5, Math.sin(angle) * 0.5]);
    }
    const samples = orbifoldFlow(trail);
    expect(samples).toHaveLength(72);
    expect(flowCircularity(samples)).toBeGreaterThan(0.2);
  });

  test("collapsed trail has low circularity", () => {
    const trail: [number, number][] = [];
    for (let i = 0; i < 72; i++) {
      trail.push([0.1 * i / 72, 0]);
    }
    const samples = orbifoldFlow(trail);
    expect(flowCircularity(samples)).toBeLessThan(0.5);
  });
});

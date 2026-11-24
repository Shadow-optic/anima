import { describe, test } from "node:test";
import assert from "node:assert/strict";
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
    assert.equal(masses.length, 6);
    for (const m of masses) {
      const r = Math.sqrt(m.x * m.x + m.y * m.y);
      assert.ok(Math.abs(r - 0.55) < 0.05);
    }
  });

  test("healthy pet has positive curvature at centre", () => {
    const masses = factorsToMasses(healthy);
    assert.ok(curvatureAt(0, 0, masses) > 0);
  });

  test("poor-health pet has negative curvature at centre", () => {
    const masses = factorsToMasses(poor);
    assert.ok(curvatureAt(0, 0, masses) < 0);
  });

  test("curvature decays away from masses", () => {
    const masses = factorsToMasses(healthy);
    const near = Math.abs(curvatureAt(masses[0].x, masses[0].y, masses));
    const far = Math.abs(curvatureAt(0.95, 0.95, masses));
    assert.ok(near > far);
  });

  test("buildHeightMap returns correct size", () => {
    const masses = factorsToMasses(healthy);
    const map = buildHeightMap(masses, 32);
    assert.equal(map.length, 32 * 32);
  });
});

describe("hex grid", () => {
  test("lodRings scales with zoom", () => {
    assert.equal(lodRings(0.5), 6);
    assert.equal(lodRings(1.2), 9);
    assert.equal(lodRings(2.0), 12);
  });

  test("buildHexGrid produces cells inside the disc", () => {
    const cells = buildHexGrid(6, () => 0);
    assert.ok(cells.length > 30);
    for (const cell of cells) {
      const r = Math.sqrt(cell.cx * cell.cx + cell.cy * cell.cy);
      assert.ok(r <= 1);
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
    assert.ok(r <= 1);
  });

  test("particle ages correctly", () => {
    const masses = factorsToMasses(healthy);
    const p = spawnParticle(masses[0], Math.random);
    assert.equal(p.age, 0);
    stepParticle(p, masses);
    assert.equal(p.age, 1);
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
    assert.equal(samples.length, 72);
    assert.ok(flowCircularity(samples) > 0.2);
  });

  test("collapsed trail has low circularity", () => {
    const trail: [number, number][] = [];
    for (let i = 0; i < 72; i++) {
      trail.push([0.1 * i / 72, 0]);
    }
    const samples = orbifoldFlow(trail);
    assert.ok(flowCircularity(samples) < 0.5);
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { REAL_CATALOG, BRAND_FACTS } from "../shared/food/real";
import { rateFood } from "../shared/food/rating";

test("real catalog: every product is sourced, uniquely identified and rateable", () => {
  assert.ok(REAL_CATALOG.length >= 40);
  const ids = new Set(REAL_CATALOG.map((f) => f.id));
  assert.equal(ids.size, REAL_CATALOG.length);
  for (const f of REAL_CATALOG) {
    assert.ok(!f.isSample, f.id);
    assert.match(f.source!.url, /^https:\/\//, f.id);
    assert.ok(BRAND_FACTS[f.brand], `no brand facts for ${f.brand}`);
    assert.ok(f.ingredients.length > 0, f.id);
    const g = f.ga;
    assert.ok(g.proteinMinPct + g.fatMinPct + g.fiberMaxPct + g.moistureMaxPct <= 100, f.id);
    const r = rateFood(f);
    assert.ok(r.score >= 0 && r.score <= 100, f.id);
    assert.equal(r.components.reduce((s, c) => s + c.max, 0), 100, f.id);
  }
});

test("real catalog: recalls are counted only where one was found", () => {
  const pedigree = REAL_CATALOG.find((f) => f.brand === "Pedigree")!;
  const iams = REAL_CATALOG.find((f) => f.brand === "Iams")!;
  assert.equal(pedigree.recallsLast5y, 2);
  assert.equal(iams.recallsLast5y, undefined);
});

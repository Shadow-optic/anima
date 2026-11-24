import { test } from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_CATALOG, findSampleFood } from "../shared/food/catalog";
import { rateFood, gradeFor, type PetContext } from "../shared/food/rating";
import { computeLongevityScore, summariseCare, summariseDiet, FACTOR_WEIGHTS, NUTRITION_WEIGHTS } from "../shared/score/longevity";
import { ageYearsToDob, dailyCalorieTarget, estimateKcalPerKg, restingEnergyKcal, toDryMatterPct } from "../shared/nutrition/energy";
import { BREEDS, getBreed } from "../shared/constants/breeds";
import { FACTOR_EVIDENCE, FOOD_SCORE_METHOD, REFERENCES } from "../shared/score/evidence";
import { decodeShareCard, encodeShareCard } from "../shared/share/card";
import type { MealLog, Pet } from "../shared/types";

const NOW = Date.UTC(2026, 10, 23);
const food = (id: string) => findSampleFood(id)!;
const adultDog: PetContext = { species: "DOG", stage: "ADULT", bodyCondition: 5, largeBreed: true };

const lab = (over: Partial<Pet> = {}) => ({
  species: "DOG" as const, breed: "Labrador Retriever", dateOfBirth: ageYearsToDob(4, NOW), weightKg: 30,
  bodyCondition: 5, activityMinutesPerDay: null, neutered: true, primaryFoodId: null, ...over,
});

test("weights sum to 1", () => {
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum(FACTOR_WEIGHTS) - 1) < 1e-9);
  assert.ok(Math.abs(sum(NUTRITION_WEIGHTS) - 1) < 1e-9);
  assert.equal(Math.max(...Object.values(FACTOR_WEIGHTS)), FACTOR_WEIGHTS.nutritionQuality);
});

test("energy maths", () => {
  assert.equal(Math.round(restingEnergyKcal(10)), 394);
  assert.equal(dailyCalorieTarget({ species: "DOG", neutered: true, bodyCondition: 5, weightKg: 10 }, "ADULT"), 630);
  assert.equal(Math.round(toDryMatterPct(10, 75)), 40);
  assert.equal(estimateKcalPerKg({ proteinMinPct: 26, fatMinPct: 16, fiberMaxPct: 3, moistureMaxPct: 10 }), 3600);
});

test("every sample food rates within range with a full component set", () => {
  for (const f of SAMPLE_CATALOG) {
    const r = rateFood(f);
    assert.ok(r.score >= 0 && r.score <= 100, f.id);
    assert.equal(r.grade, gradeFor(r.score));
    const max = r.components.reduce((s, c) => s + c.max, 0);
    assert.equal(max, 100, f.id);
    for (const c of r.components) assert.ok(c.earned >= 0 && c.earned <= c.max + 1e-9, `${f.id}:${c.key}`);
  }
});

test("food ranking matches the label facts", () => {
  const good = rateFood(food("s-dog-chicken-rice-adult"));
  const budget = rateFood(food("s-dog-budget"));
  const grainFree = rateFood(food("s-dog-grain-free-pea"));
  assert.ok(good.grade === "A", `good=${good.score}`);
  assert.ok(budget.score < 50, `budget=${budget.score}`);
  assert.ok(grainFree.score < good.score);
  assert.ok(grainFree.flags.some((f) => /FDA/.test(f.text)));
  assert.ok(budget.flags.some((f) => /colouring/.test(f.text)));
  assert.ok(rateFood(food("s-dog-raw-topper")).flags.length >= 0);
});

test("unknown data lowers confidence and never earns full marks", () => {
  const known = rateFood(food("s-dog-chicken-rice-adult"));
  const bare = rateFood({ ...food("s-dog-chicken-rice-adult"), maker: undefined, recallsLast5y: undefined, adequacyBasis: "UNKNOWN" });
  assert.ok(bare.confidence < known.confidence);
  assert.ok(bare.score < known.score);
});

test("fit: life stage and species mismatches are unsuitable", () => {
  const puppy: PetContext = { species: "DOG", stage: "GROWTH_LATE", bodyCondition: 5, largeBreed: true };
  assert.equal(rateFood(food("s-dog-chicken-rice-adult"), puppy).fit!.suitable, false);
  assert.equal(rateFood(food("s-dog-puppy-small"), puppy).fit!.suitable, false); // calcium too high for large breed
  assert.equal(rateFood(food("s-dog-large-puppy"), puppy).fit!.suitable, true);
  assert.equal(rateFood(food("s-cat-chicken-pate"), adultDog).fit!.suitable, false);
  const heavy: PetContext = { ...adultDog, bodyCondition: 7 };
  assert.ok(rateFood(food("s-dog-weight-control"), heavy).fit!.score > rateFood(food("s-dog-weight-control"), adultDog).fit!.score);
});

test("score: bounded, breed-aware, placeholders flagged", () => {
  const base = computeLongevityScore({ pet: lab(), now: NOW });
  assert.ok(base.score > 0 && base.score < 999);
  assert.equal(base.dataCompleteness, 0.55);
  assert.equal(base.breakdown.filter((b) => b.estimated).length, 3);
  const frenchie = computeLongevityScore({ pet: lab({ breed: "French Bulldog", weightKg: 11 }), now: NOW });
  assert.ok(frenchie.factors.genetic < base.factors.genetic);
  const obese = computeLongevityScore({ pet: lab({ bodyCondition: 8, weightKg: 42 }), now: NOW });
  assert.ok(obese.score < base.score);
  assert.equal(getBreed("DOG", "No Such Breed").name, "Mixed Breed");
});

test("score: a better food raises the Score, a worse one lowers it", () => {
  const foods = new Map(SAMPLE_CATALOG.map((f) => [f.id, f]));
  const run = (primaryFoodId: string) => {
    const pet = lab({ primaryFoodId });
    return computeLongevityScore({ pet, diet: summariseDiet(pet, [], foods, NOW), now: NOW });
  };
  const good = run("s-dog-chicken-rice-adult");
  const bad = run("s-dog-budget");
  const none = computeLongevityScore({ pet: lab(), now: NOW });
  assert.ok(good.score > none.score && none.score > bad.score, `${good.score} ${none.score} ${bad.score}`);
  assert.ok(good.score - bad.score >= 50, `spread ${good.score - bad.score}`);
});

test("score: logging on-target meals lifts nutrition; treat-heavy logging lowers it", () => {
  const foods = new Map(SAMPLE_CATALOG.map((f) => [f.id, f]));
  const pet = lab({ primaryFoodId: "s-dog-chicken-rice-adult" });
  const target = summariseDiet(pet, [], foods, NOW).dailyCalorieTarget;
  const day = (i: number) => new Date(NOW - i * 86400000 - 3600000).toISOString();
  const meal = (i: number, kcal: number, type: "MEAL" | "TREAT", foodId: string): MealLog => ({
    id: `${i}${type}`, petId: "p", type, totalCalories: kcal, loggedAt: day(i),
    items: [{ foodId, name: "x", amountGrams: 100, calories: kcal }],
  });
  const onTarget = [0, 1, 2, 3, 4, 5, 6].map((i) => meal(i, target, "MEAL", "s-dog-chicken-rice-adult"));
  const treaty = onTarget.flatMap((m, i) => [meal(i, target * 0.7, "MEAL", "s-dog-chicken-rice-adult"), meal(i, target * 0.6, "TREAT", "s-dog-treat-biscuit")]);
  const a = summariseDiet(pet, onTarget, foods, NOW);
  const b = summariseDiet(pet, treaty, foods, NOW);
  assert.equal(a.daysLoggedLast7, 7);
  assert.ok(Math.abs(a.calorieRatio! - 1) < 0.01);
  assert.ok(b.treatCalorieShare! > 0.4);
  const none = computeLongevityScore({ pet, diet: summariseDiet(pet, [], foods, NOW), now: NOW });
  const sa = computeLongevityScore({ pet, diet: a, now: NOW });
  const sb = computeLongevityScore({ pet, diet: b, now: NOW });
  assert.ok(sa.score > none.score && sa.score > sb.score);
});

test("care summary feeds preventive care", () => {
  const iso = (monthsAgo: number) => new Date(NOW - monthsAgo * 30.44 * 86400000).toISOString().slice(0, 10);
  const ev = (kind: any, m: number) => ({ id: kind, petId: "p", kind, date: iso(m), createdAt: iso(m) });
  const full = summariseCare([ev("WELLNESS_EXAM", 2), ev("VACCINATION", 10), ev("DENTAL", 5), ev("PARASITE_PREVENTION", 1)], NOW);
  const stale = summariseCare([ev("WELLNESS_EXAM", 30)], NOW);
  const s1 = computeLongevityScore({ pet: lab(), care: full, now: NOW });
  const s2 = computeLongevityScore({ pet: lab(), care: stale, now: NOW });
  assert.ok(s1.factors.preventiveCare > 0.95);
  assert.ok(s2.factors.preventiveCare < 0.1);
});

test("evidence: every factor and method note cites known references", () => {
  for (const e of Object.values(FACTOR_EVIDENCE)) {
    assert.ok(e.references.length > 0);
    for (const id of e.references) assert.ok(REFERENCES[id], id);
  }
  for (const n of FOOD_SCORE_METHOD) for (const id of n.references) assert.ok(REFERENCES[id], id);
  for (const b of BREEDS) if (b.lifespanSource !== "estimate") assert.ok(REFERENCES[b.lifespanSource], b.name);
  for (const r of Object.values(REFERENCES)) assert.ok(/^https:\/\//.test(r.url));
});

test("share card round-trips and rejects tampering", () => {
  const card = { v: 1 as const, name: "Lüna 🐶", species: "DOG" as const, breed: "Beagle", score: 712, factors: [80, 100, 60, 70, 50, 90], foodGrade: "A", day: "2026-11-23" };
  assert.deepEqual(decodeShareCard(encodeShareCard(card)), card);
  assert.equal(decodeShareCard("not-base64!"), null);
  assert.equal(decodeShareCard(encodeShareCard({ ...card, score: 5000 })), null);
  assert.equal(decodeShareCard(encodeShareCard({ ...card, name: "x".repeat(200) })), null);
  assert.equal(decodeShareCard(""), null);
});

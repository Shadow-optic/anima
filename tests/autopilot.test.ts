import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAutopilot, FLOOR_OF_RER } from "../shared/nutrition/autopilot";
import { ageYearsToDob, restingEnergyKcal } from "../shared/nutrition/energy";
import { summariseDiet } from "../shared/score/longevity";
import { findSampleFood } from "../shared/food/catalog";
import type { MealLog, WeighIn } from "../shared/types";

const NOW = Date.UTC(2026, 10, 24, 12);
const day = (ago: number) => new Date(NOW - ago * 86400000).toISOString().slice(0, 10);
const w = (ago: number, kg: number): WeighIn => ({ id: `${ago}`, petId: "p", date: day(ago), weightKg: kg, createdAt: day(ago) });
const pet = (over: Record<string, unknown> = {}) => ({
  species: "DOG" as const, breed: "Labrador Retriever", dateOfBirth: ageYearsToDob(5, NOW), weightKg: 38, bodyCondition: 7,
  neutered: true, calorieFactor: 1, planReviewedAt: null, ...over,
});
const mealsAt = (kcalPerDay: number, days: number): MealLog[] =>
  Array.from({ length: days }, (_, i) => ({
    id: `m${i}`, petId: "p", type: "MEAL" as const, totalCalories: kcalPerDay,
    loggedAt: new Date(NOW - (i + 1) * 86400000).toISOString(), items: [],
  }));
const run = (p: any, weighIns: WeighIn[], meals: MealLog[] = []) => buildAutopilot({ pet: p, weighIns, meals, now: NOW });

test("waits for two weigh-ins 14 days apart", () => {
  assert.equal(run(pet(), []).review.action, "COLLECT");
  assert.equal(run(pet(), [w(7, 38.2), w(0, 38)]).review.action, "COLLECT");
});

test("weight loss: too slow cuts 10%, on track holds, too fast adds 10%", () => {
  const slow = run(pet(), [w(14, 38.1), w(0, 38)]);
  assert.equal(slow.review.action, "DECREASE");
  assert.equal(slow.review.newFactor, 0.9);
  assert.equal(slow.goal, "LOSE");
  assert.ok(slow.idealWeightKg < 38 && slow.weeksToGoal! > 5);
  assert.equal(run(pet(), [w(14, 39.2), w(0, 38)]).review.action, "HOLD"); // ~1.5%/wk
  const fast = run(pet(), [w(14, 40.5), w(0, 38)]); // ~3%/wk
  assert.equal(fast.review.action, "INCREASE");
  assert.equal(fast.review.newFactor, 1.1);
});

test("blames intake, not the plan, when logged calories are well over it", () => {
  const base = run(pet(), []);
  const r = run(pet(), [w(14, 38), w(0, 38)], mealsAt(Math.round(base.planKcal * 1.3), 14));
  assert.equal(r.review.action, "FOLLOW_PLAN");
  assert.equal(r.review.newFactor, undefined);
  assert.ok(r.intake.ratio! > 1.25);
});

test("never plans below the floor: refers to a vet instead", () => {
  const p = pet({ calorieFactor: 0.82 });
  const r = run(p, [w(14, 38), w(0, 38)]);
  assert.equal(r.review.action, "SEE_VET");
  assert.ok(r.planKcal >= Math.round(restingEnergyKcal(r.idealWeightKg) * FLOOR_OF_RER) - 2);
});

test("cats losing too fast get the liver warning", () => {
  const cat = pet({ species: "CAT", breed: "Domestic Shorthair", weightKg: 6.5, bodyCondition: 8 });
  const r = run(cat, [w(14, 7.0), w(0, 6.5)]);
  assert.equal(r.review.action, "INCREASE");
  assert.match(r.review.detail, /liver/);
});

test("ideal-weight pets: steady holds, creep cuts, unexplained loss goes to the vet", () => {
  const lean = pet({ bodyCondition: 5, weightKg: 30 });
  assert.equal(run(lean, [w(14, 30.1), w(0, 30)]).review.action, "HOLD");
  assert.equal(run(lean, [w(14, 29.2), w(0, 30)]).review.action, "DECREASE");
  const plan = run(lean, []).planKcal;
  assert.equal(run(lean, [w(14, 31), w(0, 30)], mealsAt(plan, 14)).review.action, "SEE_VET");
});

test("growing animals are never restricted", () => {
  const pup = pet({ dateOfBirth: ageYearsToDob(0.5, NOW), weightKg: 18, bodyCondition: 5, calorieFactor: 0.7 });
  const r = run(pup, [w(14, 15), w(0, 18)]);
  assert.equal(r.goal, "GROW");
  assert.equal(r.review.action, "HOLD");
  assert.equal(r.factor, 1);
});

test("reviews start again from the last applied review", () => {
  const p = pet({ calorieFactor: 0.9, planReviewedAt: new Date(NOW - 5 * 86400000).toISOString() });
  assert.equal(run(p, [w(30, 39), w(14, 38.9), w(0, 38)]).review.action, "COLLECT");
});

test("portions and the Score's calorie target follow the learned factor", () => {
  const food = findSampleFood("s-dog-weight-control")!;
  const a = buildAutopilot({ pet: pet(), weighIns: [], meals: [], food, now: NOW });
  const b = buildAutopilot({ pet: pet({ calorieFactor: 0.9 }), weighIns: [], meals: [], food, now: NOW });
  assert.ok(b.gramsPerDay! < a.gramsPerDay! && b.packageDays! > a.packageDays!);
  assert.equal(a.treatBudgetKcal, Math.round(a.planKcal * 0.1));
  const foods = new Map([[food.id, food]]);
  const base = { ...pet(), activityMinutesPerDay: null, primaryFoodId: food.id };
  assert.equal(summariseDiet({ ...base, calorieFactor: 0.9 }, [], foods, NOW).dailyCalorieTarget, b.planKcal);
});

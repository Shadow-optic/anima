/**
 * Portion Autopilot.
 *
 * Calorie formulas describe the average animal; individual needs differ a lot
 * from the prediction. So instead of trusting the formula, Autopilot closes
 * the loop the way a veterinary weight clinic does: feed a measured portion,
 * weigh every two weeks, compare the change with a safe target rate, and
 * adjust the portion in small steps. Each adjustment is stored as the pet's
 * personal calorie factor, so the plan converges on this animal's real needs.
 *
 * It only ever proposes; the owner applies. It refuses to push calories below
 * a floor, and it tells the owner to see a vet when weight moves in a way that
 * feeding does not explain.
 *
 * Thresholds and their sources are in `shared/score/evidence.ts`.
 * Pure and dependency-free.
 */

import { getBreed } from "../constants/breeds";
import { dailyPortionGrams } from "../food/rating";
import type { FoodProduct, MealLog, Pet, Species, WeighIn } from "../types";
import { dailyCalorieTarget, idealWeightKg, lifeStage, restingEnergyKcal } from "./energy";

export type Goal = "LOSE" | "MAINTAIN" | "GAIN" | "GROW";

export type ReviewAction =
  | "COLLECT" // not enough data yet
  | "HOLD" // on track, change nothing
  | "DECREASE"
  | "INCREASE"
  | "FOLLOW_PLAN" // weight is off because intake is off, not because the plan is wrong
  | "SEE_VET";

/** Safe weekly rates, as a percentage of body weight. */
export const RATES: Record<Species, { loseMin: number; loseMax: number; gainMin: number; gainMax: number; drift: number }> = {
  DOG: { loseMin: 1, loseMax: 2, gainMin: 0.5, gainMax: 2, drift: 0.5 },
  CAT: { loseMin: 0.5, loseMax: 2, gainMin: 0.5, gainMax: 2, drift: 0.5 },
};

/** Days between weigh-ins before a review is meaningful. */
export const REVIEW_DAYS = 14;
/** Size of one adjustment. */
export const STEP = 0.1;
/** The personal factor never leaves this range without a vet. */
export const FACTOR_MIN = 0.7;
export const FACTOR_MAX = 1.4;
/** Never plan fewer calories than this share of resting energy at ideal weight. */
export const FLOOR_OF_RER = 0.8;

const DAY_MS = 86400000;

export interface AutopilotInput {
  pet: Pick<
    Pet,
    "species" | "breed" | "dateOfBirth" | "weightKg" | "bodyCondition" | "neutered" | "calorieFactor" | "planReviewedAt"
  >;
  weighIns: WeighIn[];
  meals: MealLog[];
  food?: FoodProduct;
  now?: number;
}

export interface AutopilotPlan {
  goal: Goal;
  idealWeightKg: number;
  /** What the textbook formula says. */
  formulaKcal: number;
  /** The formula scaled by this pet's learned factor: the plan in force. */
  planKcal: number;
  factor: number;
  floorKcal: number;
  treatBudgetKcal: number;
  /** Grams of the main food per day and per meal (two meals), leaving the treat budget free. */
  gramsPerDay: number | null;
  gramsPerMeal: number | null;
  /** Days one package lasts at this portion. */
  packageDays: number | null;
  /** Observed change since the last review. Positive = gaining. */
  trend: { pctPerWeek: number; days: number; fromKg: number; toKg: number } | null;
  /** Logged intake over the review window. */
  intake: { daysLogged: number; days: number; ratio: number | null };
  review: {
    action: ReviewAction;
    headline: string;
    detail: string;
    /** Factor to store if the owner applies the recommendation. */
    newFactor?: number;
    newPlanKcal?: number;
  };
  nextWeighIn: string; // YYYY-MM-DD
  /** Weeks to ideal weight at the middle of the safe range, for LOSE and GAIN. */
  weeksToGoal: number | null;
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function goalFor(bodyCondition: number, growing: boolean, species: Species): Goal {
  if (growing) return "GROW";
  if (bodyCondition >= (species === "CAT" ? 7 : 6)) return "LOSE";
  if (bodyCondition <= 3) return "GAIN";
  return "MAINTAIN";
}

export function buildAutopilot(input: AutopilotInput): AutopilotPlan {
  const { pet, food } = input;
  const now = input.now ?? Date.now();
  const breed = getBreed(pet.species, pet.breed);
  const adultWeight = breed.idealWeightKg ? breed.idealWeightKg[1] : pet.weightKg;
  const stage = lifeStage(pet.species, pet.dateOfBirth, breed.lifespanYears, adultWeight, now);
  const growing = stage === "GROWTH_EARLY" || stage === "GROWTH_LATE";
  const goal = goalFor(pet.bodyCondition, growing, pet.species);
  const rates = RATES[pet.species];

  const ideal = growing ? pet.weightKg : idealWeightKg(pet.weightKg, pet.bodyCondition);
  const formulaKcal = dailyCalorieTarget(pet, stage);
  const factor = growing ? 1 : clamp(pet.calorieFactor || 1, FACTOR_MIN, FACTOR_MAX);
  const floorKcal = Math.round(restingEnergyKcal(ideal) * FLOOR_OF_RER);
  const planKcal = Math.max(Math.round(formulaKcal * factor), growing ? 0 : floorKcal);

  const gramsPerDay = food && food.category === "COMPLETE" ? dailyPortionGrams(food, planKcal - Math.round(planKcal * 0.1)) : null;
  const packageDays =
    gramsPerDay && food?.packageSizeKg ? Math.floor((food.packageSizeKg * 1000) / gramsPerDay) : null;

  // ── Review window: from the last applied review (or the first weigh-in) to the latest weigh-in ──
  const sorted = [...input.weighIns]
    .filter((w) => Number.isFinite(w.weightKg) && w.weightKg > 0 && new Date(w.date).getTime() <= now + DAY_MS)
    .sort((a, b) => a.date.localeCompare(b.date));
  const anchor = pet.planReviewedAt ? pet.planReviewedAt.slice(0, 10) : sorted[0]?.date;
  const latest = sorted[sorted.length - 1];
  const start = anchor ? sorted.find((w) => w.date >= anchor) ?? latest : undefined;

  let trend: AutopilotPlan["trend"] = null;
  if (start && latest && latest !== start) {
    const days = Math.round((new Date(latest.date).getTime() - new Date(start.date).getTime()) / DAY_MS);
    if (days > 0) {
      const pct = ((latest.weightKg - start.weightKg) / start.weightKg) * 100;
      trend = { pctPerWeek: round2(pct / (days / 7)), days, fromKg: start.weightKg, toKg: latest.weightKg };
    }
  }

  // ── Intake over the same window ──
  const windowStart = start ? new Date(start.date).getTime() : now - REVIEW_DAYS * DAY_MS;
  const windowEnd = latest ? new Date(latest.date).getTime() + DAY_MS : now;
  const windowDays = Math.max(1, Math.round((windowEnd - windowStart) / DAY_MS));
  const byDay = new Map<string, number>();
  for (const m of input.meals) {
    const t = new Date(m.loggedAt).getTime();
    if (t < windowStart || t > windowEnd) continue;
    const d = m.loggedAt.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + m.totalCalories);
  }
  const daysLogged = byDay.size;
  const avgLogged = daysLogged ? [...byDay.values()].reduce((a, b) => a + b, 0) / daysLogged : 0;
  // Only trust the intake record when at least half the days were logged.
  const ratio = daysLogged >= Math.max(4, windowDays * 0.5) && planKcal > 0 ? round2(avgLogged / planKcal) : null;
  const intake = { daysLogged, days: windowDays, ratio };

  const lastDate = latest ? new Date(latest.date).getTime() : now;
  const nextWeighIn = iso(Math.max(lastDate + REVIEW_DAYS * DAY_MS, now));

  let weeksToGoal: number | null = null;
  if (goal === "LOSE" || goal === "GAIN") {
    const mid = goal === "LOSE" ? (rates.loseMin + rates.loseMax) / 2 : (rates.gainMin + rates.gainMax) / 2;
    const gapPct = (Math.abs(pet.weightKg - ideal) / pet.weightKg) * 100;
    weeksToGoal = Math.max(1, Math.ceil(gapPct / mid));
  }

  const review = decide();
  return {
    goal,
    idealWeightKg: Math.round(ideal * 10) / 10,
    formulaKcal,
    planKcal,
    factor: round2(factor),
    floorKcal,
    treatBudgetKcal: Math.round(planKcal * 0.1),
    gramsPerDay,
    gramsPerMeal: gramsPerDay ? Math.round(gramsPerDay / 2) : null,
    packageDays,
    trend,
    intake,
    review,
    nextWeighIn,
    weeksToGoal,
  };

  function propose(direction: -1 | 1, headline: string, detail: string): AutopilotPlan["review"] {
    const next = round2(clamp(factor * (1 + direction * STEP), FACTOR_MIN, FACTOR_MAX));
    const nextKcal = Math.round(formulaKcal * next);
    if (direction < 0 && (nextKcal < floorKcal || next === factor)) {
      return {
        action: "SEE_VET",
        headline: "Time to involve your vet",
        detail: `The plan is already at its safe minimum (${floorKcal} kcal a day) and weight is not responding. Cutting further without a vet risks under-feeding nutrients. A vet can check for a medical cause and prescribe a therapeutic weight-loss diet.`,
      };
    }
    if (direction > 0 && next === factor) {
      return {
        action: "SEE_VET",
        headline: "Time to involve your vet",
        detail: "The plan is already well above the usual estimate and weight is still falling. That needs a vet's eye, not more food.",
      };
    }
    return { action: direction < 0 ? "DECREASE" : "INCREASE", headline, detail, newFactor: next, newPlanKcal: nextKcal };
  }

  function decide(): AutopilotPlan["review"] {
    if (goal === "GROW") {
      return {
        action: "HOLD",
        headline: "Growing: portions follow weight",
        detail: "For puppies and kittens the target is recalculated from each new weight, so weigh every two weeks. Autopilot does not restrict a growing animal.",
      };
    }
    if (!trend || trend.days < REVIEW_DAYS) {
      const have = trend ? `${trend.days} days of weight history so far. ` : sorted.length ? "One weigh-in so far. " : "No weigh-ins yet. ";
      return {
        action: "COLLECT",
        headline: "Feed the plan, then weigh in",
        detail: `${have}Autopilot reviews the plan once two weigh-ins are at least ${REVIEW_DAYS} days apart. Use the same scale at the same time of day.`,
      };
    }

    const rate = trend.pctPerWeek; // + gaining, − losing
    const loss = -rate;
    const eating = ratio == null ? "" : ` Logged intake averaged ${Math.round(ratio * 100)}% of the plan.`;
    const moved = `${trend.fromKg} kg → ${trend.toKg} kg over ${trend.days} days (${rate > 0 ? "+" : ""}${rate.toFixed(1)}% a week).`;
    const over = ratio != null && ratio > 1.15;
    const under = ratio != null && ratio < 0.85;

    if (goal === "LOSE") {
      if (loss > rates.loseMax) {
        if (under) {
          return { action: "FOLLOW_PLAN", headline: "Losing too fast: feed the full plan", detail: `${moved}${eating} Bring portions up to the plan before changing it.` };
        }
        const warn = pet.species === "CAT" ? " Rapid weight loss in cats can cause serious liver disease, so do not let this continue." : "";
        return propose(1, "Losing too fast: add 10%", `${moved} The safe range is ${rates.loseMin}–${rates.loseMax}% a week.${warn}${eating}`);
      }
      if (loss >= rates.loseMin) {
        return { action: "HOLD", headline: "On track: keep the plan", detail: `${moved} That is inside the safe range of ${rates.loseMin}–${rates.loseMax}% a week.${eating}` };
      }
      if (over) {
        return { action: "FOLLOW_PLAN", headline: "The plan is fine: intake is over it", detail: `${moved}${eating} Measure portions with a scale and count treats before cutting the plan.` };
      }
      return propose(-1, "Not losing fast enough: cut 10%", `${moved} The target is ${rates.loseMin}–${rates.loseMax}% a week, so this pet needs less than the estimate.${eating}`);
    }

    if (goal === "GAIN") {
      if (rate > rates.gainMax) return propose(-1, "Gaining too fast: cut 10%", `${moved} Aim for ${rates.gainMin}–${rates.gainMax}% a week.${eating}`);
      if (rate >= rates.gainMin) return { action: "HOLD", headline: "On track: keep the plan", detail: `${moved}${eating}` };
      if (under) return { action: "FOLLOW_PLAN", headline: "Feed the full plan first", detail: `${moved}${eating} If appetite is the problem, see your vet.` };
      return propose(1, "Not gaining: add 10%", `${moved} An underweight pet that does not gain on a full portion should also see a vet.${eating}`);
    }

    // MAINTAIN
    if (Math.abs(rate) <= rates.drift) {
      return { action: "HOLD", headline: "Weight is steady: keep the plan", detail: `${moved}${eating}` };
    }
    if (rate > 0) {
      if (over) return { action: "FOLLOW_PLAN", headline: "Creeping up: intake is over the plan", detail: `${moved}${eating} Measure portions and count treats before changing the plan.` };
      return propose(-1, "Creeping up: cut 10%", `${moved} This pet holds weight on less than the estimate.${eating}`);
    }
    if (under) return { action: "FOLLOW_PLAN", headline: "Drifting down: feed the full plan", detail: `${moved}${eating}` };
    if (loss > 1 && ratio != null) {
      return {
        action: "SEE_VET",
        headline: "Unplanned weight loss: see your vet",
        detail: `${moved}${eating} Losing weight while eating the full portion is a reason for a check-up, not just more food.`,
      };
    }
    return propose(1, "Drifting down: add 10%", `${moved} This pet needs more than the estimate. If the loss continues, see your vet.${eating}`);
  }
}

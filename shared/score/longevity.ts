/**
 * ANIMA Longevity Score, engine v2.
 *
 * A 0–999 index built from six factors. It is a wellness index: it summarises
 * how a pet's modifiable and non-modifiable circumstances compare with what
 * the veterinary literature associates with longer, healthier lives. It does
 * not predict how long any individual animal will live.
 *
 * Pure and dependency-free: the same function runs in the browser for the
 * instant onboarding reveal, in tests, and on a server.
 *
 * The reasoning and citations for every factor are in `./evidence.ts`.
 */

import { getBreed, SPECIES_LIFESPAN } from "../constants/breeds";
import { ageYears, dailyCalorieTarget, lifeStage, type LifeStage } from "../nutrition/energy";
import { rateFood, type PetContext } from "../food/rating";
import { isLargeBreed } from "../constants/breeds";
import {
  getScoreLabel,
  type CareEvent,
  type CareKind,
  type FactorKey,
  type FoodProduct,
  type LongevityScore,
  type MealLog,
  type Pet,
  type ScoreBreakdown,
  type ScoreFactors,
} from "../types";

export const ALGORITHM_VERSION = "anima-v2.0";

export const FACTOR_WEIGHTS: Record<FactorKey, number> = {
  nutritionQuality: 0.25,
  bodyCondition: 0.2,
  genetic: 0.2,
  ageHealth: 0.15,
  preventiveCare: 0.1,
  activityLevel: 0.1,
};

export const FACTOR_LABELS: Record<FactorKey, string> = {
  nutritionQuality: "Nutrition",
  bodyCondition: "Body Condition",
  genetic: "Breed Baseline",
  ageHealth: "Life Stage",
  preventiveCare: "Preventive Care",
  activityLevel: "Activity",
};

/** How the nutrition factor is split. Food quality is the largest single input to the Score. */
export const NUTRITION_WEIGHTS = { foodQuality: 0.55, calorieFit: 0.2, consistency: 0.15, treatShare: 0.1 } as const;

export type ScorePet = Pick<
  Pet,
  "species" | "breed" | "dateOfBirth" | "weightKg" | "bodyCondition" | "activityMinutesPerDay" | "neutered"
> & { calorieFactor?: number };

export interface DietSummary {
  /** 0–100 Food Score (fit for this pet) of what the pet eats, weighted by calories. null = unknown. */
  foodScore: number | null;
  foodScoreSource: "logged" | "primary" | "none";
  /** Average logged kcal per logged day ÷ daily target. null until 3 days are logged. */
  calorieRatio: number | null;
  /** Share of logged calories that came from treats, 0–1. null until 3 days are logged. */
  treatCalorieShare: number | null;
  daysLoggedLast7: number;
  dailyCalorieTarget: number;
}

export interface CareSummary {
  monthsSince: Record<CareKind, number | null>;
  anyRecorded: boolean;
}

export const EMPTY_DIET: DietSummary = {
  foodScore: null,
  foodScoreSource: "none",
  calorieRatio: null,
  treatCalorieShare: null,
  daysLoggedLast7: 0,
  dailyCalorieTarget: 0,
};

export const EMPTY_CARE: CareSummary = {
  monthsSince: { WELLNESS_EXAM: null, VACCINATION: null, DENTAL: null, PARASITE_PREVENTION: null },
  anyRecorded: false,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v));
}

function ramp(v: number, from: number, to: number): number {
  return clamp((v - from) / (to - from));
}

// ─────────────────────────────────────────────
// Summaries: turn raw logs into engine inputs
// ─────────────────────────────────────────────

export function petContext(pet: ScorePet, now: number = Date.now()): PetContext & { stage: LifeStage } {
  const breed = getBreed(pet.species, pet.breed);
  const adultWeight = breed.idealWeightKg ? breed.idealWeightKg[1] : pet.weightKg;
  return {
    species: pet.species,
    stage: lifeStage(pet.species, pet.dateOfBirth, breed.lifespanYears, adultWeight, now),
    bodyCondition: pet.bodyCondition,
    largeBreed: isLargeBreed(pet.species, pet.breed, pet.weightKg),
  };
}

/** Food Score to use in the Longevity Score: the fit score when the food suits the pet. */
function scoreForPet(food: FoodProduct, ctx: PetContext): number {
  const rating = rateFood(food, ctx);
  return rating.fit ? rating.fit.score : rating.score;
}

export function summariseDiet(
  pet: ScorePet & { primaryFoodId?: string | null },
  meals: MealLog[],
  foodsById: Map<string, FoodProduct>,
  now: number = Date.now()
): DietSummary {
  const ctx = petContext(pet, now);
  // The textbook target, scaled by what Portion Autopilot has learned about this pet.
  const target = Math.round(dailyCalorieTarget(pet, ctx.stage) * (pet.calorieFactor ?? 1));
  const recent = meals.filter((m) => {
    const t = new Date(m.loggedAt).getTime();
    return t <= now && now - t <= 7 * DAY_MS;
  });

  const days = new Set(recent.map((m) => m.loggedAt.slice(0, 10)));
  let totalKcal = 0;
  let treatKcal = 0;
  let ratedKcal = 0;
  let ratedSum = 0;
  for (const meal of recent) {
    for (const item of meal.items) {
      totalKcal += item.calories;
      const food = item.foodId ? foodsById.get(item.foodId) : undefined;
      const isTreat = meal.type === "TREAT" || (food != null && food.category !== "COMPLETE");
      if (isTreat) treatKcal += item.calories;
      // Only main-diet foods define diet quality; treats are handled by the treat share.
      if (food && food.category === "COMPLETE" && item.calories > 0) {
        ratedKcal += item.calories;
        ratedSum += scoreForPet(food, ctx) * item.calories;
      }
    }
  }

  let foodScore: number | null = null;
  let source: DietSummary["foodScoreSource"] = "none";
  if (ratedKcal > 0) {
    foodScore = Math.round(ratedSum / ratedKcal);
    source = "logged";
  } else if (pet.primaryFoodId && foodsById.has(pet.primaryFoodId)) {
    foodScore = scoreForPet(foodsById.get(pet.primaryFoodId)!, ctx);
    source = "primary";
  }

  const enough = days.size >= 3;
  return {
    foodScore,
    foodScoreSource: source,
    calorieRatio: enough && target > 0 ? totalKcal / days.size / target : null,
    treatCalorieShare: enough && totalKcal > 0 ? treatKcal / totalKcal : null,
    daysLoggedLast7: Math.min(7, days.size),
    dailyCalorieTarget: target,
  };
}

export function summariseCare(events: CareEvent[], now: number = Date.now()): CareSummary {
  const monthsSince: CareSummary["monthsSince"] = { ...EMPTY_CARE.monthsSince };
  for (const e of events) {
    const t = new Date(e.date).getTime();
    if (Number.isNaN(t) || t > now + DAY_MS) continue;
    const months = Math.max(0, (now - t) / (30.44 * DAY_MS));
    const prev = monthsSince[e.kind];
    if (prev == null || months < prev) monthsSince[e.kind] = months;
  }
  return { monthsSince, anyRecorded: events.length > 0 };
}

// ─────────────────────────────────────────────
// Factors
// ─────────────────────────────────────────────

function bcsScore(bcs: number, species: "DOG" | "CAT"): number {
  // 4–5 is ideal on the 9-point scale. Overweight is penalised slightly faster
  // than underweight at the same distance, matching the survival data.
  const table: Record<number, number> = { 1: 0.2, 2: 0.45, 3: 0.8, 4: 1, 5: 1, 6: 0.72, 7: 0.48, 8: 0.25, 9: 0.1 };
  const rounded = Math.round(clamp(bcs, 1, 9));
  // In cats the longest survival was seen at BCS 6 (Teng 2018), so 6 is barely penalised.
  if (species === "CAT" && rounded === 6) return 0.92;
  return table[rounded] ?? 0.5;
}

export interface ScoreInput {
  pet: ScorePet;
  diet?: DietSummary;
  care?: CareSummary;
  now?: number;
}

export function computeLongevityScore(input: ScoreInput): LongevityScore {
  const { pet } = input;
  const now = input.now ?? Date.now();
  const diet = input.diet ?? EMPTY_DIET;
  const care = input.care ?? EMPTY_CARE;
  const breed = getBreed(pet.species, pet.breed);
  const species = SPECIES_LIFESPAN[pet.species];
  const age = ageYears(pet.dateOfBirth, now);
  const stage = petContext(pet, now).stage;
  const growing = stage === "GROWTH_EARLY" || stage === "GROWTH_LATE";

  const estimated: Record<FactorKey, boolean> = {
    genetic: false,
    bodyCondition: false,
    nutritionQuality: false,
    ageHealth: false,
    preventiveCare: false,
    activityLevel: false,
  };

  // Breed baseline: where the breed's published life expectancy sits in the species' range.
  const genetic = 0.25 + 0.75 * ramp(breed.lifespanYears, species.low, species.high);

  // Body condition: BCS is the primary measure; breed weight range is a coarse cross-check for adults.
  const bcs = bcsScore(pet.bodyCondition, pet.species);
  let bodyCondition = bcs;
  if (!growing && breed.idealWeightKg) {
    const [lo, hi] = breed.idealWeightKg;
    const w = pet.weightKg;
    const weight = w < lo ? 1 - ramp(lo - w, 0, lo * 0.4) : w > hi ? 1 - ramp(w - hi, 0, hi * 0.4) : 1;
    bodyCondition = bcs * 0.8 + weight * 0.2;
  }

  // Nutrition: food quality first, then how it is fed.
  const quality = diet.foodScore != null ? diet.foodScore / 100 : 0.5;
  let calorieFit = 0.5;
  if (diet.calorieRatio != null) {
    const r = diet.calorieRatio;
    calorieFit = r < 0.9 ? ramp(r, 0.5, 0.9) : r > 1.1 ? 1 - ramp(r, 1.1, 1.6) : 1;
  }
  const treatShare = diet.treatCalorieShare != null ? 1 - ramp(diet.treatCalorieShare, 0.1, 0.3) : 0.5;
  const consistency = diet.daysLoggedLast7 / 7;
  const nutritionQuality =
    quality * NUTRITION_WEIGHTS.foodQuality +
    calorieFit * NUTRITION_WEIGHTS.calorieFit +
    consistency * NUTRITION_WEIGHTS.consistency +
    treatShare * NUTRITION_WEIGHTS.treatShare;
  estimated.nutritionQuality = diet.foodScore == null;

  // Life stage: share of the breed's expected lifespan already lived.
  const lifeFraction = age / breed.lifespanYears;
  const ageHealth = clamp(0.95 - 0.5 * Math.min(lifeFraction, 1.2));

  // Preventive care.
  let preventiveCare = 0.5;
  if (care.anyRecorded) {
    const m = care.monthsSince;
    const within = (v: number | null, full: number, zero: number) => (v == null ? 0 : 1 - ramp(v, full, zero));
    const examWindow = stage === "SENIOR" ? 6 : 12;
    preventiveCare =
      0.45 * within(m.WELLNESS_EXAM, examWindow, examWindow + 12) +
      0.2 * within(m.VACCINATION, 36, 48) +
      0.25 * within(m.DENTAL, 12, 30) +
      0.1 * within(m.PARASITE_PREVENTION, 3, 6);
  } else {
    estimated.preventiveCare = true;
  }

  // Activity: owner-reported minutes against typical guidance for the breed type.
  let activityLevel = 0.5;
  if (pet.activityMinutesPerDay != null) {
    const target = stage === "SENIOR" ? breed.exerciseMinutes * 0.7 : breed.exerciseMinutes;
    activityLevel = 0.2 + 0.8 * ramp(pet.activityMinutesPerDay / target, 0, 0.8);
  } else {
    estimated.activityLevel = true;
  }

  const factors: ScoreFactors = {
    genetic: clamp(genetic),
    bodyCondition: clamp(bodyCondition),
    nutritionQuality: clamp(nutritionQuality),
    ageHealth,
    preventiveCare: clamp(preventiveCare),
    activityLevel: clamp(activityLevel),
  };

  let raw = 0;
  let known = 0;
  for (const key of Object.keys(FACTOR_WEIGHTS) as FactorKey[]) {
    raw += factors[key] * FACTOR_WEIGHTS[key];
    if (!estimated[key]) known += FACTOR_WEIGHTS[key];
  }
  const score = Math.round(clamp(raw) * 999);

  // ── Explanations ──
  const petBcs = pet.bodyCondition;
  const details: Record<FactorKey, string> = {
    genetic: `${breed.name === "Mixed Breed" ? "Mixed-breed" : breed.name} life expectancy is about ${breed.lifespanYears.toFixed(1)} years; the ${pet.species === "DOG" ? "dog" : "cat"} average is ${species.median.toFixed(1)}.`,
    bodyCondition:
      petBcs >= 4 && petBcs <= 5
        ? `Body condition ${petBcs}/9 is in the ideal range.`
        : petBcs > 5
          ? `Body condition ${petBcs}/9 is above ideal (4–5).`
          : `Body condition ${petBcs}/9 is below ideal (4–5).`,
    nutritionQuality:
      diet.foodScore == null
        ? "No food on record yet, so this factor is a neutral placeholder."
        : `Diet quality ${diet.foodScore}/100 from ${diet.foodScoreSource === "logged" ? "logged meals" : "the main food"}; ${diet.daysLoggedLast7}/7 days logged this week.`,
    ageHealth: `${age < 1 ? `${Math.round(age * 12)} months` : `${age.toFixed(1)} years`} old, about ${Math.round(Math.min(lifeFraction, 1.5) * 100)}% of typical breed life expectancy.`,
    preventiveCare: care.anyRecorded
      ? preventiveCare >= 0.8
        ? "Check-ups, vaccines and dental care are up to date."
        : "Some preventive care is overdue or not recorded."
      : "No care records yet, so this factor is a neutral placeholder.",
    activityLevel:
      pet.activityMinutesPerDay == null
        ? "Activity not recorded yet, so this factor is a neutral placeholder."
        : `${pet.activityMinutesPerDay} active minutes a day against roughly ${Math.round(stage === "SENIOR" ? breed.exerciseMinutes * 0.7 : breed.exerciseMinutes)} suggested.`,
  };

  const suggestions: Partial<Record<FactorKey, string>> = {
    bodyCondition:
      petBcs > 5
        ? "Work towards body condition 4–5. Feed to the calorie target and re-check monthly."
        : petBcs < 4
          ? "Slightly lean. Review portion size with your vet."
          : undefined,
    nutritionQuality:
      diet.foodScore == null
        ? "Tell us what you feed to replace the placeholder with a real rating."
        : diet.foodScore < 70
          ? "A higher-rated food is the biggest single lift available here."
          : diet.daysLoggedLast7 < 5
            ? "Log meals most days so calories and treats can be scored."
            : diet.treatCalorieShare != null && diet.treatCalorieShare > 0.1
              ? "Treats are over 10% of calories. Trim them back."
              : undefined,
    preventiveCare: care.anyRecorded
      ? preventiveCare < 0.8
        ? "Record or book whatever is overdue: check-up, vaccines, dental care, parasite prevention."
        : undefined
      : "Add the date of the last vet check-up.",
    activityLevel:
      pet.activityMinutesPerDay == null
        ? "Add a typical day's active minutes."
        : activityLevel < 0.8
          ? `Build towards about ${Math.round(breed.exerciseMinutes)} minutes a day, at a pace that suits age and health.`
          : undefined,
  };

  const routes: Partial<Record<FactorKey, string>> = {
    bodyCondition: "/(tabs)/care",
    nutritionQuality: "/(tabs)/nutrition",
    preventiveCare: "/(tabs)/care",
    activityLevel: "/(tabs)/care",
  };

  const breakdown: ScoreBreakdown[] = (Object.keys(FACTOR_WEIGHTS) as FactorKey[]).map((key) => {
    const improvable = key !== "genetic" && key !== "ageHealth";
    return {
      factor: key,
      label: FACTOR_LABELS[key],
      score: Math.round(factors[key] * 100),
      weight: FACTOR_WEIGHTS[key],
      contribution: Number((factors[key] * FACTOR_WEIGHTS[key]).toFixed(4)),
      detail: details[key],
      improvable,
      estimated: estimated[key],
      suggestion: improvable ? suggestions[key] : undefined,
      actionRoute: improvable ? routes[key] : undefined,
    };
  });

  return {
    score,
    factors,
    breakdown,
    label: getScoreLabel(score),
    dataCompleteness: Number(known.toFixed(2)),
    algorithmVersion: ALGORITHM_VERSION,
    computedAt: new Date(now).toISOString(),
  };
}

/** Points the Score would gain if this factor were at 100. Used to rank what to work on. */
export function upsidePoints(item: ScoreBreakdown): number {
  return Math.round((1 - item.score / 100) * item.weight * 999);
}

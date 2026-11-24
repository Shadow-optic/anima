/**
 * Energy requirements and life stage.
 *
 * Resting energy requirement (RER) = 70 × body weight(kg)^0.75, then a
 * maintenance multiplier for life stage and neuter status. These are the
 * standard clinical starting points (see `shared/score/evidence.ts`); real
 * needs vary by roughly ±50% between individuals, so the target is a starting
 * point to adjust against body condition.
 */

import type { GuaranteedAnalysis, Pet, Species } from "../types";

export type LifeStage = "GROWTH_EARLY" | "GROWTH_LATE" | "ADULT" | "SENIOR";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export function ageYears(dateOfBirth: string, now: number = Date.now()): number {
  const birth = new Date(dateOfBirth).getTime();
  if (Number.isNaN(birth)) return 0;
  return Math.max(0, (now - birth) / MS_PER_YEAR);
}

export function ageYearsToDob(years: number, now: number = Date.now()): string {
  return new Date(now - years * MS_PER_YEAR).toISOString();
}

/**
 * Life stage. Dogs: growth to 12 months (18 for giant breeds, adult weight
 * above 40 kg). Senior starts in the last quarter of the breed's expected
 * lifespan, which is how the AAHA life stage guidelines define it for dogs;
 * for cats, 10 years (AAHA/AAFP).
 */
export function lifeStage(
  species: Species,
  dateOfBirth: string,
  breedLifespanYears: number,
  adultWeightKg?: number,
  now: number = Date.now()
): LifeStage {
  const age = ageYears(dateOfBirth, now);
  const growthEnds = species === "DOG" && (adultWeightKg ?? 0) > 40 ? 1.5 : 1.0;
  if (age < 4 / 12) return "GROWTH_EARLY";
  if (age < growthEnds) return "GROWTH_LATE";
  const seniorFrom = species === "CAT" ? 10 : breedLifespanYears * 0.75;
  return age >= seniorFrom ? "SENIOR" : "ADULT";
}

export function restingEnergyKcal(weightKg: number): number {
  return 70 * Math.pow(Math.max(weightKg, 0.1), 0.75);
}

/** Maintenance multiplier applied to RER. */
export function energyFactor(pet: Pick<Pet, "species" | "neutered" | "bodyCondition">, stage: LifeStage): number {
  if (pet.species === "DOG") {
    if (stage === "GROWTH_EARLY") return 3.0;
    if (stage === "GROWTH_LATE") return 2.0;
    if (pet.bodyCondition >= 7) return 1.0; // weight loss
    if (pet.bodyCondition === 6) return 1.4; // obesity-prone
    return pet.neutered ? 1.6 : 1.8;
  }
  if (stage === "GROWTH_EARLY" || stage === "GROWTH_LATE") return 2.5;
  if (pet.bodyCondition >= 7) return 0.8;
  if (pet.bodyCondition === 6) return 1.0;
  return pet.neutered ? 1.2 : 1.4;
}

/**
 * Ideal weight estimated from body condition: each point above 5 on the
 * 9-point scale is taken as about 10% over ideal, each point below 4 as about
 * 10% under. A working estimate; a vet's target weight is better.
 */
export function idealWeightKg(weightKg: number, bodyCondition: number): number {
  if (bodyCondition > 5) return weightKg / (1 + (bodyCondition - 5) * 0.1);
  if (bodyCondition < 4) return weightKg / (1 - (4 - bodyCondition) * 0.1);
  return weightKg;
}

/**
 * Textbook daily calorie target. For pets above or below ideal condition the
 * target is computed at the estimated ideal weight.
 */
export function dailyCalorieTarget(
  pet: Pick<Pet, "species" | "neutered" | "bodyCondition" | "weightKg">,
  stage: LifeStage
): number {
  const growing = stage === "GROWTH_EARLY" || stage === "GROWTH_LATE";
  const basis = growing ? pet.weightKg : idealWeightKg(pet.weightKg, pet.bodyCondition);
  return Math.round(restingEnergyKcal(basis) * energyFactor(pet, stage));
}

/**
 * Metabolisable energy from the guaranteed analysis using modified Atwater
 * factors (3.5 kcal/g protein, 8.5 fat, 3.5 carbohydrate). Used only when the
 * label does not state calories.
 */
export function estimateKcalPerKg(ga: GuaranteedAnalysis): number {
  const carbs = carbohydrateAsFedPct(ga);
  return Math.round(10 * (3.5 * ga.proteinMinPct + 8.5 * ga.fatMinPct + 3.5 * carbs));
}

/** Nitrogen-free extract: what is left after protein, fat, fibre, moisture and ash. */
export function carbohydrateAsFedPct(ga: GuaranteedAnalysis): number {
  const ash = ga.ashPct ?? defaultAshPct(ga.moistureMaxPct);
  return Math.max(0, 100 - ga.proteinMinPct - ga.fatMinPct - ga.fiberMaxPct - ga.moistureMaxPct - ash);
}

/** Labels rarely print ash. Typical values: ~7% for dry food, ~2.5% for wet. */
export function defaultAshPct(moistureMaxPct: number): number {
  return moistureMaxPct > 40 ? 2.5 : 7;
}

/** Convert an as-fed percentage to dry-matter basis so wet and dry foods compare fairly. */
export function toDryMatterPct(asFedPct: number, moistureMaxPct: number): number {
  const dry = 100 - Math.min(moistureMaxPct, 95);
  return (asFedPct / dry) * 100;
}

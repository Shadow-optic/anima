/**
 * ANIMA Food Score — a 0–100 rating for a pet food, computed from its label.
 *
 * Design rules:
 *   1. Everything is derived from data a shopper can check on the bag or the
 *      maker's website. No paid placement, no hidden inputs.
 *   2. Nutrients are compared on a dry-matter basis so kibble, wet and fresh
 *      foods are judged on the same scale.
 *   3. Missing data never scores as "good". It scores as partial credit and
 *      lowers the reported confidence.
 *   4. The ingredient list carries the least weight. WSAVA is explicit that
 *      ingredient lists are a poor guide to quality, so only a few
 *      well-supported signals are used.
 *
 * Sources for every threshold are in `shared/score/evidence.ts`.
 * This is an educational estimate, not veterinary advice.
 */

import type { FoodProduct, Pet, Species } from "../types";
import {
  carbohydrateAsFedPct,
  defaultAshPct,
  estimateKcalPerKg,
  toDryMatterPct,
  type LifeStage,
} from "../nutrition/energy";

export type FoodGrade = "A" | "B" | "C" | "D" | "E";

export interface RatingComponent {
  key: "adequacy" | "nutrients" | "ingredients" | "transparency" | "safety" | "calories";
  label: string;
  earned: number;
  max: number;
  notes: string[];
}

export type FlagLevel = "good" | "info" | "caution" | "warning";

export interface RatingFlag {
  level: FlagLevel;
  text: string;
}

export interface PetFit {
  /** Food Score adjusted for this pet. 0–100. */
  score: number;
  grade: FoodGrade;
  reasons: RatingFlag[];
  /** False when the food must not be the pet's main diet (wrong species or life stage). */
  suitable: boolean;
}

export interface FoodRating {
  score: number; // 0–100
  grade: FoodGrade;
  components: RatingComponent[];
  flags: RatingFlag[];
  /** 0–1: how much of the rating rests on stated data rather than defaults. */
  confidence: number;
  dryMatter: {
    proteinPct: number;
    fatPct: number;
    fiberPct: number;
    carbsPct: number;
    calciumPct?: number;
    phosphorusPct?: number;
  };
  kcalPerKg: number;
  kcalIsEstimated: boolean;
  fit?: PetFit;
}

/** What the rating needs to know about the pet. */
export interface PetContext {
  species: Species;
  stage: LifeStage;
  bodyCondition: number;
  /** Expected adult weight above 32 kg (70 lb): the AAFCO "large size" line. */
  largeBreed: boolean;
}

// ─────────────────────────────────────────────
// AAFCO nutrient profile minimums, % dry matter
// ─────────────────────────────────────────────

interface Profile {
  proteinMin: number;
  fatMin: number;
  calciumMin: number;
  calciumMax: number;
  phosphorusMin: number;
}

const AAFCO: Record<Species, { growth: Profile; maintenance: Profile }> = {
  DOG: {
    growth: { proteinMin: 22.5, fatMin: 8.5, calciumMin: 1.2, calciumMax: 2.5, phosphorusMin: 1.0 },
    maintenance: { proteinMin: 18, fatMin: 5.5, calciumMin: 0.5, calciumMax: 2.5, phosphorusMin: 0.4 },
  },
  CAT: {
    growth: { proteinMin: 30, fatMin: 9, calciumMin: 1.0, calciumMax: 99, phosphorusMin: 0.8 },
    maintenance: { proteinMin: 26, fatMin: 9, calciumMin: 0.6, calciumMax: 99, phosphorusMin: 0.5 },
  },
};

/** Calcium ceiling for growth diets fed to large-size dogs. */
const LARGE_BREED_GROWTH_CALCIUM_MAX = 1.8;

/**
 * Protein level (dry matter) that earns full marks. Above the legal minimum:
 * the minimum prevents deficiency, it is not a target.
 */
const PROTEIN_FULL_MARKS: Record<Species, number> = { DOG: 28, CAT: 40 };

// ─────────────────────────────────────────────
// Ingredient signals
// ─────────────────────────────────────────────

const NAMED_ANIMAL =
  /\b(chicken|turkey|duck|beef|lamb|pork|venison|bison|rabbit|salmon|trout|whitefish|herring|menhaden|sardine|tuna|cod|pollock|mackerel|egg)\b/i;
const UNNAMED_ANIMAL = /\b(meat|animal|poultry)\b.*\b(by-?products?|meal|digest|fat|tallow)\b/i;
const ARTIFICIAL_COLOR = /\b(red\s*(40|3)|yellow\s*(5|6)|blue\s*(1|2)|titanium dioxide|artificial colou?rs?|caramel colou?r)\b/i;
const SYNTHETIC_PRESERVATIVE = /\b(bha|bht|ethoxyquin|tbhq|propyl gallate)\b/i;
const ADDED_SUGAR = /\b(sugar|corn syrup|sucrose|fructose|dextrose|molasses|cane syrup)\b/i;
const PULSE_OR_POTATO = /\b(peas?|pea (protein|flour|starch|fib(er|re))|lentils?|chickpeas?|garbanzo|fava|beans?|potato(es)?|sweet potato(es)?)\b/i;
const ALLIUM = /\b(onion|garlic)\b/i;
const OMEGA3_SOURCE = /\b(fish oil|salmon oil|menhaden oil|anchovy oil|krill|algae|algal|flaxseed|linseed)\b/i;
const PROPYLENE_GLYCOL = /\bpropylene glycol\b/i;

function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Linear ramp: 0 at `from`, 1 at `to`. */
function ramp(v: number, from: number, to: number): number {
  if (from === to) return v >= to ? 1 : 0;
  return clamp((v - from) / (to - from));
}

export function gradeFor(score: number): FoodGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "E";
}

export const GRADE_MEANING: Record<FoodGrade, string> = {
  A: "Excellent",
  B: "Good",
  C: "Adequate",
  D: "Below average",
  E: "Poor",
};

function isGrowth(stage: LifeStage): boolean {
  return stage === "GROWTH_EARLY" || stage === "GROWTH_LATE";
}

export function kcalPerKgOf(food: FoodProduct): { kcalPerKg: number; estimated: boolean } {
  if (food.kcalPerKg && food.kcalPerKg > 0) return { kcalPerKg: food.kcalPerKg, estimated: false };
  return { kcalPerKg: estimateKcalPerKg(food.ga), estimated: true };
}

export function caloriesForGrams(food: FoodProduct, grams: number): number {
  return Math.round((kcalPerKgOf(food).kcalPerKg * grams) / 1000);
}

function dryMatterOf(food: FoodProduct) {
  const m = food.ga.moistureMaxPct;
  return {
    proteinPct: toDryMatterPct(food.ga.proteinMinPct, m),
    fatPct: toDryMatterPct(food.ga.fatMinPct, m),
    fiberPct: toDryMatterPct(food.ga.fiberMaxPct, m),
    carbsPct: toDryMatterPct(carbohydrateAsFedPct(food.ga), m),
    calciumPct: food.ga.calciumPct != null ? toDryMatterPct(food.ga.calciumPct, m) : undefined,
    phosphorusPct: food.ga.phosphorusPct != null ? toDryMatterPct(food.ga.phosphorusPct, m) : undefined,
  };
}

// ─────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────

function scoreAdequacy(food: FoodProduct, flags: RatingFlag[]): RatingComponent {
  const max = 30;
  const notes: string[] = [];
  let earned = 0;

  if (food.adequacyLifeStage === "SUPPLEMENTAL" || food.adequacyBasis === "NONE") {
    earned = 0;
    notes.push("Label says intermittent or supplemental feeding only, or carries no adequacy statement.");
    flags.push({ level: "warning", text: "Not complete and balanced. Do not feed as the only diet." });
  } else if (food.adequacyBasis === "FEEDING_TRIAL") {
    earned = 30;
    notes.push("Complete and balanced, substantiated by AAFCO feeding trials.");
    flags.push({ level: "good", text: "Proven in AAFCO feeding trials, the stronger of the two adequacy methods." });
  } else if (food.adequacyBasis === "FORMULATED") {
    earned = 24;
    notes.push("Complete and balanced, formulated to meet AAFCO nutrient profiles (not feeding-trial tested).");
  } else {
    earned = 9;
    notes.push("Adequacy statement not provided. Check the label for an AAFCO statement.");
    flags.push({ level: "caution", text: "No adequacy statement on record. Confirm the label says complete and balanced." });
  }

  return { key: "adequacy", label: "Complete & balanced", earned, max, notes };
}

function scoreNutrients(
  food: FoodProduct,
  species: Species,
  dm: ReturnType<typeof dryMatterOf>,
  flags: RatingFlag[]
): { component: RatingComponent; known: number } {
  const max = 30;
  const notes: string[] = [];
  const growthFood = food.adequacyLifeStage === "GROWTH" || food.adequacyLifeStage === "ALL_LIFE_STAGES";
  const profile = growthFood ? AAFCO[species].growth : AAFCO[species].maintenance;

  // Protein: 12 points. Zero below the legal minimum, full marks at the target.
  let protein: number;
  if (dm.proteinPct < profile.proteinMin) {
    protein = 0;
    notes.push(`Protein ${dm.proteinPct.toFixed(0)}% of dry matter is below the AAFCO minimum of ${profile.proteinMin}%.`);
    flags.push({ level: "warning", text: "Protein is below the AAFCO minimum for this life stage." });
  } else {
    protein = 6 + 6 * ramp(dm.proteinPct, profile.proteinMin, PROTEIN_FULL_MARKS[species]);
    notes.push(`Protein ${dm.proteinPct.toFixed(0)}% of dry matter (AAFCO minimum ${profile.proteinMin}%).`);
  }

  // Fat: 5 points. Must clear the minimum; very high fat is calorie-dense.
  let fat: number;
  if (dm.fatPct < profile.fatMin) {
    fat = 0;
    notes.push(`Fat ${dm.fatPct.toFixed(0)}% of dry matter is below the AAFCO minimum of ${profile.fatMin}%.`);
  } else {
    const ceiling = species === "DOG" ? 22 : 28;
    fat = dm.fatPct > ceiling ? 5 - 2 * ramp(dm.fatPct, ceiling, ceiling + 12) : 5;
    notes.push(`Fat ${dm.fatPct.toFixed(0)}% of dry matter.`);
  }

  // Fibre: 3 points. Very high fibre displaces nutrients (weight-control diets excepted).
  const fibre = 3 * (1 - ramp(dm.fiberPct, 8, 16));

  // Minerals: 6 points when reported. Wrong calcium/phosphorus is a real risk, especially in growth.
  let minerals: number;
  let mineralsKnown = false;
  if (dm.calciumPct != null && dm.phosphorusPct != null && dm.phosphorusPct > 0) {
    mineralsKnown = true;
    const ratio = dm.calciumPct / dm.phosphorusPct;
    const caOk = dm.calciumPct >= profile.calciumMin && dm.calciumPct <= profile.calciumMax;
    const pOk = dm.phosphorusPct >= profile.phosphorusMin;
    const ratioOk = species === "DOG" ? ratio >= 1 && ratio <= 2 : ratio >= 0.9 && ratio <= 2.2;
    minerals = (caOk ? 2.5 : 0) + (pOk ? 1.5 : 0) + (ratioOk ? 2 : 0);
    notes.push(
      `Calcium ${dm.calciumPct.toFixed(1)}%, phosphorus ${dm.phosphorusPct.toFixed(1)}% of dry matter (ratio ${ratio.toFixed(1)}:1).`
    );
    if (!caOk || !ratioOk) {
      flags.push({ level: "caution", text: "Calcium or the calcium-to-phosphorus ratio is outside the AAFCO range." });
    }
  } else {
    minerals = 3;
    notes.push("Calcium and phosphorus not stated on the label, so half credit.");
  }

  // Omega-3: 2 points for a stated level or a marine/algal source.
  const hasOmegaSource = food.ingredients.some((i) => OMEGA3_SOURCE.test(i));
  const omega = food.ga.omega3Pct != null && food.ga.omega3Pct > 0 ? 2 : hasOmegaSource ? 1.5 : 0;
  if (omega > 0) notes.push("Contains a source of omega-3 fatty acids.");

  // Cats: 2 points for restrained carbohydrate. Dogs get these points for free.
  let carbs = 2;
  if (species === "CAT") {
    carbs = 2 * (1 - ramp(dm.carbsPct, 25, 45));
    notes.push(`Estimated carbohydrate ${dm.carbsPct.toFixed(0)}% of dry matter. Cats are obligate carnivores.`);
    if (dm.carbsPct > 40) flags.push({ level: "caution", text: "High estimated carbohydrate for a cat food." });
  }

  // Cats: taurine is essential. No points, but below-minimum is flagged.
  if (species === "CAT" && food.ga.taurinePct != null) {
    const taurineDm = toDryMatterPct(food.ga.taurinePct, food.ga.moistureMaxPct);
    const min = food.ga.moistureMaxPct > 40 ? 0.2 : 0.1;
    if (taurineDm < min) {
      flags.push({ level: "warning", text: "Taurine is below the AAFCO minimum for cats." });
    }
  }

  const earned = protein + fat + fibre + minerals + omega + carbs;
  return {
    component: { key: "nutrients", label: "Nutrient profile", earned: Math.round(earned * 10) / 10, max, notes },
    known: mineralsKnown ? 1 : 0.75,
  };
}

function scoreIngredients(food: FoodProduct, species: Species, flags: RatingFlag[], max: number): RatingComponent {
  const notes: string[] = [];
  const list = food.ingredients;
  if (list.length === 0) {
    return { key: "ingredients", label: "Ingredients", earned: max * 0.5, max, notes: ["No ingredient list on record, so half credit."] };
  }

  // Start from a neutral 70% and move on a handful of well-supported signals.
  let fraction = 0.7;
  const top3 = list.slice(0, 3);
  const top5 = list.slice(0, 5);
  const all = list.join(", ");

  if (top3.some((i) => NAMED_ANIMAL.test(i) && !UNNAMED_ANIMAL.test(i))) {
    fraction += 0.3;
    notes.push("A named animal protein is among the first three ingredients.");
  } else {
    fraction -= 0.15;
    notes.push("No named animal protein among the first three ingredients.");
  }
  if (list.some((i) => UNNAMED_ANIMAL.test(i))) {
    fraction -= 0.15;
    notes.push("Contains an animal ingredient with no named species.");
    flags.push({ level: "info", text: "Uses unnamed animal ingredients, so the source can change between batches." });
  }
  if (ARTIFICIAL_COLOR.test(all)) {
    fraction -= 0.15;
    notes.push("Contains added colourings, which serve the buyer rather than the pet.");
    flags.push({ level: "caution", text: "Contains added colourings." });
  }
  if (SYNTHETIC_PRESERVATIVE.test(all)) {
    fraction -= 0.1;
    notes.push("Uses synthetic preservatives (BHA, BHT, ethoxyquin or similar).");
  }
  if (ADDED_SUGAR.test(all)) {
    fraction -= 0.15;
    notes.push("Contains added sugar.");
    flags.push({ level: "caution", text: "Contains added sugar." });
  }
  if (species === "CAT" && PROPYLENE_GLYCOL.test(all)) {
    fraction -= 0.5;
    flags.push({ level: "warning", text: "Contains propylene glycol, which is not permitted in cat food." });
  }
  if (ALLIUM.test(all)) {
    fraction -= 0.2;
    notes.push("Contains onion or garlic.");
    flags.push({ level: "caution", text: "Contains onion or garlic, which can damage red blood cells in dogs and cats." });
  }
  if (species === "DOG" && food.category === "COMPLETE") {
    const pulses = top5.filter((i) => PULSE_OR_POTATO.test(i)).length;
    if (pulses >= 2 || (food.grainFree && pulses >= 1)) {
      fraction -= 0.15;
      notes.push("Peas, lentils, other pulses or potatoes are among the main ingredients.");
      flags.push({
        level: "caution",
        text: "Pulse- or potato-rich recipe. The FDA has investigated a possible link between such diets and heart disease (DCM) in dogs. No cause has been established. Worth raising with your vet.",
      });
    }
  }

  return { key: "ingredients", label: "Ingredients", earned: Math.round(clamp(fraction) * max * 10) / 10, max, notes };
}

function scoreTransparency(food: FoodProduct): { component: RatingComponent; known: number } {
  const max = 15;
  const notes: string[] = [];
  const m = food.maker ?? {};
  const questions: Array<[boolean | undefined, string, string]> = [
    [m.employsNutritionist, "Employs a qualified nutritionist", "No qualified nutritionist on staff"],
    [m.ownsManufacturing, "Makes the food in its own plants", "Manufacturing is outsourced"],
    [m.publishesFullNutrientAnalysis, "Provides a full nutrient analysis", "Does not provide a full nutrient analysis"],
    [m.conductsFeedingTrialsOrResearch, "Runs feeding trials or publishes research", "No feeding trials or published research"],
  ];
  let earned = 0;
  let answered = 0;
  for (const [answer, yes, no] of questions) {
    if (answer === true) {
      earned += max / 4;
      answered++;
      notes.push(yes + ".");
    } else if (answer === false) {
      answered++;
      notes.push(no + ".");
    } else {
      earned += (max / 4) * 0.4; // unknown: partial credit, not a pass
    }
  }
  if (answered === 0) notes.push("The maker's answers to the WSAVA questions are not on record, so partial credit.");
  return {
    component: { key: "transparency", label: "Maker transparency", earned: Math.round(earned * 10) / 10, max, notes },
    known: answered / 4,
  };
}

function scoreSafety(food: FoodProduct, flags: RatingFlag[], max: number): { component: RatingComponent; known: number } {
  const r = food.recallsLast5y;
  if (r == null) {
    return {
      component: { key: "safety", label: "Recall record", earned: max * 0.6, max, notes: ["Recall history not on record, so partial credit."] },
      known: 0,
    };
  }
  if (r === 0) {
    return { component: { key: "safety", label: "Recall record", earned: max, max, notes: ["No recalls in the last five years."] }, known: 1 };
  }
  flags.push({ level: r >= 2 ? "warning" : "caution", text: `${r} recall${r === 1 ? "" : "s"} in the last five years.` });
  return {
    component: {
      key: "safety",
      label: "Recall record",
      earned: r === 1 ? max * 0.5 : 0,
      max,
      notes: [`${r} recall${r === 1 ? "" : "s"} in the last five years.`],
    },
    known: 1,
  };
}

/** Treats only: are they small enough to fit inside the 10% treat allowance? */
function scoreTreatCalories(food: FoodProduct, kcalPerKg: number): RatingComponent {
  const max = 30;
  const notes: string[] = [];
  let earned: number;
  if (food.kcalPerTreat != null) {
    earned = max * (1 - ramp(food.kcalPerTreat, 5, 60));
    notes.push(`${food.kcalPerTreat} kcal per treat.`);
  } else {
    earned = max * (1 - ramp(kcalPerKg, 3000, 5000)) * 0.8;
    notes.push("Calories per treat not stated, so judged on calorie density with partial credit.");
  }
  notes.push("Treats should stay under 10% of daily calories.");
  return { key: "calories", label: "Calorie load", earned: Math.round(earned * 10) / 10, max, notes };
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Rate a food. Pass `pet` to also get a fit score for that animal.
 * Foods labelled for both species are rated against the pet's species, or
 * as dog food when no pet is given.
 */
export function rateFood(food: FoodProduct, pet?: PetContext): FoodRating {
  const species: Species = food.species === "BOTH" ? pet?.species ?? "DOG" : food.species;
  const flags: RatingFlag[] = [];
  const dm = dryMatterOf(food);
  const { kcalPerKg, estimated } = kcalPerKgOf(food);

  const components: RatingComponent[] = [];
  let confidence: number;
  let score: number;

  if (food.category === "COMPLETE") {
    const adequacy = scoreAdequacy(food, flags);
    const nutrients = scoreNutrients(food, species, dm, flags);
    const ingredients = scoreIngredients(food, species, flags, 15);
    const transparency = scoreTransparency(food);
    const safety = scoreSafety(food, flags, 10);
    components.push(adequacy, nutrients.component, ingredients, transparency.component, safety.component);
    score = components.reduce((s, c) => s + c.earned, 0);
    // A food that is not complete and balanced cannot grade above D as a main diet.
    if (adequacy.earned === 0) score = Math.min(score, 45);
    const adequacyKnown = food.adequacyBasis === "UNKNOWN" ? 0 : 1;
    confidence =
      0.3 * adequacyKnown +
      0.3 * nutrients.known +
      0.15 * (food.ingredients.length > 0 ? 1 : 0) +
      0.15 * transparency.known +
      0.1 * safety.known;
  } else {
    // Treats and toppers are not meant to be complete, so adequacy does not apply.
    const calories = scoreTreatCalories(food, kcalPerKg);
    const ingredients = scoreIngredients(food, species, flags, 40);
    const transparency = scoreTransparency(food);
    const safety = scoreSafety(food, flags, 15);
    components.push(ingredients, calories, transparency.component, safety.component);
    score = components.reduce((s, c) => s + c.earned, 0);
    confidence =
      0.4 * (food.ingredients.length > 0 ? 1 : 0) +
      0.3 * (food.kcalPerTreat != null ? 1 : 0.5) +
      0.15 * transparency.known +
      0.15 * safety.known;
  }

  score = Math.round(clamp(score, 0, 100));
  const rating: FoodRating = {
    score,
    grade: gradeFor(score),
    components,
    flags,
    confidence: Math.round(clamp(confidence) * 100) / 100,
    dryMatter: dm,
    kcalPerKg,
    kcalIsEstimated: estimated,
  };
  if (pet) rating.fit = fitForPet(food, rating, pet);
  return rating;
}

/** Adjust the base score for one pet and explain every adjustment. */
function fitForPet(food: FoodProduct, rating: FoodRating, pet: PetContext): PetFit {
  const reasons: RatingFlag[] = [];
  let score = rating.score;
  let suitable = true;

  if (food.species !== "BOTH" && food.species !== pet.species) {
    return {
      score: 0,
      grade: "E",
      suitable: false,
      reasons: [{ level: "warning", text: `Made for ${food.species === "DOG" ? "dogs" : "cats"}, not ${pet.species === "DOG" ? "dogs" : "cats"}.` }],
    };
  }

  if (food.category !== "COMPLETE") {
    reasons.push({ level: "info", text: "A treat or topper. Keep these under 10% of daily calories." });
    if (pet.bodyCondition >= 6 && (food.kcalPerTreat ?? 0) > 25) {
      score -= 10;
      reasons.push({ level: "caution", text: "Calorie-heavy for a pet that needs to lose weight." });
    }
    score = Math.round(clamp(score, 0, 100));
    return { score, grade: gradeFor(score), reasons, suitable };
  }

  const growing = isGrowth(pet.stage);
  const stageOf = food.adequacyLifeStage;

  // Life stage: the single most important match.
  if (growing) {
    if (stageOf === "MAINTENANCE") {
      score = Math.min(score - 30, 40);
      suitable = false;
      reasons.push({ level: "warning", text: "Adult maintenance food. Growing animals need a growth or all-life-stages diet." });
    } else if (stageOf === "GROWTH" || stageOf === "ALL_LIFE_STAGES") {
      reasons.push({ level: "good", text: "Formulated for growth." });
      if (pet.species === "DOG" && pet.largeBreed) {
        const ca = rating.dryMatter.calciumPct;
        if (food.largeBreedGrowthOk === false || (ca != null && ca > LARGE_BREED_GROWTH_CALCIUM_MAX)) {
          score = Math.min(score - 25, 45);
          suitable = false;
          reasons.push({
            level: "warning",
            text: "Not suitable for growth of large-size dogs. Excess calcium raises the risk of skeletal disease in large-breed puppies.",
          });
        } else if (food.largeBreedGrowthOk) {
          reasons.push({ level: "good", text: "Label covers growth of large-size dogs." });
        } else {
          score -= 6;
          reasons.push({ level: "caution", text: "Check the label covers growth of large-size dogs (70 lb or more as an adult)." });
        }
      }
    }
  } else if (stageOf === "GROWTH") {
    score -= 8;
    reasons.push({ level: "caution", text: "A growth formula. More calorie- and mineral-dense than an adult needs." });
  } else if (stageOf === "MAINTENANCE" || stageOf === "ALL_LIFE_STAGES") {
    reasons.push({ level: "good", text: pet.stage === "SENIOR" ? "Suitable for adult and senior feeding." : "Suitable for adult maintenance." });
  }

  // Weight management.
  const dm = rating.dryMatter;
  const dry = food.ga.moistureMaxPct <= 40;
  if (pet.bodyCondition >= 6) {
    const dense = dry ? rating.kcalPerKg > 3900 : rating.kcalPerKg > 1300;
    const lean = dry ? rating.kcalPerKg <= 3500 : rating.kcalPerKg <= 1000;
    if (dense) {
      score -= 8;
      reasons.push({ level: "caution", text: "Calorie-dense. Harder to feed a satisfying portion during weight loss." });
    } else if (lean && dm.proteinPct >= PROTEIN_FULL_MARKS[pet.species] - 2) {
      score += 5;
      reasons.push({ level: "good", text: "Lower in calories with high protein, which helps preserve muscle during weight loss." });
    }
  } else if (pet.bodyCondition <= 3) {
    const dense = dry ? rating.kcalPerKg >= 3800 : rating.kcalPerKg >= 1200;
    if (dense) {
      score += 3;
      reasons.push({ level: "good", text: "Calorie-dense, which helps an underweight pet." });
    }
  }

  // Seniors keep muscle better on higher protein, unless a vet has advised otherwise.
  if (pet.stage === "SENIOR") {
    if (dm.proteinPct >= PROTEIN_FULL_MARKS[pet.species]) {
      score += 3;
      reasons.push({ level: "good", text: "High protein helps older pets hold on to muscle." });
    }
    if (food.ga.omega3Pct != null && food.ga.omega3Pct > 0) {
      score += 2;
      reasons.push({ level: "good", text: "States an omega-3 level, useful for ageing joints." });
    }
  }

  score = Math.round(clamp(score, 0, 100));
  return { score, grade: gradeFor(score), reasons, suitable };
}

/** Grams per day of this food to meet a calorie target. */
export function dailyPortionGrams(food: FoodProduct, dailyKcal: number): number {
  const { kcalPerKg } = kcalPerKgOf(food);
  if (kcalPerKg <= 0) return 0;
  return Math.round((dailyKcal / kcalPerKg) * 1000);
}

/** Cost of feeding this food for a day, when price and pack size are known. */
export function dailyCostUsd(food: FoodProduct, dailyKcal: number): number | null {
  if (!food.priceUsd || !food.packageSizeKg) return null;
  const grams = dailyPortionGrams(food, dailyKcal);
  return Math.round(((grams / 1000) * (food.priceUsd / food.packageSizeKg)) * 100) / 100;
}

export { defaultAshPct };

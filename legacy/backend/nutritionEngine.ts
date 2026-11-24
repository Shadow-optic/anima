/**
 * ANIMA Nutrition Engine
 *
 * Generates personalized meal plans based on pet's Digital Twin state.
 * Phase 1: Caloric needs + macro targets + food matching
 * Phase 2: Precision nutrition — biomarker-driven, condition-specific protocols
 */

import {FoodType, Pet, PrismaClient, Species} from "@prisma/client";
import {NutrientProfile} from "../../shared/constants/nutrients";
import {breedRiskProfiles} from "../../shared/constants/breeds";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface NutritionTarget {
  dailyCalories: number;
  proteinPct: number;       // % of calories from protein
  fatPct: number;           // % of calories from fat
  fiberGrams: number;       // daily fiber target
  calciumMg: number;
  phosphorusMg: number;
  omega3Mg: number;
  omega6Mg: number;
  moisturePct: number;      // hydration recommendation
  restrictions: string[];   // allergens, sensitivities
  boosts: NutrientBoost[];  // condition-specific additions
}

interface NutrientBoost {
  nutrient: string;
  targetMg: number;
  reason: string;           // "Elevated hip dysplasia risk" etc.
  source: string;           // "breed_risk" | "biomarker" | "condition"
}

interface MealPlan {
  petId: string;
  dailyCalories: number;
  meals: PlannedMeal[];
  supplements: Supplement[];
  hydrationTarget: number;  // mL/day
  notes: string[];
  generatedAt: Date;
  validUntil: Date;         // Plans expire and regenerate
}

interface PlannedMeal {
  type: "BREAKFAST" | "DINNER" | "SNACK";
  foods: PlannedFood[];
  totalCalories: number;
  timing: string;           // "7:00 AM", "6:00 PM"
}

interface PlannedFood {
  foodId: string;
  name: string;
  brand: string;
  amountGrams: number;
  calories: number;
  imageUrl?: string;
  affiliateUrl?: string;
  type: FoodType;
}

interface Supplement {
  name: string;
  dose: string;
  frequency: string;
  reason: string;
  priority: "essential" | "recommended" | "optional";
}

// ─────────────────────────────────────────────
// CALORIC COMPUTATION
// ─────────────────────────────────────────────

/**
 * Compute daily caloric needs using NRC equations.
 *
 * RER = 70 × (bodyWeight_kg)^0.75
 * MER = RER × activity/life-stage multiplier
 *
 * Adjusted for: age, neuter status, body condition, activity level, breed size
 */
export function computeDailyCalories(pet: {
  species: Species;
  weightKg: number;
  bodyCondition: number;
  neutered: boolean;
  dateOfBirth: Date;
  breed: string;
}): number {
  const rer = 70 * Math.pow(pet.weightKg, 0.75);
  const ageYears = (Date.now() - pet.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  // Base multiplier by life stage & neuter status
  let multiplier: number;

  if (pet.species === "DOG") {
    if (ageYears < 0.33) multiplier = 3.0;        // Young puppy
    else if (ageYears < 1) multiplier = 2.0;       // Older puppy
    else if (pet.neutered) multiplier = 1.6;        // Neutered adult
    else multiplier = 1.8;                          // Intact adult
  } else {
    if (ageYears < 1) multiplier = 2.5;            // Kitten
    else if (pet.neutered) multiplier = 1.2;        // Neutered adult cat
    else multiplier = 1.4;                          // Intact adult cat
  }

  // Body condition adjustment
  // BCS 4-5 = ideal, no adjustment
  // BCS 6-7 = overweight → reduce 10-20%
  // BCS 8-9 = obese → reduce 20-40%
  // BCS 1-3 = underweight → increase 10-25%
  if (pet.bodyCondition >= 8) multiplier *= 0.7;
  else if (pet.bodyCondition >= 6) multiplier *= 0.85;
  else if (pet.bodyCondition <= 2) multiplier *= 1.25;
  else if (pet.bodyCondition <= 3) multiplier *= 1.10;

  // Senior adjustment (>7 years dogs, >10 years cats)
  const seniorAge = pet.species === "DOG" ? 7 : 10;
  if (ageYears > seniorAge) multiplier *= 0.9;

  return Math.round(rer * multiplier);
}

// ─────────────────────────────────────────────
// NUTRITION TARGET GENERATION
// ─────────────────────────────────────────────

/**
 * Generate complete nutrition targets based on pet profile + Twin state.
 * In Phase 2, biomarker data drives specific nutrient boosts.
 */
export async function generateNutritionTargets(petId: string): Promise<NutritionTarget> {
  const pet = await prisma.pet.findUniqueOrThrow({
    where: { id: petId },
    include: {
      twin: true,
      biomarkerSets: {
        orderBy: { recordedAt: "desc" },
        take: 1,
        include: { readings: true },
      },
      vetRecords: {
        where: { type: "DIAGNOSIS" },
      },
    },
  });

  const dailyCalories = computeDailyCalories(pet);
  const ageYears = (Date.now() - pet.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const breed = breedRiskProfiles[`${pet.species}:${pet.breed.toLowerCase()}`];

  // Base macros by species & life stage
  const isGrowing = ageYears < 1;
  const isSenior = pet.species === "DOG" ? ageYears > 7 : ageYears > 10;

  let proteinPct: number, fatPct: number, fiberGrams: number;

  if (pet.species === "DOG") {
    proteinPct = isGrowing ? 28 : isSenior ? 30 : 25;  // Higher protein for seniors (muscle maintenance)
    fatPct = isGrowing ? 17 : isSenior ? 12 : 14;
    fiberGrams = pet.weightKg * 0.5;
  } else {
    proteinPct = isGrowing ? 35 : 30;                   // Cats are obligate carnivores
    fatPct = isGrowing ? 20 : 15;
    fiberGrams = pet.weightKg * 0.3;
  }

  // Condition-specific boosts
  const boosts: NutrientBoost[] = [];
  const restrictions: string[] = [];

  // Breed-specific risk mitigation
  if (breed) {
    for (const risk of breed.geneticRisks) {
      const boost = getRiskMitigationBoost(risk, pet.weightKg);
      if (boost) boosts.push(boost);
    }
  }

  // Biomarker-driven adjustments (Phase 2)
  if (pet.biomarkerSets.length > 0) {
    const latestReadings = pet.biomarkerSets[0].readings;

    for (const reading of latestReadings) {
      if (reading.status === "HIGH" || reading.status === "LOW") {
        const bioBoost = getBiomarkerBoost(reading, pet.species, pet.weightKg);
        if (bioBoost) boosts.push(bioBoost);
      }
    }
  }

  // Diagnosed condition adjustments
  for (const record of pet.vetRecords) {
    const conditionBoosts = getConditionBoosts(record.title, pet.species, pet.weightKg);
    boosts.push(...conditionBoosts);
  }

  // Allergy restrictions from vet records
  const allergies = pet.vetRecords
    .filter((r) => r.type === "ALLERGY")
    .map((r) => r.title.toLowerCase());
  restrictions.push(...allergies);

  return {
    dailyCalories,
    proteinPct,
    fatPct,
    fiberGrams,
    calciumMg: pet.weightKg * (isGrowing ? 320 : 200),
    phosphorusMg: pet.weightKg * (isGrowing ? 240 : 150),
    omega3Mg: pet.weightKg * 50,
    omega6Mg: pet.weightKg * 100,
    moisturePct: pet.species === "CAT" ? 60 : 40,   // Cats need more moisture
    restrictions,
    boosts,
  };
}

// ─────────────────────────────────────────────
// MEAL PLAN GENERATION
// ─────────────────────────────────────────────

/**
 * Generate a complete daily meal plan by matching available foods
 * to the nutrition targets. Uses a constraint-satisfaction approach:
 *
 * 1. Filter food database to compatible foods (species, restrictions)
 * 2. Score each food by how well it meets targets
 * 3. Compose meals to meet total daily targets
 * 4. Add supplements for gaps that food alone can't fill
 */
export async function generateMealPlan(petId: string): Promise<MealPlan> {
  const targets = await generateNutritionTargets(petId);
  const pet = await prisma.pet.findUniqueOrThrow({ where: { id: petId } });

  // Fetch compatible foods from database
  const foods = await prisma.food.findMany({
    where: {
      species: pet.species,
      verified: true,
      NOT: {
        ingredients: {
          hasSome: targets.restrictions,
        },
      },
    },
    orderBy: { brand: "asc" },
    take: 200, // Top 200 matching foods
  });

  // Score foods by nutritional fit
  const scoredFoods = foods.map((food) => ({
    food,
    score: scoreFoodFit(food, targets),
  })).sort((a, b) => b.score - a.score);

  // Select primary food (highest score)
  const primaryFood = scoredFoods[0]?.food;
  if (!primaryFood) {
    throw new Error("No compatible foods found for this pet");
  }

  // Compute portions
  const primaryCalories = Math.round(targets.dailyCalories * 0.85); // 85% from primary
  const primaryGrams = Math.round((primaryCalories / primaryFood.caloriesPer100g) * 100);

  // Split into 2 meals (dogs) or 2-3 meals (cats)
  const mealCount = pet.species === "CAT" ? 3 : 2;
  const mealsPerDay = splitIntoMeals(primaryFood, primaryGrams, primaryCalories, mealCount);

  // Add snack/treat allowance (15% of daily calories)
  const snackCalories = Math.round(targets.dailyCalories * 0.15);
  const topTreat = scoredFoods.find((f) => f.food.type === "TREAT")?.food;

  if (topTreat) {
    mealsPerDay.push({
      type: "SNACK",
      foods: [{
        foodId: topTreat.id,
        name: topTreat.productName,
        brand: topTreat.brand,
        amountGrams: Math.round((snackCalories / topTreat.caloriesPer100g) * 100),
        calories: snackCalories,
        imageUrl: topTreat.imageUrl || undefined,
        affiliateUrl: topTreat.affiliateUrl || undefined,
        type: topTreat.type,
      }],
      totalCalories: snackCalories,
      timing: "2:00 PM",
    });
  }

  // Generate supplement recommendations
  const supplements = generateSupplements(targets, pet);

  // Hydration target
  const hydrationTarget = Math.round(pet.weightKg * (pet.species === "CAT" ? 60 : 50)); // mL/day

  const plan: MealPlan = {
    petId,
    dailyCalories: targets.dailyCalories,
    meals: mealsPerDay,
    supplements,
    hydrationTarget,
    notes: generatePlanNotes(targets, pet),
    generatedAt: new Date(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day plan
  };

  // Persist plan
  await prisma.nutritionPlan.create({
    data: {
      petId,
      dailyCalories: plan.dailyCalories,
      dailyProteinG: (targets.dailyCalories * targets.proteinPct / 100) / 4,
      dailyFatG: (targets.dailyCalories * targets.fatPct / 100) / 9,
      dailyFiberG: targets.fiberGrams,
      meals: plan.meals as any,
      supplements: plan.supplements as any,
    },
  });

  return plan;
}

// ─────────────────────────────────────────────
// FOOD SCORING
// ─────────────────────────────────────────────

function scoreFoodFit(food: any, targets: NutritionTarget): number {
  const nutrients = food.nutrients as NutrientProfile;
  if (!nutrients) return 0;

  let score = 0;

  // Protein fit (most important)
  const foodProteinPct = ((nutrients.protein || 0) / (food.caloriesPer100g / 100)) * 100;
  score += (1 - Math.abs(foodProteinPct - targets.proteinPct) / targets.proteinPct) * 30;

  // Fat fit
  const foodFatPct = ((nutrients.fat || 0) * 9 / food.caloriesPer100g) * 100;
  score += (1 - Math.abs(foodFatPct - targets.fatPct) / targets.fatPct) * 20;

  // Fiber content
  if (nutrients.fiber && nutrients.fiber >= 2) score += 10;

  // Omega-3 content (bonus for boost-matching)
  if (nutrients.omega3 && targets.boosts.some((b) => b.nutrient === "omega3")) {
    score += 15;
  }

  // AAFCO compliance bonus
  if (food.aafcoStage) score += 10;

  // Ingredient quality heuristic (first ingredient is protein source)
  const firstIngredient = food.firstFiveIngredients?.[0]?.toLowerCase() || "";
  const proteinFirstIngredients = ["chicken", "beef", "salmon", "turkey", "lamb", "duck", "venison", "rabbit"];
  if (proteinFirstIngredients.some((p) => firstIngredient.includes(p))) {
    score += 15;
  }

  return Math.max(0, score);
}

function splitIntoMeals(food: any, totalGrams: number, totalCalories: number, count: number): PlannedMeal[] {
  const timings = count === 3
    ? ["7:00 AM", "12:00 PM", "6:00 PM"]
    : ["7:00 AM", "6:00 PM"];

  const types: Array<"BREAKFAST" | "DINNER" | "SNACK"> = count === 3
    ? ["BREAKFAST", "SNACK", "DINNER"]
    : ["BREAKFAST", "DINNER"];

  return timings.map((timing, i) => ({
    type: types[i],
    foods: [{
      foodId: food.id,
      name: food.productName,
      brand: food.brand,
      amountGrams: Math.round(totalGrams / count),
      calories: Math.round(totalCalories / count),
      imageUrl: food.imageUrl || undefined,
      affiliateUrl: food.affiliateUrl || undefined,
      type: food.type,
    }],
    totalCalories: Math.round(totalCalories / count),
    timing,
  }));
}

function generateSupplements(targets: NutritionTarget, pet: Pet): Supplement[] {
  const supplements: Supplement[] = [];

  for (const boost of targets.boosts) {
    if (boost.nutrient === "omega3" && boost.targetMg > 200) {
      supplements.push({
        name: "Fish Oil (EPA/DHA)",
        dose: `${Math.round(boost.targetMg)}mg`,
        frequency: "daily",
        reason: boost.reason,
        priority: "recommended",
      });
    }

    if (boost.nutrient === "glucosamine") {
      supplements.push({
        name: "Glucosamine + Chondroitin",
        dose: `${Math.round(boost.targetMg)}mg glucosamine`,
        frequency: "daily",
        reason: boost.reason,
        priority: "recommended",
      });
    }

    if (boost.nutrient === "probiotics") {
      supplements.push({
        name: "Multi-Strain Probiotic",
        dose: "1 capsule/scoop",
        frequency: "daily",
        reason: boost.reason,
        priority: "recommended",
      });
    }
  }

  // All senior pets get joint support
  const ageYears = (Date.now() - pet.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const seniorAge = pet.species === "DOG" ? 7 : 10;

  if (ageYears > seniorAge && !supplements.some((s) => s.name.includes("Glucosamine"))) {
    supplements.push({
      name: "Senior Joint Support",
      dose: `${Math.round(pet.weightKg * 20)}mg glucosamine`,
      frequency: "daily",
      reason: "Senior joint health maintenance",
      priority: "recommended",
    });
  }

  return supplements;
}

function generatePlanNotes(targets: NutritionTarget, pet: Pet): string[] {
  const notes: string[] = [];

  if (pet.bodyCondition >= 7) {
    notes.push("Weight management plan: caloric intake reduced to support gradual weight loss of 1-2% body weight per week.");
  }

  if (targets.boosts.length > 0) {
    notes.push(`Personalized boosts active: ${targets.boosts.map((b) => b.nutrient).join(", ")}.`);
  }

  if (targets.restrictions.length > 0) {
    notes.push(`Avoiding: ${targets.restrictions.join(", ")}.`);
  }

  if (pet.species === "CAT") {
    notes.push("Ensure fresh water is always available. Consider a water fountain to encourage hydration.");
  }

  return notes;
}

// ─────────────────────────────────────────────
// CONDITION-SPECIFIC NUTRITION
// ─────────────────────────────────────────────

function getRiskMitigationBoost(risk: string, weightKg: number): NutrientBoost | null {
  const boosts: Record<string, (w: number) => NutrientBoost> = {
    "hip_dysplasia": (w) => ({
      nutrient: "glucosamine",
      targetMg: w * 20,
      reason: "Elevated hip dysplasia risk",
      source: "breed_risk",
    }),
    "joint_disease": (w) => ({
      nutrient: "omega3",
      targetMg: w * 75,
      reason: "Joint disease prevention",
      source: "breed_risk",
    }),
    "obesity": (w) => ({
      nutrient: "l_carnitine",
      targetMg: w * 10,
      reason: "Breed predisposition to obesity",
      source: "breed_risk",
    }),
    "heart_disease": (w) => ({
      nutrient: "taurine",
      targetMg: w * 25,
      reason: "Cardiac health support",
      source: "breed_risk",
    }),
    "skin_allergies": (w) => ({
      nutrient: "omega3",
      targetMg: w * 100,
      reason: "Skin & coat health, allergy management",
      source: "breed_risk",
    }),
  };

  const riskKey = risk.toLowerCase().replace(/\s+/g, "_");
  return boosts[riskKey]?.(weightKg) || null;
}

function getBiomarkerBoost(reading: any, species: Species, weightKg: number): NutrientBoost | null {
  // Phase 2: biomarker-driven nutrition
  if (reading.name === "BUN" && reading.status === "HIGH") {
    return {
      nutrient: "hydration",
      targetMg: weightKg * 70,
      reason: `Elevated BUN (${reading.value} ${reading.unit}) — increase hydration, moderate protein`,
      source: "biomarker",
    };
  }

  if (reading.name === "cortisol" && reading.status === "HIGH") {
    return {
      nutrient: "probiotics",
      targetMg: 0, // Dose is strain-specific
      reason: `Elevated cortisol — gut-brain axis support`,
      source: "biomarker",
    };
  }

  return null;
}

function getConditionBoosts(condition: string, species: Species, weightKg: number): NutrientBoost[] {
  const normalized = condition.toLowerCase();

  if (normalized.includes("kidney") || normalized.includes("renal") || normalized.includes("ckd")) {
    return [{
      nutrient: "phosphorus_restriction",
      targetMg: -1, // Indicates restriction, not supplementation
      reason: "Kidney disease — restrict phosphorus intake",
      source: "condition",
    }];
  }

  if (normalized.includes("diabetes")) {
    return [{
      nutrient: "fiber",
      targetMg: weightKg * 150, // mg fiber per kg → higher fiber diet
      reason: "Diabetes management — high fiber for glycemic control",
      source: "condition",
    }];
  }

  return [];
}

export {
  NutritionTarget,
  MealPlan,
  PlannedMeal,
  Supplement,
};

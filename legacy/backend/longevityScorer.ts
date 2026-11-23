/**
 * ANIMA Longevity Score™ Engine
 *
 * Computes the 0–999 Longevity Score for a pet based on all available data.
 * The Score is ANIMA's most important artifact — it drives engagement, virality,
 * insurance pricing, vet adoption, and brand positioning.
 *
 * Score Architecture:
 *   score = Σ(factor_score × factor_weight) × 999
 *   Each factor_score is normalized to 0.0–1.0
 *   Weights change based on available data (more data = more factors active)
 */

import {Pet, PrismaClient, Species} from "@prisma/client";
import {Redis} from "@upstash/redis";
import {BreedRiskProfile, breedRiskProfiles} from "../../shared/constants/breeds";
import {biomarkerRanges} from "../../shared/constants/biomarkers";
import {nutrientRequirements} from "../../shared/constants/nutrients";

const prisma = new PrismaClient();
const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! });

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface ScoreFactors {
  genetic: number;         // 0-1: Breed-based genetic risk baseline
  bodyCondition: number;   // 0-1: Weight & BCS relative to breed ideal
  nutritionQuality: number;// 0-1: Diet completeness & quality
  ageHealth: number;       // 0-1: Age-adjusted health position
  preventiveCare: number;  // 0-1: Vaccination, dental, checkup adherence
  activityLevel: number;   // 0-1: Exercise relative to breed needs
  biomarkerHealth?: number;// 0-1: Lab/BioCard biomarker status (Phase 2)
  trajectory?: number;     // 0-1: Trend direction over time (Phase 2)
}

interface ScoreWeights {
  genetic: number;
  bodyCondition: number;
  nutritionQuality: number;
  ageHealth: number;
  preventiveCare: number;
  activityLevel: number;
  biomarkerHealth: number;
  trajectory: number;
}

interface ScoreResult {
  score: number;           // 0–999
  factors: ScoreFactors;
  weights: ScoreWeights;
  breakdown: ScoreBreakdown[];
  percentile: number | null;
  label: string;
  algorithmVersion: string;
}

interface ScoreBreakdown {
  factor: string;
  score: number;
  weight: number;
  contribution: number;    // score × weight
  label: string;
  detail: string;
  improvable: boolean;
  suggestion?: string;
}

// ─────────────────────────────────────────────
// WEIGHT PROFILES (data-dependent)
// ─────────────────────────────────────────────

/**
 * Phase 1 weights: App data only (no biomarkers)
 * Genetic baseline is heavily weighted because we have less data
 */
const WEIGHTS_PHASE_1: ScoreWeights = {
  genetic: 0.25,
  bodyCondition: 0.20,
  nutritionQuality: 0.20,
  ageHealth: 0.15,
  preventiveCare: 0.10,
  activityLevel: 0.10,
  biomarkerHealth: 0.0,
  trajectory: 0.0,
};

/**
 * Phase 2 weights: With BioCard/lab biomarkers
 * Biomarkers become dominant signal, genetic baseline decreases
 */
const WEIGHTS_PHASE_2: ScoreWeights = {
  genetic: 0.15,
  bodyCondition: 0.12,
  nutritionQuality: 0.15,
  ageHealth: 0.08,
  preventiveCare: 0.08,
  activityLevel: 0.10,
  biomarkerHealth: 0.20,
  trajectory: 0.12,
};

const ALGORITHM_VERSION = "v1.0";

// ─────────────────────────────────────────────
// MAIN COMPUTATION
// ─────────────────────────────────────────────

export async function computeScore(petId: string): Promise<ScoreResult> {
  // Fetch all data needed for computation
  const pet = await prisma.pet.findUniqueOrThrow({
    where: { id: petId },
    include: {
      meals: {
        orderBy: { loggedAt: "desc" },
        take: 30, // Last 30 meals (~10 days)
        include: { items: { include: { food: true } } },
      },
      biomarkerSets: {
        orderBy: { recordedAt: "desc" },
        take: 5,
        include: { readings: true },
      },
      vetRecords: {
        orderBy: { date: "desc" },
      },
      weightHistory: {
        orderBy: { recordedAt: "desc" },
        take: 12, // Last 12 weight entries
      },
      activityLogs: {
        orderBy: { date: "desc" },
        take: 30, // Last 30 days
      },
      scores: {
        orderBy: { computedAt: "desc" },
        take: 5, // Previous scores for trajectory
      },
    },
  });

  const breedProfile = getBreedProfile(pet.species, pet.breed);
  const hasBiomarkers = pet.biomarkerSets.length > 0;
  const weights = hasBiomarkers ? WEIGHTS_PHASE_2 : WEIGHTS_PHASE_1;

  // Compute each factor
  const factors: ScoreFactors = {
    genetic: computeGeneticFactor(pet, breedProfile),
    bodyCondition: computeBodyConditionFactor(pet, breedProfile),
    nutritionQuality: computeNutritionFactor(pet),
    ageHealth: computeAgeHealthFactor(pet, breedProfile),
    preventiveCare: computePreventiveCareFactor(pet),
    activityLevel: computeActivityFactor(pet, breedProfile),
  };

  if (hasBiomarkers) {
    factors.biomarkerHealth = computeBiomarkerFactor(pet);
    factors.trajectory = computeTrajectoryFactor(pet);
  }

  // Weighted sum → 0–999
  let rawScore = 0;
  const breakdown: ScoreBreakdown[] = [];

  for (const [key, weight] of Object.entries(weights)) {
    const factorKey = key as keyof ScoreFactors;
    const factorScore = factors[factorKey] ?? 0;
    const contribution = factorScore * weight;
    rawScore += contribution;

    if (weight > 0) {
      breakdown.push(buildBreakdown(factorKey, factorScore, weight, pet, breedProfile));
    }
  }

  const score = Math.round(rawScore * 999);
  const label = getScoreLabel(score);

  // Compute breed percentile (if we have population data)
  const percentile = await computePercentile(score, pet.species, pet.breed);

  // Persist score
  await prisma.longevityScore.create({
    data: {
      petId,
      score,
      factors: factors as any,
      breakdown: breakdown as any,
      percentile,
      algorithmVersion: ALGORITHM_VERSION,
    },
  });

  // Cache for fast reads
  await redis.set(`score:${petId}`, score, { ex: 3600 });

  // Trigger Twin update (async)
  // await scoreQueue.add('updateTwin', { petId, score, factors });

  return {
    score,
    factors,
    weights,
    breakdown: breakdown.sort((a, b) => b.contribution - a.contribution),
    percentile,
    label,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

// ─────────────────────────────────────────────
// FACTOR COMPUTATIONS
// ─────────────────────────────────────────────

/**
 * Genetic Factor (0–1)
 * Based on breed-specific risk profile: average lifespan, known genetic
 * predispositions, breed health score from population data.
 *
 * Higher score = fewer genetic risk factors relative to species average.
 * A mixed-breed dog with no known predispositions scores highest.
 */
function computeGeneticFactor(pet: Pet, breed: BreedRiskProfile): number {
  const speciesAvgLifespan = pet.species === "DOG" ? 12.5 : 15.0;
  const breedAvgLifespan = breed.avgLifespanYears;

  // Lifespan component: how does breed compare to species average?
  const lifespanRatio = Math.min(breedAvgLifespan / speciesAvgLifespan, 1.5);
  const lifespanScore = Math.min(lifespanRatio / 1.5, 1.0);

  // Risk count component: fewer known genetic risks = higher score
  const riskCount = breed.geneticRisks.length;
  const maxRisks = 12; // Breeds like Cavalier KCS have many
  const riskScore = Math.max(0, 1 - riskCount / maxRisks);

  // Breed health score (from population studies)
  const healthScore = breed.healthScore / 100; // 0-100 → 0-1

  // Mixed breeds get a hybrid vigor bonus
  const mixedBonus = pet.breedSecondary ? 0.05 : 0;

  return clamp(lifespanScore * 0.35 + riskScore * 0.30 + healthScore * 0.35 + mixedBonus);
}

/**
 * Body Condition Factor (0–1)
 * Compares current weight + BCS to breed ideal.
 * Obesity is the #1 modifiable risk factor in pet longevity.
 */
function computeBodyConditionFactor(pet: Pet, breed: BreedRiskProfile): number {
  // BCS: 1-9 scale, 4-5 is ideal
  const bcsIdealDelta = Math.abs(pet.bodyCondition - 4.5);
  const bcsScore = Math.max(0, 1 - bcsIdealDelta / 4.5);

  // Weight vs breed ideal range
  const { idealWeightMin, idealWeightMax } = breed;
  let weightScore: number;

  if (pet.weightKg >= idealWeightMin && pet.weightKg <= idealWeightMax) {
    weightScore = 1.0; // In ideal range
  } else if (pet.weightKg < idealWeightMin) {
    const deficit = (idealWeightMin - pet.weightKg) / idealWeightMin;
    weightScore = Math.max(0, 1 - deficit * 2); // Underweight penalty
  } else {
    const excess = (pet.weightKg - idealWeightMax) / idealWeightMax;
    weightScore = Math.max(0, 1 - excess * 2.5); // Overweight penalty (harsher)
  }

  // Weight trend: is weight moving toward or away from ideal?
  const weightTrend = computeWeightTrend(pet);

  return clamp(bcsScore * 0.4 + weightScore * 0.4 + weightTrend * 0.2);
}

/**
 * Nutrition Quality Factor (0–1)
 * Evaluates diet completeness, ingredient quality, and caloric appropriateness.
 */
function computeNutritionFactor(pet: Pet & { meals: any[] }): number {
  if (pet.meals.length === 0) return 0.5; // No data → neutral

  // Compute average daily nutrition from recent meals
  const recentMeals = pet.meals.slice(0, 21); // ~7 days
  const dailyAvg = aggregateDailyNutrition(recentMeals);

  if (!dailyAvg) return 0.5;

  const requirements = nutrientRequirements[pet.species];
  const ageCategory = getAgeCategory(pet);

  // Caloric appropriateness
  const targetCalories = computeDailyCalories(pet);
  const calorieRatio = dailyAvg.calories / targetCalories;
  const calorieScore = 1 - Math.min(Math.abs(1 - calorieRatio) * 2, 1);

  // Protein adequacy
  const proteinMin = requirements[ageCategory].proteinMinPct;
  const proteinPct = (dailyAvg.proteinG / (dailyAvg.calories / 4)) * 100;
  const proteinScore = proteinPct >= proteinMin ? 1.0 : proteinPct / proteinMin;

  // Diet variety (more variety = better micronutrient coverage)
  const uniqueFoods = new Set(recentMeals.flatMap((m: any) => m.items.map((i: any) => i.foodId))).size;
  const varietyScore = Math.min(uniqueFoods / 5, 1.0); // 5+ unique foods = max

  // AAFCO compliance (if using commercial food)
  const aafcoFoods = recentMeals.flatMap((m: any) =>
    m.items.filter((i: any) => i.food?.aafcoStage)
  );
  const aafcoScore = aafcoFoods.length > 0 ? 0.9 : 0.6; // Penalize no AAFCO data

  return clamp(
    calorieScore * 0.30 +
    proteinScore * 0.25 +
    varietyScore * 0.15 +
    aafcoScore * 0.30
  );
}

/**
 * Age-Adjusted Health Factor (0–1)
 * Where is this pet in its expected lifespan? How does current health
 * compare to typical pets of same breed/age?
 */
function computeAgeHealthFactor(pet: Pet, breed: BreedRiskProfile): number {
  const ageYears = getAgeYears(pet);
  const lifespanYears = breed.avgLifespanYears;

  // Age as percentage of expected lifespan
  const lifePct = ageYears / lifespanYears;

  // Younger pets inherently score higher (more potential healthspan)
  // But we don't want to penalize senior pets unfairly
  let ageScore: number;
  if (lifePct < 0.25) {
    ageScore = 0.95; // Puppy/kitten
  } else if (lifePct < 0.50) {
    ageScore = 0.85; // Young adult
  } else if (lifePct < 0.75) {
    ageScore = 0.70; // Middle-aged
  } else if (lifePct < 1.0) {
    ageScore = 0.55; // Senior
  } else {
    ageScore = 0.40; // Super senior (but alive = beating odds!)
  }

  // Adjust for known conditions
  // Each diagnosed condition reduces age-health score
  const conditions = (pet as any).vetRecords?.filter(
    (r: any) => r.type === "DIAGNOSIS"
  ).length ?? 0;
  const conditionPenalty = Math.min(conditions * 0.08, 0.3);

  return clamp(ageScore - conditionPenalty);
}

/**
 * Preventive Care Factor (0–1)
 * Tracks adherence to vaccination schedule, dental care, regular checkups.
 */
function computePreventiveCareFactor(pet: Pet & { vetRecords: any[] }): number {
  if (pet.vetRecords.length === 0) return 0.3; // No records = low score

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Recent checkup?
  const recentCheckup = pet.vetRecords.some(
    (r: any) => r.type === "CHECKUP" && new Date(r.date) > oneYearAgo
  );

  // Vaccinations up to date?
  const overdueVacc = pet.vetRecords.filter(
    (r: any) =>
      r.type === "VACCINATION" &&
      r.nextDue &&
      new Date(r.nextDue) < now
  ).length;

  // Dental care?
  const recentDental = pet.vetRecords.some(
    (r: any) => r.type === "DENTAL" && new Date(r.date) > oneYearAgo
  );

  let score = 0;
  score += recentCheckup ? 0.35 : 0;
  score += overdueVacc === 0 ? 0.35 : Math.max(0, 0.35 - overdueVacc * 0.1);
  score += recentDental ? 0.20 : 0;
  score += pet.vetRecords.length > 3 ? 0.10 : 0.05; // Reward record keeping

  return clamp(score);
}

/**
 * Activity Factor (0–1)
 * Compares activity level to breed-appropriate targets.
 */
function computeActivityFactor(
  pet: Pet & { activityLogs: any[] },
  breed: BreedRiskProfile
): number {
  if (pet.activityLogs.length === 0) return 0.5; // No data → neutral

  const recentLogs = pet.activityLogs.slice(0, 14); // Last 2 weeks
  const avgActiveMin = recentLogs.reduce((sum: number, l: any) => sum + (l.activeMinutes || 0), 0) / recentLogs.length;

  const targetActiveMin = breed.dailyExerciseMinutes;
  const activityRatio = avgActiveMin / targetActiveMin;

  // Sweet spot: 80%–120% of target
  if (activityRatio >= 0.8 && activityRatio <= 1.2) return 0.95;
  if (activityRatio >= 0.6 && activityRatio < 0.8) return 0.75;
  if (activityRatio >= 0.4 && activityRatio < 0.6) return 0.55;
  if (activityRatio > 1.2 && activityRatio <= 1.5) return 0.85; // Slightly over is fine
  if (activityRatio > 1.5) return 0.70; // Way over-exercised (joint risk)

  return clamp(activityRatio * 0.8);
}

/**
 * Biomarker Health Factor (0–1) — Phase 2
 * Evaluates most recent biomarker panel against reference ranges.
 */
function computeBiomarkerFactor(pet: Pet & { biomarkerSets: any[] }): number {
  const latestSet = pet.biomarkerSets[0];
  if (!latestSet || !latestSet.readings.length) return 0.5;

  const readings = latestSet.readings;
  let totalScore = 0;
  let count = 0;

  for (const reading of readings) {
    if (reading.status === "INVALID") continue;

    const range = biomarkerRanges[pet.species]?.[reading.name];
    if (!range) continue;

    let readingScore: number;

    if (reading.status === "NORMAL") {
      // How centered in normal range? (centered = better)
      const mid = (range.min + range.max) / 2;
      const span = range.max - range.min;
      const deviation = Math.abs(reading.value - mid) / (span / 2);
      readingScore = Math.max(0.7, 1 - deviation * 0.3);
    } else if (reading.status === "LOW" || reading.status === "HIGH") {
      // How far outside range?
      const boundary = reading.status === "LOW" ? range.min : range.max;
      const deviation = Math.abs(reading.value - boundary) / boundary;
      readingScore = Math.max(0.1, 0.6 - deviation);
    } else {
      readingScore = 0.1; // CRITICAL
    }

    // Weight by clinical importance
    const importance = range.clinicalWeight || 1.0;
    totalScore += readingScore * importance;
    count += importance;
  }

  return count > 0 ? clamp(totalScore / count) : 0.5;
}

/**
 * Trajectory Factor (0–1) — Phase 2
 * Is the pet's health trending up, stable, or declining?
 * Based on score history and biomarker trends.
 */
function computeTrajectoryFactor(pet: Pet & { scores: any[]; biomarkerSets: any[] }): number {
  // Score trend
  const previousScores = pet.scores.slice(0, 5).map((s: any) => s.score);
  if (previousScores.length < 2) return 0.5; // Not enough history

  // Simple linear regression on recent scores
  const n = previousScores.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  const avgX = indices.reduce((a, b) => a + b) / n;
  const avgY = previousScores.reduce((a: number, b: number) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (indices[i] - avgX) * (previousScores[i] - avgY);
    denominator += (indices[i] - avgX) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Normalize slope to 0-1 (positive slope = improving = higher score)
  // Slope of +50 points/period = very good, -50 = very bad
  const normalizedSlope = clamp((slope + 50) / 100);

  return normalizedSlope;
}

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

function getBreedProfile(species: Species, breed: string): BreedRiskProfile {
  const key = `${species}:${breed.toLowerCase()}`;
  return breedRiskProfiles[key] || breedRiskProfiles[`${species}:mixed`];
}

function getAgeYears(pet: Pet): number {
  const now = new Date();
  const birth = new Date(pet.dateOfBirth);
  return (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function getAgeCategory(pet: Pet): "puppy" | "adult" | "senior" {
  const age = getAgeYears(pet);
  if (pet.species === "DOG") {
    if (age < 1) return "puppy";
    if (age < 7) return "adult";
    return "senior";
  } else {
    if (age < 1) return "puppy";
    if (age < 10) return "adult";
    return "senior";
  }
}

function computeDailyCalories(pet: Pet): number {
  // Resting Energy Requirement × activity multiplier
  const rer = 70 * Math.pow(pet.weightKg, 0.75);
  const multiplier = pet.neutered ? 1.6 : 1.8;
  const age = getAgeYears(pet);
  const ageMultiplier = age < 1 ? 2.0 : age > 7 ? 1.2 : 1.0;
  return rer * multiplier * ageMultiplier;
}

function computeWeightTrend(pet: Pet & { weightHistory?: any[] }): number {
  const history = (pet as any).weightHistory;
  if (!history || history.length < 2) return 0.5;
  const recent = history[0].weightKg;
  const older = history[history.length - 1].weightKg;
  const change = (recent - older) / older;
  // Stable weight is best; large swings in either direction are concerning
  return clamp(1 - Math.abs(change) * 5);
}

function aggregateDailyNutrition(meals: any[]): { calories: number; proteinG: number } | null {
  if (meals.length === 0) return null;

  const days = new Set(meals.map((m: any) => new Date(m.loggedAt).toDateString())).size;
  let totalCal = 0;
  let totalProtein = 0;

  for (const meal of meals) {
    for (const item of meal.items) {
      totalCal += item.calories || 0;
      totalProtein += item.nutrients?.protein || 0;
    }
  }

  return {
    calories: totalCal / days,
    proteinG: totalProtein / days,
  };
}

function getScoreLabel(score: number): string {
  if (score >= 900) return "Exceptional";
  if (score >= 750) return "Excellent";
  if (score >= 600) return "Good";
  if (score >= 400) return "Fair";
  if (score >= 200) return "At Risk";
  return "Critical";
}

async function computePercentile(score: number, species: Species, breed: string): Promise<number | null> {
  // Count how many pets of same breed have lower scores
  const total = await prisma.longevityScore.count({
    where: { pet: { species, breed } },
  });

  if (total < 10) return null; // Not enough data for meaningful percentile

  const lower = await prisma.longevityScore.count({
    where: {
      pet: { species, breed },
      score: { lt: score },
    },
  });

  return Math.round((lower / total) * 100);
}

function buildBreakdown(
  factorKey: keyof ScoreFactors,
  score: number,
  weight: number,
  pet: Pet,
  breed: BreedRiskProfile
): ScoreBreakdown {
  const labels: Record<string, string> = {
    genetic: "Genetic Baseline",
    bodyCondition: "Body Condition",
    nutritionQuality: "Nutrition Quality",
    ageHealth: "Age & Health",
    preventiveCare: "Preventive Care",
    activityLevel: "Activity Level",
    biomarkerHealth: "Biomarker Health",
    trajectory: "Health Trajectory",
  };

  const improvable = !["genetic", "ageHealth"].includes(factorKey);

  return {
    factor: factorKey,
    score: Math.round(score * 100),
    weight,
    contribution: score * weight,
    label: labels[factorKey] || factorKey,
    detail: getFactorDetail(factorKey, score),
    improvable,
    suggestion: improvable && score < 0.7 ? getImprovementSuggestion(factorKey, pet) : undefined,
  };
}

function getFactorDetail(factor: string, score: number): string {
  const level = score >= 0.8 ? "strong" : score >= 0.5 ? "moderate" : "needs attention";
  const details: Record<string, Record<string, string>> = {
    genetic: {
      strong: "Breed has fewer genetic predispositions than average",
      moderate: "Some breed-specific risks to monitor",
      "needs attention": "Breed has elevated genetic risk factors",
    },
    bodyCondition: {
      strong: "Weight and body condition are in ideal range",
      moderate: "Slightly outside ideal weight range",
      "needs attention": "Weight management recommended",
    },
    nutritionQuality: {
      strong: "Diet is well-balanced and meets nutritional needs",
      moderate: "Some nutritional gaps detected",
      "needs attention": "Significant nutritional improvements possible",
    },
    ageHealth: {
      strong: "Healthy for age and breed",
      moderate: "Age-appropriate health",
      "needs attention": "Senior health considerations apply",
    },
    preventiveCare: {
      strong: "Preventive care is up to date",
      moderate: "Some preventive care items due",
      "needs attention": "Overdue for preventive care visits",
    },
    activityLevel: {
      strong: "Activity level matches breed needs",
      moderate: "Could benefit from more activity",
      "needs attention": "Activity level below recommended for breed",
    },
  };

  return details[factor]?.[level] || "Score calculated from available data";
}

function getImprovementSuggestion(factor: string, pet: Pet): string {
  const suggestions: Record<string, string> = {
    bodyCondition: `Adjusting daily calories could help reach ideal weight of ${pet.weightKg > 10 ? "a healthy range" : "optimal BCS"}.`,
    nutritionQuality: "Try logging meals for 7 days to get personalized nutrition recommendations.",
    preventiveCare: "Schedule an annual wellness checkup to improve this score.",
    activityLevel: "Adding 10 more minutes of daily activity can significantly improve this factor.",
  };

  return suggestions[factor] || "Keep monitoring to improve this score.";
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

export { computeScore, ScoreResult, ScoreFactors, ALGORITHM_VERSION };

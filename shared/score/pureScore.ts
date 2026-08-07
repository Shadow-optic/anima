/**
 * ANIMA Pure Phase-1 Longevity Score
 *
 * Dependency-free. Runs in the browser, React Native, or Node.
 * Used for:
 *   - Instant onboarding Score Reveal (no network)
 *   - Offline / demo mode
 *   - Unit tests
 *
 * The production Prisma-backed engine (longevityScorer.ts) remains
 * the source of truth once the real backend is live. This pure
 * version mirrors Phase-1 factor weights and logic exactly.
 */

export interface PurePetInput {
  species: "DOG" | "CAT";
  breed: string;
  breedSecondary?: string;
  dateOfBirth: string; // ISO
  weightKg: number;
  bodyCondition: number; // 1-9
  neutered?: boolean;
  mealCountLast7Days?: number;
  hasVetRecords?: boolean;
  activityMinutesAvg?: number;
}

export interface PureScoreFactors {
  genetic: number;
  bodyCondition: number;
  nutritionQuality: number;
  ageHealth: number;
  preventiveCare: number;
  activityLevel: number;
}

export interface PureScoreBreakdown {
  factor: keyof PureScoreFactors;
  label: string;
  score: number; // 0-100
  weight: number;
  contribution: number;
  detail: string;
  improvable: boolean;
  suggestion?: string;
  actionRoute?: string;
}

export interface PureScoreResult {
  score: number; // 0-999
  factors: PureScoreFactors;
  breakdown: PureScoreBreakdown[];
  percentile: number;
  label: string;
  algorithmVersion: string;
}

interface BreedProfile {
  avgLifespanYears: number;
  idealWeightMin: number;
  idealWeightMax: number;
  healthScore: number;
  dailyExerciseMinutes: number;
  geneticRisks: string[];
}

const BREED_PROFILES: Record<string, BreedProfile> = {
  "DOG:labrador retriever": {
    avgLifespanYears: 12.5, idealWeightMin: 25, idealWeightMax: 36,
    healthScore: 72, dailyExerciseMinutes: 60,
    geneticRisks: ["hip_dysplasia", "elbow_dysplasia", "obesity", "exercise_induced_collapse"],
  },
  "DOG:golden retriever": {
    avgLifespanYears: 11.0, idealWeightMin: 25, idealWeightMax: 34,
    healthScore: 62, dailyExerciseMinutes: 60,
    geneticRisks: ["hip_dysplasia", "heart_disease", "cancer", "skin_allergies"],
  },
  "DOG:german shepherd": {
    avgLifespanYears: 11.0, idealWeightMin: 22, idealWeightMax: 40,
    healthScore: 65, dailyExerciseMinutes: 90,
    geneticRisks: ["hip_dysplasia", "degenerative_myelopathy", "bloat", "exocrine_pancreatic_insufficiency"],
  },
  "DOG:french bulldog": {
    avgLifespanYears: 10.5, idealWeightMin: 8, idealWeightMax: 13,
    healthScore: 45, dailyExerciseMinutes: 30,
    geneticRisks: ["brachycephalic_syndrome", "spinal_disease", "skin_allergies", "heat_intolerance"],
  },
  "DOG:poodle": {
    avgLifespanYears: 14.0, idealWeightMin: 2.5, idealWeightMax: 32,
    healthScore: 78, dailyExerciseMinutes: 60,
    geneticRisks: ["hip_dysplasia", "eye_disease", "bloat", "addisons_disease"],
  },
  "DOG:bulldog": {
    avgLifespanYears: 8.5, idealWeightMin: 18, idealWeightMax: 25,
    healthScore: 38, dailyExerciseMinutes: 20,
    geneticRisks: ["brachycephalic_syndrome", "hip_dysplasia", "skin_allergies", "heart_disease", "heat_intolerance"],
  },
  "DOG:beagle": {
    avgLifespanYears: 13.0, idealWeightMin: 9, idealWeightMax: 14,
    healthScore: 75, dailyExerciseMinutes: 60,
    geneticRisks: ["obesity", "epilepsy", "hypothyroidism", "eye_disease"],
  },
  "DOG:mixed": {
    avgLifespanYears: 13.5, idealWeightMin: 5, idealWeightMax: 40,
    healthScore: 80, dailyExerciseMinutes: 45,
    geneticRisks: [],
  },
  "CAT:domestic shorthair": {
    avgLifespanYears: 15.0, idealWeightMin: 3.5, idealWeightMax: 5.5,
    healthScore: 80, dailyExerciseMinutes: 30,
    geneticRisks: [],
  },
  "CAT:siamese": {
    avgLifespanYears: 15.5, idealWeightMin: 3.0, idealWeightMax: 5.0,
    healthScore: 72, dailyExerciseMinutes: 30,
    geneticRisks: ["amyloidosis", "asthma", "heart_disease", "eye_disease"],
  },
  "CAT:persian": {
    avgLifespanYears: 14.0, idealWeightMin: 3.0, idealWeightMax: 5.5,
    healthScore: 55, dailyExerciseMinutes: 15,
    geneticRisks: ["polycystic_kidney_disease", "brachycephalic_syndrome", "eye_disease", "heart_disease"],
  },
  "CAT:maine coon": {
    avgLifespanYears: 13.0, idealWeightMin: 5.0, idealWeightMax: 11.0,
    healthScore: 68, dailyExerciseMinutes: 30,
    geneticRisks: ["hip_dysplasia", "heart_disease", "spinal_muscular_atrophy"],
  },
  "CAT:mixed": {
    avgLifespanYears: 15.5, idealWeightMin: 3.5, idealWeightMax: 6.0,
    healthScore: 82, dailyExerciseMinutes: 25,
    geneticRisks: [],
  },
};

const WEIGHTS = {
  genetic: 0.25,
  bodyCondition: 0.20,
  nutritionQuality: 0.20,
  ageHealth: 0.15,
  preventiveCare: 0.10,
  activityLevel: 0.10,
} as const;

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function getBreedProfile(species: string, breed: string): BreedProfile {
  const key = `${species}:${(breed || "mixed").toLowerCase()}`;
  return (
    BREED_PROFILES[key] ||
    BREED_PROFILES[`${species}:mixed`] || {
      avgLifespanYears: species === "DOG" ? 12.5 : 15,
      idealWeightMin: 5,
      idealWeightMax: 30,
      healthScore: 70,
      dailyExerciseMinutes: 45,
      geneticRisks: [],
    }
  );
}

function getAgeYears(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  return (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function scoreLabel(score: number): string {
  if (score >= 900) return "Exceptional";
  if (score >= 750) return "Excellent";
  if (score >= 600) return "Good";
  if (score >= 400) return "Fair";
  if (score >= 200) return "At Risk";
  return "Critical";
}

/**
 * Convert a simple age-in-years number (from onboarding input)
 * into an approximate ISO date of birth.
 */
export function ageYearsToDob(ageYears: number): string {
  const ms = ageYears * 365.25 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

export function computePureScore(pet: PurePetInput): PureScoreResult {
  const breed = getBreedProfile(pet.species, pet.breed);
  const ageYears = getAgeYears(pet.dateOfBirth);

  // Genetic
  const speciesAvg = pet.species === "DOG" ? 12.5 : 15.0;
  const lifespanRatio = Math.min(breed.avgLifespanYears / speciesAvg, 1.5);
  const lifespanScore = Math.min(lifespanRatio / 1.5, 1.0);
  const riskScore = Math.max(0, 1 - breed.geneticRisks.length / 12);
  const healthScore = breed.healthScore / 100;
  const mixedBonus = pet.breedSecondary ? 0.05 : 0;
  const genetic = clamp(lifespanScore * 0.35 + riskScore * 0.3 + healthScore * 0.35 + mixedBonus);

  // Body condition
  const bcs = pet.bodyCondition ?? 5;
  const bcsScore = Math.max(0, 1 - Math.abs(bcs - 4.5) / 4.5);
  let weightScore: number;
  const w = pet.weightKg;
  if (w >= breed.idealWeightMin && w <= breed.idealWeightMax) weightScore = 1;
  else if (w < breed.idealWeightMin) {
    weightScore = Math.max(0, 1 - ((breed.idealWeightMin - w) / breed.idealWeightMin) * 2);
  } else {
    weightScore = Math.max(0, 1 - ((w - breed.idealWeightMax) / breed.idealWeightMax) * 2.5);
  }
  const bodyCondition = clamp(bcsScore * 0.4 + weightScore * 0.4 + 0.5 * 0.2);

  // Nutrition — lifts with meal logging density
  const meals = pet.mealCountLast7Days ?? 0;
  let nutritionQuality = 0.55;
  if (meals >= 14) nutritionQuality = 0.88;
  else if (meals >= 7) nutritionQuality = 0.78;
  else if (meals >= 3) nutritionQuality = 0.68;
  else if (meals >= 1) nutritionQuality = 0.62;

  // Age health
  const lifePct = ageYears / breed.avgLifespanYears;
  let ageScore = 0.4;
  if (lifePct < 0.25) ageScore = 0.95;
  else if (lifePct < 0.5) ageScore = 0.85;
  else if (lifePct < 0.75) ageScore = 0.7;
  else if (lifePct < 1) ageScore = 0.55;
  const ageHealth = clamp(ageScore);

  // Preventive
  const preventiveCare = pet.hasVetRecords ? 0.82 : 0.52;

  // Activity
  let activityLevel = 0.62;
  if (pet.activityMinutesAvg != null) {
    const ratio = pet.activityMinutesAvg / breed.dailyExerciseMinutes;
    if (ratio >= 0.8 && ratio <= 1.2) activityLevel = 0.95;
    else if (ratio >= 0.6) activityLevel = 0.78;
    else if (ratio >= 0.4) activityLevel = 0.58;
    else activityLevel = clamp(ratio * 0.9);
  }

  const factors: PureScoreFactors = {
    genetic,
    bodyCondition,
    nutritionQuality,
    ageHealth,
    preventiveCare,
    activityLevel,
  };

  let raw = 0;
  for (const [k, weight] of Object.entries(WEIGHTS)) {
    raw += (factors[k as keyof PureScoreFactors] ?? 0) * weight;
  }
  const score = Math.round(clamp(raw) * 999);

  const labels: Record<keyof PureScoreFactors, string> = {
    genetic: "Genetic Baseline",
    bodyCondition: "Body Condition",
    nutritionQuality: "Nutrition Quality",
    ageHealth: "Age & Health",
    preventiveCare: "Preventive Care",
    activityLevel: "Activity Level",
  };

  const details: Record<keyof PureScoreFactors, string> = {
    genetic:
      genetic >= 0.8
        ? "Breed has fewer genetic predispositions than average"
        : genetic >= 0.5
          ? "Some breed-specific risks to monitor"
          : "Breed has elevated genetic risk factors",
    bodyCondition:
      bodyCondition >= 0.8
        ? "Weight and body condition are in ideal range"
        : bodyCondition >= 0.5
          ? "Slightly outside ideal weight range"
          : "Weight management recommended",
    nutritionQuality:
      nutritionQuality >= 0.8
        ? "Strong recent meal logging — nutrition signal is high"
        : meals > 0
          ? "Meal logging started — keep the streak going"
          : "Log meals for 7 days to unlock precision scoring",
    ageHealth:
      ageHealth >= 0.8
        ? "Healthy for age and breed"
        : ageHealth >= 0.5
          ? "Age-appropriate health"
          : "Senior health considerations apply",
    preventiveCare: pet.hasVetRecords
      ? "Vet records present — preventive signal is strong"
      : "Add vet records and vaccination history to raise this factor",
    activityLevel:
      activityLevel >= 0.8
        ? "Activity matches breed needs"
        : `Target ~${breed.dailyExerciseMinutes} active minutes daily`,
  };

  const suggestions: Partial<Record<keyof PureScoreFactors, string>> = {
    bodyCondition:
      bcs > 5.5
        ? "Aim for BCS 4–5. Small daily calorie reductions compound."
        : bcs < 4
          ? "Slight underweight — review caloric density and meal frequency."
          : "Maintain current BCS; re-check monthly.",
    nutritionQuality: "Log today’s planned meals to lift the nutrition factor.",
    preventiveCare: "Schedule or log an annual wellness checkup.",
    activityLevel: `Add one extra play/walk block to approach ${breed.dailyExerciseMinutes} min/day.`,
  };

  const actionRoutes: Partial<Record<keyof PureScoreFactors, string>> = {
    bodyCondition: "/nutrition",
    nutritionQuality: "/nutrition",
    preventiveCare: "/(tabs)/health",
    activityLevel: "/(tabs)/health",
  };

  const breakdown: PureScoreBreakdown[] = (Object.keys(WEIGHTS) as (keyof PureScoreFactors)[]).map(
    (key) => {
      const factorScore = factors[key];
      const weight = WEIGHTS[key];
      const improvable = !["genetic", "ageHealth"].includes(key);
      return {
        factor: key,
        label: labels[key],
        score: Math.round(factorScore * 100),
        weight,
        contribution: Number((factorScore * weight).toFixed(3)),
        detail: details[key],
        improvable,
        suggestion: improvable && factorScore < 0.75 ? suggestions[key] : undefined,
        actionRoute: improvable ? actionRoutes[key] : undefined,
      };
    }
  );

  breakdown.sort((a, b) => b.contribution - a.contribution);

  return {
    score,
    factors,
    breakdown,
    percentile: Math.max(5, Math.min(98, Math.round((score / 999) * 92 + 4))),
    label: scoreLabel(score),
    algorithmVersion: "pure-v1.0",
  };
}

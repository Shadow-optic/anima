/**
 * ANIMA shared types.
 *
 * Everything in `shared/` is dependency-free TypeScript so the same code runs
 * in the browser, in React Native, in tests and (later) in server functions.
 */

// ─────────────────────────────────────────────
// Pet
// ─────────────────────────────────────────────

export type Species = "DOG" | "CAT";
export type Sex = "MALE" | "FEMALE";

export interface Pet {
  id: string;
  userId: string;
  name: string;
  species: Species;
  breed: string;
  dateOfBirth: string; // ISO date
  sex: Sex;
  neutered: boolean;
  weightKg: number;
  bodyCondition: number; // 1–9 body condition score
  /** Owner-reported average active minutes per day. null = not answered yet. */
  activityMinutesPerDay: number | null;
  /** The food this pet eats most days. References a catalog or custom food id. */
  primaryFoodId: string | null;
  /**
   * Portion Autopilot: this pet's personal multiplier on the textbook calorie
   * estimate, learned from weigh-ins. 1 = the formula as is.
   */
  calorieFactor: number;
  /** When the feeding plan was last reviewed and a factor applied. */
  planReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewPet = Omit<Pet, "id" | "userId" | "createdAt" | "updatedAt">;

export interface WeighIn {
  id: string;
  petId: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  createdAt: string;
}

export type NewWeighIn = Omit<WeighIn, "id" | "createdAt">;

// ─────────────────────────────────────────────
// Food
// ─────────────────────────────────────────────

export type FoodFormat = "KIBBLE" | "WET" | "FRESH" | "FREEZE_DRIED" | "RAW" | "TREAT" | "TOPPER";
export type FoodCategory = "COMPLETE" | "TREAT" | "TOPPER";

/** What the nutritional adequacy statement on the label says. */
export type AdequacyBasis = "FEEDING_TRIAL" | "FORMULATED" | "NONE" | "UNKNOWN";
export type AdequacyLifeStage = "GROWTH" | "MAINTENANCE" | "ALL_LIFE_STAGES" | "SUPPLEMENTAL" | "UNKNOWN";

/** Guaranteed analysis exactly as printed on the label ("as fed"). */
export interface GuaranteedAnalysis {
  proteinMinPct: number;
  fatMinPct: number;
  fiberMaxPct: number;
  moistureMaxPct: number;
  ashPct?: number;
  calciumPct?: number;
  phosphorusPct?: number;
  /** EPA + DHA, or total omega-3 when that is all the label gives. */
  omega3Pct?: number;
  taurinePct?: number;
}

/** Answers to the WSAVA "selecting a pet food" questions. undefined = unknown. */
export interface MakerTransparency {
  employsNutritionist?: boolean;
  ownsManufacturing?: boolean;
  publishesFullNutrientAnalysis?: boolean;
  conductsFeedingTrialsOrResearch?: boolean;
}

export interface FoodProduct {
  id: string;
  brand: string;
  name: string;
  species: Species | "BOTH";
  category: FoodCategory;
  format: FoodFormat;
  adequacyBasis: AdequacyBasis;
  adequacyLifeStage: AdequacyLifeStage;
  /** Label says it is suitable for growth of large-size dogs (70 lb+ as adults). */
  largeBreedGrowthOk?: boolean;
  ga: GuaranteedAnalysis;
  /** Metabolisable energy from the label. Estimated from the analysis when absent. */
  kcalPerKg?: number;
  /** Ingredient list in label order. */
  ingredients: string[];
  grainFree?: boolean;
  maker?: MakerTransparency;
  /** Recalls of this brand in the last five years, when known. */
  recallsLast5y?: number;
  priceUsd?: number;
  packageSizeKg?: number;
  /** For treats: kcal in one piece. */
  kcalPerTreat?: number;
  tags?: string[];
  /** The adequacy statement as printed, when on record. */
  aafcoStatement?: string;
  /** Where the label data came from, for real products. */
  source?: { url: string; type: "manufacturer" | "retailer"; retrievedAt: string };
  /** Anything a reader should know about how a value was obtained. */
  note?: string;
  /** Illustrative catalog entry, not a real product. */
  isSample?: boolean;
  /** Entered by a user from a label. */
  ownerId?: string;
  createdAt?: string;
}

// ─────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────

export type MealType = "MEAL" | "TREAT";

export interface MealLogItem {
  foodId: string | null;
  name: string;
  amountGrams: number;
  calories: number;
}

export interface MealLog {
  id: string;
  petId: string;
  type: MealType;
  items: MealLogItem[];
  totalCalories: number;
  loggedAt: string;
}

export type NewMealLog = Omit<MealLog, "id" | "totalCalories" | "loggedAt"> & { loggedAt?: string };

export type CareKind = "WELLNESS_EXAM" | "VACCINATION" | "DENTAL" | "PARASITE_PREVENTION";

export interface CareEvent {
  id: string;
  petId: string;
  kind: CareKind;
  date: string; // ISO date the care happened
  note?: string;
  createdAt: string;
}

export type NewCareEvent = Omit<CareEvent, "id" | "createdAt">;

// ─────────────────────────────────────────────
// Score
// ─────────────────────────────────────────────

export type FactorKey =
  | "genetic"
  | "bodyCondition"
  | "nutritionQuality"
  | "ageHealth"
  | "preventiveCare"
  | "activityLevel";

export type ScoreFactors = Record<FactorKey, number>; // each 0–1

export interface ScoreBreakdown {
  factor: FactorKey;
  label: string;
  score: number; // 0–100
  weight: number; // 0–1
  contribution: number;
  detail: string;
  /** Can the owner change this factor? */
  improvable: boolean;
  /** True when the factor is a neutral placeholder because data is missing. */
  estimated: boolean;
  suggestion?: string;
  actionRoute?: string;
}

export type ScoreLabel = "Exceptional" | "Excellent" | "Good" | "Fair" | "At Risk" | "Critical";

export interface LongevityScore {
  score: number; // 0–999
  factors: ScoreFactors;
  breakdown: ScoreBreakdown[];
  label: ScoreLabel;
  /** 0–1: share of the score that rests on real data rather than neutral defaults. */
  dataCompleteness: number;
  algorithmVersion: string;
  computedAt: string;
}

export interface ScoreSnapshot {
  petId: string;
  day: string; // YYYY-MM-DD
  score: number;
  factors: ScoreFactors;
  algorithmVersion: string;
}

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 900) return "Exceptional";
  if (score >= 750) return "Excellent";
  if (score >= 600) return "Good";
  if (score >= 400) return "Fair";
  if (score >= 200) return "At Risk";
  return "Critical";
}

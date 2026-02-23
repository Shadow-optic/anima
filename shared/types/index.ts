/**
 * ANIMA Shared Types
 * Used across mobile app, API, and web portal
 */

// ─────────────────────────────────────────────
// PET
// ─────────────────────────────────────────────

export type Species = "DOG" | "CAT";
export type Sex = "MALE" | "FEMALE";
export type Tier = "FREE" | "PREMIUM" | "PRO" | "VET";

export interface Pet {
  id: string;
  userId: string;
  name: string;
  species: Species;
  breed: string;
  breedSecondary?: string;
  dateOfBirth: string;       // ISO date
  sex: Sex;
  neutered: boolean;
  weightKg: number;
  bodyCondition: number;     // 1-9 BCS
  photoUrl?: string;
  microchipId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PetWithScore extends Pet {
  currentScore?: LongevityScore;
  twin?: DigitalTwinSummary;
}

// ─────────────────────────────────────────────
// LONGEVITY SCORE
// ─────────────────────────────────────────────

export interface LongevityScore {
  id: string;
  petId: string;
  score: number;             // 0-999
  factors: ScoreFactors;
  breakdown: ScoreBreakdown[];
  percentile: number | null;
  label: ScoreLabel;
  algorithmVersion: string;
  computedAt: string;
}

export interface ScoreFactors {
  genetic: number;
  bodyCondition: number;
  nutritionQuality: number;
  ageHealth: number;
  preventiveCare: number;
  activityLevel: number;
  biomarkerHealth?: number;
  trajectory?: number;
}

export interface ScoreBreakdown {
  factor: string;
  score: number;            // 0-100
  weight: number;           // 0-1
  contribution: number;
  label: string;
  detail: string;
  improvable: boolean;
  suggestion?: string;
}

export type ScoreLabel =
  | "Exceptional"  // 900-999
  | "Excellent"    // 750-899
  | "Good"         // 600-749
  | "Fair"         // 400-599
  | "At Risk"      // 200-399
  | "Critical";    // 0-199

export const SCORE_COLORS: Record<ScoreLabel, string> = {
  Exceptional: "#10B981",   // Emerald
  Excellent: "#34D399",     // Light green
  Good: "#60A5FA",          // Blue
  Fair: "#FBBF24",          // Amber
  "At Risk": "#F97316",     // Orange
  Critical: "#EF4444",      // Red
};

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 900) return "Exceptional";
  if (score >= 750) return "Excellent";
  if (score >= 600) return "Good";
  if (score >= 400) return "Fair";
  if (score >= 200) return "At Risk";
  return "Critical";
}

export function getScoreColor(score: number): string {
  return SCORE_COLORS[getScoreLabel(score)];
}

// ─────────────────────────────────────────────
// DIGITAL TWIN
// ─────────────────────────────────────────────

export interface DigitalTwinSummary {
  id: string;
  petId: string;
  healthTrajectory: "improving" | "stable" | "declining" | "unknown";
  riskPredictions: RiskPrediction[];
  recommendations: Recommendation[];
  lastComputed: string;
  dataCompleteness: number;  // 0-100: how much data we have vs. could have
}

export interface RiskPrediction {
  disease: string;
  probability: number;     // 0-1
  timeframeMonths: number;
  confidence: number;      // 0-1
  preventable: boolean;
  source: "genetic" | "biomarker" | "population" | "trend";
}

export interface Recommendation {
  id: string;
  type: "nutrition" | "activity" | "vet_visit" | "testing" | "supplement";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;           // Deep link or action identifier
  impact: string;           // "Could improve score by ~15 points"
}

// ─────────────────────────────────────────────
// BIOMARKERS
// ─────────────────────────────────────────────

export type DataSource = "BIOCARD" | "VET_LAB" | "WEARABLE" | "MANUAL" | "DNA_PANEL";
export type BiomarkerStatus = "NORMAL" | "LOW" | "HIGH" | "CRITICAL" | "INVALID";

export interface BiomarkerSet {
  id: string;
  petId: string;
  source: DataSource;
  sourceRef?: string;
  readings: BiomarkerReading[];
  scanQuality?: number;
  recordedAt: string;
}

export interface BiomarkerReading {
  id: string;
  name: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  status: BiomarkerStatus;
  confidence?: number;
}

export interface BiomarkerTrend {
  name: string;
  unit: string;
  dataPoints: Array<{
    value: number;
    date: string;
    source: DataSource;
  }>;
  trend: "rising" | "falling" | "stable";
  velocity: number;        // Rate of change per month
}

export const BIOMARKER_STATUS_COLORS: Record<BiomarkerStatus, string> = {
  NORMAL: "#10B981",
  LOW: "#F97316",
  HIGH: "#F97316",
  CRITICAL: "#EF4444",
  INVALID: "#6B7280",
};

// ─────────────────────────────────────────────
// NUTRITION
// ─────────────────────────────────────────────

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "TREAT";
export type FoodType = "KIBBLE" | "WET" | "RAW" | "FREEZE_DRIED" | "DEHYDRATED" | "HOMEMADE" | "SUPPLEMENT" | "TREAT";

export interface NutritionPlan {
  petId: string;
  dailyCalories: number;
  meals: PlannedMeal[];
  supplements: Supplement[];
  hydrationTargetMl: number;
  notes: string[];
  generatedAt: string;
  validUntil: string;
}

export interface PlannedMeal {
  type: MealType;
  foods: PlannedFood[];
  totalCalories: number;
  timing: string;
}

export interface PlannedFood {
  foodId: string;
  name: string;
  brand: string;
  amountGrams: number;
  calories: number;
  imageUrl?: string;
  affiliateUrl?: string;
  type: FoodType;
}

export interface Supplement {
  name: string;
  dose: string;
  frequency: string;
  reason: string;
  priority: "essential" | "recommended" | "optional";
}

export interface MealLog {
  id: string;
  petId: string;
  type: MealType;
  items: MealLogItem[];
  totalCalories: number;
  photoUrl?: string;
  loggedAt: string;
}

export interface MealLogItem {
  foodId?: string;
  name: string;
  amountGrams: number;
  calories: number;
}

// ─────────────────────────────────────────────
// BIOCARD
// ─────────────────────────────────────────────

export interface BioCardScanRequest {
  petId: string;
  imageBase64: string;
  cardVersion?: string;
}

export interface BioCardScanResult {
  success: boolean;
  cardVersion: string;
  lotNumber: string;
  readings: BiomarkerReading[];
  scanQuality: number;
  warnings: string[];
}

// ─────────────────────────────────────────────
// API RESPONSES
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    total?: number;
    limit?: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    total: number;
    limit: number;
    hasMore: boolean;
  };
}

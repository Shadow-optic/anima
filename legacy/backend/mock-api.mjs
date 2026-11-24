import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 4010);

const id = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

// ─────────────────────────────────────────────
// BREED PROFILES (embedded for pure runtime)
// ─────────────────────────────────────────────

const BREED_PROFILES = {
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

function getBreedProfile(species, breed) {
  const key = `${species}:${(breed || "mixed").toLowerCase()}`;
  return BREED_PROFILES[key] || BREED_PROFILES[`${species}:mixed`] || {
    avgLifespanYears: species === "DOG" ? 12.5 : 15,
    idealWeightMin: 5, idealWeightMax: 30,
    healthScore: 70, dailyExerciseMinutes: 45, geneticRisks: [],
  };
}

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function getAgeYears(dateOfBirth) {
  const birth = new Date(dateOfBirth);
  return (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

// ─────────────────────────────────────────────
// PURE PHASE-1 LONGEVITY SCORE ENGINE
// ─────────────────────────────────────────────

const WEIGHTS_PHASE_1 = {
  genetic: 0.25,
  bodyCondition: 0.20,
  nutritionQuality: 0.20,
  ageHealth: 0.15,
  preventiveCare: 0.10,
  activityLevel: 0.10,
};

function computeGeneticFactor(pet, breed) {
  const speciesAvg = pet.species === "DOG" ? 12.5 : 15.0;
  const lifespanRatio = Math.min(breed.avgLifespanYears / speciesAvg, 1.5);
  const lifespanScore = Math.min(lifespanRatio / 1.5, 1.0);
  const riskCount = breed.geneticRisks.length;
  const riskScore = Math.max(0, 1 - riskCount / 12);
  const healthScore = breed.healthScore / 100;
  const mixedBonus = pet.breedSecondary ? 0.05 : 0;
  return clamp(lifespanScore * 0.35 + riskScore * 0.30 + healthScore * 0.35 + mixedBonus);
}

function computeBodyConditionFactor(pet, breed) {
  const bcsIdealDelta = Math.abs((pet.bodyCondition || 5) - 4.5);
  const bcsScore = Math.max(0, 1 - bcsIdealDelta / 4.5);

  let weightScore;
  const w = pet.weightKg || 10;
  if (w >= breed.idealWeightMin && w <= breed.idealWeightMax) {
    weightScore = 1.0;
  } else if (w < breed.idealWeightMin) {
    const deficit = (breed.idealWeightMin - w) / breed.idealWeightMin;
    weightScore = Math.max(0, 1 - deficit * 2);
  } else {
    const excess = (w - breed.idealWeightMax) / breed.idealWeightMax;
    weightScore = Math.max(0, 1 - excess * 2.5);
  }

  // No history yet → neutral trend
  const weightTrend = 0.5;
  return clamp(bcsScore * 0.4 + weightScore * 0.4 + weightTrend * 0.2);
}

function computeNutritionFactor(pet) {
  // Phase-1 pure: no meal history → start neutral-to-good
  // Later meal logs will raise/lower this via recompute signals
  return 0.68;
}

function computeAgeHealthFactor(pet, breed) {
  const ageYears = getAgeYears(pet.dateOfBirth);
  const lifePct = ageYears / breed.avgLifespanYears;

  let ageScore;
  if (lifePct < 0.25) ageScore = 0.95;
  else if (lifePct < 0.50) ageScore = 0.85;
  else if (lifePct < 0.75) ageScore = 0.70;
  else if (lifePct < 1.0) ageScore = 0.55;
  else ageScore = 0.40;

  return clamp(ageScore);
}

function computePreventiveCareFactor(pet) {
  // No vet records in pure mode yet → conservative baseline
  return 0.55;
}

function computeActivityFactor(pet, breed) {
  // No wearable/activity logs yet → breed-aware neutral
  return 0.65;
}

function scoreLabel(score) {
  if (score >= 900) return "Exceptional";
  if (score >= 750) return "Excellent";
  if (score >= 600) return "Good";
  if (score >= 400) return "Fair";
  if (score >= 200) return "At Risk";
  return "Critical";
}

function buildBreakdown(factors, weights, pet, breed) {
  const labels = {
    genetic: "Genetic Baseline",
    bodyCondition: "Body Condition",
    nutritionQuality: "Nutrition Quality",
    ageHealth: "Age & Health",
    preventiveCare: "Preventive Care",
    activityLevel: "Activity Level",
  };

  const details = {
    genetic: factors.genetic >= 0.8
      ? "Breed has fewer genetic predispositions than average"
      : factors.genetic >= 0.5
        ? "Some breed-specific risks to monitor"
        : "Breed has elevated genetic risk factors",
    bodyCondition: factors.bodyCondition >= 0.8
      ? "Weight and body condition are in ideal range"
      : factors.bodyCondition >= 0.5
        ? "Slightly outside ideal weight range"
        : "Weight management recommended",
    nutritionQuality: "Diet completeness will improve as meals are logged",
    ageHealth: factors.ageHealth >= 0.8
      ? "Healthy for age and breed"
      : factors.ageHealth >= 0.5
        ? "Age-appropriate health"
        : "Senior health considerations apply",
    preventiveCare: "Add vet records and vaccination history to raise this factor",
    activityLevel: "Activity tracking or wearable data will refine this score",
  };

  const suggestions = {
    bodyCondition: pet.bodyCondition > 5.5
      ? "Aim for BCS 4–5. Small daily calorie reductions compound."
      : pet.bodyCondition < 4
        ? "Slight underweight — review caloric density and meal frequency."
        : "Maintain current BCS; re-check monthly.",
    nutritionQuality: "Log meals for 7 days to unlock precision nutrition scoring.",
    preventiveCare: "Schedule or log an annual wellness checkup.",
    activityLevel: `Target ~${breed.dailyExerciseMinutes} active minutes daily for this breed.`,
  };

  const breakdown = [];
  for (const [key, weight] of Object.entries(weights)) {
    const factorScore = factors[key] ?? 0;
    const improvable = !["genetic", "ageHealth"].includes(key);
    breakdown.push({
      factor: key,
      label: labels[key] || key,
      score: Math.round(factorScore * 100),
      weight,
      contribution: Number((factorScore * weight).toFixed(3)),
      detail: details[key] || "Calculated from available data",
      improvable,
      suggestion: improvable && factorScore < 0.7 ? suggestions[key] : undefined,
    });
  }
  return breakdown.sort((a, b) => b.contribution - a.contribution);
}

/**
 * Pure Phase-1 Longevity Score
 * Returns 0–999 score + full factor breakdown based only on pet attributes.
 */
function computePureScore(pet) {
  const breed = getBreedProfile(pet.species, pet.breed);
  const weights = WEIGHTS_PHASE_1;

  const factors = {
    genetic: computeGeneticFactor(pet, breed),
    bodyCondition: computeBodyConditionFactor(pet, breed),
    nutritionQuality: computeNutritionFactor(pet),
    ageHealth: computeAgeHealthFactor(pet, breed),
    preventiveCare: computePreventiveCareFactor(pet),
    activityLevel: computeActivityFactor(pet, breed),
  };

  let raw = 0;
  for (const [key, weight] of Object.entries(weights)) {
    raw += (factors[key] ?? 0) * weight;
  }

  const score = Math.round(clamp(raw) * 999);
  const breakdown = buildBreakdown(factors, weights, pet, breed);

  // Approximate percentile from score magnitude (real population later)
  const percentile = Math.max(5, Math.min(98, Math.round((score / 999) * 92 + 4)));

  return {
    id: id("score"),
    petId: pet.id,
    score,
    factors,
    breakdown,
    percentile,
    label: scoreLabel(score),
    algorithmVersion: "pure-v1.0",
    computedAt: now(),
  };
}

// ─────────────────────────────────────────────
// NUTRITION (NRC-style)
// ─────────────────────────────────────────────

function computeDailyCalories(pet) {
  const weight = pet.weightKg || 10;
  const rer = 70 * Math.pow(weight, 0.75);
  const ageYears = getAgeYears(pet.dateOfBirth);
  let multiplier;

  if (pet.species === "DOG") {
    if (ageYears < 0.33) multiplier = 3.0;
    else if (ageYears < 1) multiplier = 2.0;
    else if (pet.neutered) multiplier = 1.6;
    else multiplier = 1.8;
  } else {
    if (ageYears < 1) multiplier = 2.5;
    else if (pet.neutered) multiplier = 1.2;
    else multiplier = 1.4;
  }

  const bcs = pet.bodyCondition || 5;
  if (bcs >= 8) multiplier *= 0.7;
  else if (bcs >= 6) multiplier *= 0.85;
  else if (bcs <= 2) multiplier *= 1.25;
  else if (bcs <= 3) multiplier *= 1.10;

  const seniorAge = pet.species === "DOG" ? 7 : 10;
  if (ageYears > seniorAge) multiplier *= 0.9;

  return Math.round(rer * multiplier);
}

// ─────────────────────────────────────────────
// DATA STORE
// ─────────────────────────────────────────────

const makePet = ({
  id: petId,
  userId = "demo-user",
  name,
  species,
  breed,
  sex,
  weightKg,
  bodyCondition,
  dateOfBirth,
  neutered = true,
}) => ({
  id: petId,
  userId,
  name,
  species,
  breed,
  dateOfBirth: dateOfBirth || new Date(2022, 3, 12).toISOString(),
  sex,
  neutered,
  weightKg,
  bodyCondition,
  createdAt: now(),
  updatedAt: now(),
});

const pets = [
  makePet({
    id: "pet_luna",
    name: "Luna",
    species: "DOG",
    breed: "Labrador Retriever",
    sex: "FEMALE",
    weightKg: 27.4,
    bodyCondition: 5,
    dateOfBirth: new Date(2021, 5, 10).toISOString(),
  }),
  makePet({
    id: "pet_milo",
    name: "Milo",
    species: "CAT",
    breed: "Domestic Shorthair",
    sex: "MALE",
    weightKg: 4.8,
    bodyCondition: 5,
    dateOfBirth: new Date(2020, 8, 3).toISOString(),
  }),
];

const scoresByPet = new Map();
const planByPet = new Map();
const mealsByPet = new Map();
const biomarkerSetsByPet = new Map();

const foods = [
  { id: "food_1", brand: "ANIMA", productName: "Omega Core Kibble", type: "KIBBLE", species: "DOG", caloriesPer100g: 355 },
  { id: "food_2", brand: "ANIMA", productName: "Lean Mobility Formula", type: "KIBBLE", species: "DOG", caloriesPer100g: 330 },
  { id: "food_3", brand: "FreshPaws", productName: "Turkey Balance Bowl", type: "WET", species: "DOG", caloriesPer100g: 122 },
  { id: "food_4", brand: "ANIMA", productName: "Renal Support Stew", type: "WET", species: "CAT", caloriesPer100g: 110 },
  { id: "food_5", brand: "BlueTail", productName: "Wild Salmon Mousse", type: "WET", species: "CAT", caloriesPer100g: 104 },
  { id: "food_6", brand: "ANIMA", productName: "Joint Active Soft Chews", type: "TREAT", species: "DOG", caloriesPer100g: 390 },
  { id: "food_7", brand: "ANIMA", productName: "Hydration Broth", type: "SUPPLEMENT", species: "CAT", caloriesPer100g: 45 },
  { id: "food_8", brand: "WholeCompanion", productName: "Sensitive Stomach Blend", type: "KIBBLE", species: "DOG", caloriesPer100g: 348 },
];

function createPlanForPet(pet) {
  const dailyCalories = computeDailyCalories(pet);
  const dog = pet.species === "DOG";
  const primary = foods.find((f) => f.species === pet.species && f.type !== "TREAT") || foods[0];
  const primaryShare = 0.85;
  const primaryCalories = Math.round(dailyCalories * primaryShare);
  const primaryGrams = Math.round((primaryCalories / (primary.caloriesPer100g || 300)) * 100);

  const mealCount = dog ? 2 : 3;
  const perMealCal = Math.round(primaryCalories / mealCount);
  const perMealGrams = Math.round(primaryGrams / mealCount);

  const timings = dog ? ["7:00 AM", "6:00 PM"] : ["7:00 AM", "12:30 PM", "6:30 PM"];
  const types = dog ? ["BREAKFAST", "DINNER"] : ["BREAKFAST", "SNACK", "DINNER"];

  const meals = timings.map((timing, i) => ({
    type: types[i],
    foods: [{
      foodId: primary.id,
      name: primary.productName,
      brand: primary.brand,
      amountGrams: perMealGrams,
      calories: perMealCal,
    }],
    totalCalories: perMealCal,
    timing,
  }));

  // Optional treat allowance
  const treat = foods.find((f) => f.species === pet.species && f.type === "TREAT");
  if (treat && dog) {
    const snackCal = Math.round(dailyCalories * 0.12);
    meals.push({
      type: "SNACK",
      foods: [{
        foodId: treat.id,
        name: treat.productName,
        brand: treat.brand,
        amountGrams: Math.round((snackCal / treat.caloriesPer100g) * 100),
        calories: snackCal,
      }],
      totalCalories: snackCal,
      timing: "2:00 PM",
    });
  }

  const breed = getBreedProfile(pet.species, pet.breed);
  const supplements = [];
  if (breed.geneticRisks.includes("hip_dysplasia") || breed.geneticRisks.includes("joint_disease")) {
    supplements.push({
      name: "Glucosamine + Chondroitin",
      dose: `${Math.round((pet.weightKg || 10) * 20)} mg glucosamine`,
      frequency: "Daily",
      reason: "Breed joint risk mitigation",
      priority: "recommended",
    });
  }
  if (dog) {
    supplements.push({
      name: "Omega-3 Fish Oil (EPA/DHA)",
      dose: `${Math.round((pet.weightKg || 10) * 50)} mg`,
      frequency: "Daily",
      reason: "Anti-inflammatory support & coat health",
      priority: "recommended",
    });
  } else {
    supplements.push({
      name: "Hydration Support Broth",
      dose: "30–50 mL",
      frequency: "Daily",
      reason: "Cats often under-drink; supports kidney markers",
      priority: "recommended",
    });
  }

  const notes = [
    `Target ${dailyCalories} kcal/day based on current weight, age, and BCS.`,
    "Keep feeding windows consistent for metabolic stability.",
  ];
  if ((pet.bodyCondition || 5) >= 6) {
    notes.push("Weight management active — caloric intake set for gradual loss of ~1% body weight per week.");
  }
  if (breed.nutritionNotes?.length) {
    notes.push(...breed.nutritionNotes.slice(0, 2));
  }

  return {
    petId: pet.id,
    dailyCalories,
    dailyProteinG: dog ? Math.round(dailyCalories * 0.25 / 4) : Math.round(dailyCalories * 0.35 / 4),
    dailyFatG: dog ? Math.round(dailyCalories * 0.14 / 9) : Math.round(dailyCalories * 0.15 / 9),
    dailyFiberG: dog ? Math.round((pet.weightKg || 10) * 0.5) : Math.round((pet.weightKg || 4) * 0.3),
    meals,
    supplements,
    notes,
    hydrationTargetMl: Math.round((pet.weightKg || 10) * (dog ? 50 : 60)),
    generatedAt: now(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function ensurePetData(petId) {
  if (!mealsByPet.has(petId)) mealsByPet.set(petId, []);
  if (!biomarkerSetsByPet.has(petId)) biomarkerSetsByPet.set(petId, []);
}

// Seed scores & plans with pure engine
for (const pet of pets) {
  const score = computePureScore(pet);
  scoresByPet.set(pet.id, [score]);
  planByPet.set(pet.id, createPlanForPet(pet));
  ensurePetData(pet.id);
}

const latestScore = (petId) => {
  const history = scoresByPet.get(petId) || [];
  if (history.length) return history[history.length - 1];
  const pet = pets.find((p) => p.id === petId);
  if (pet) {
    const s = computePureScore(pet);
    scoresByPet.set(petId, [s]);
    return s;
  }
  return computePureScore({ id: petId, species: "DOG", breed: "mixed", weightKg: 15, bodyCondition: 5, dateOfBirth: new Date(2021, 0, 1).toISOString() });
};

const pushScore = (petId, nextScoreValue) => {
  const pet = pets.find((p) => p.id === petId);
  const base = pet ? computePureScore(pet) : latestScore(petId);
  // Allow external nudges (meal log, biocard) while keeping factor structure
  const next = {
    ...base,
    id: id("score"),
    score: Math.max(200, Math.min(999, nextScoreValue)),
    label: scoreLabel(Math.max(200, Math.min(999, nextScoreValue))),
    computedAt: now(),
  };
  const current = scoresByPet.get(petId) || [];
  current.push(next);
  scoresByPet.set(petId, current.slice(-24));
  return next;
};

const toPetWithScore = (pet) => ({
  ...pet,
  currentScore: latestScore(pet.id),
  twin: {
    id: id("twin"),
    petId: pet.id,
    healthTrajectory: "stable",
    riskPredictions: [],
    recommendations: (latestScore(pet.id).breakdown || [])
      .filter((b) => b.improvable && b.suggestion)
      .slice(0, 3)
      .map((b, i) => ({
        id: `rec_${i}`,
        type: b.factor === "nutritionQuality" ? "nutrition" : b.factor === "activityLevel" ? "activity" : "vet_visit",
        priority: b.score < 50 ? "high" : "medium",
        title: b.label,
        description: b.suggestion,
        action: b.factor,
        impact: `Could improve score contribution from this factor`,
      })),
    lastComputed: now(),
    dataCompleteness: 58,
  },
});

const buildBiomarkerTrends = (sets) => {
  const names = ["BUN", "CREATININE", "PH", "CORTISOL"];
  return names.map((name) => {
    const points = sets
      .slice(-8)
      .flatMap((set) => set.readings.filter((r) => r.name === name).map((r) => ({
        value: r.value,
        date: set.recordedAt,
        source: set.source,
      })));
    const first = points[0]?.value ?? 0;
    const last = points[points.length - 1]?.value ?? 0;
    let trend = "stable";
    if (last > first + 0.3) trend = "rising";
    if (last < first - 0.3) trend = "falling";
    return {
      name,
      unit: name === "PH" ? "pH" : "mg/dL",
      dataPoints: points,
      trend,
      velocity: Number((last - first).toFixed(2)),
    };
  });
};

const createBiocardResult = (petId) => {
  const readings = [
    { id: id("reading"), name: "BUN", value: 19.1, unit: "mg/dL", status: "NORMAL", confidence: 0.92 },
    { id: id("reading"), name: "CREATININE", value: 1.2, unit: "mg/dL", status: "NORMAL", confidence: 0.9 },
    { id: id("reading"), name: "PH", value: 6.6, unit: "pH", status: "NORMAL", confidence: 0.95 },
    { id: id("reading"), name: "CORTISOL", value: 5.8, unit: "ug/dL", status: "HIGH", confidence: 0.84 },
  ];

  const biomarkerSet = {
    id: id("set"),
    petId,
    source: "BIOCARD",
    sourceRef: `BC-${Math.floor(1000 + Math.random() * 9000)}`,
    readings,
    scanQuality: 0.91,
    recordedAt: now(),
  };

  const existing = biomarkerSetsByPet.get(petId) || [];
  existing.push(biomarkerSet);
  biomarkerSetsByPet.set(petId, existing.slice(-20));

  const current = latestScore(petId).score;
  const updatedScore = pushScore(petId, Math.min(999, current + 8));
  return {
    biomarkers: biomarkerSet,
    updatedScore,
    scanQuality: biomarkerSet.scanQuality,
    warnings: ["Cortisol is elevated relative to baseline. Recheck in 3–5 days."],
  };
};

// ─────────────────────────────────────────────
// HTTP SERVER
// ─────────────────────────────────────────────

const json = (res, status, payload) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform, X-App-Version",
  });
  res.end(JSON.stringify(payload));
};

const ok = (res, data, status = 200) => json(res, status, { success: true, data });
const fail = (res, status, code, message) => json(res, status, { success: false, error: { code, message } });

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
};

const match = (pathname, regex) => {
  const out = pathname.match(regex);
  return out ? out.slice(1) : null;
};

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const { pathname, searchParams } = url;

  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  if (pathname === "/health") {
    ok(res, { status: "ok", timestamp: now(), engine: "pure-v1.0" });
    return;
  }

  if (pathname === "/pets" && req.method === "GET") {
    ok(res, pets.map(toPetWithScore));
    return;
  }

  if (pathname === "/pets" && req.method === "POST") {
    const body = await parseBody(req);
    if (!body.name || !body.species || !body.breed) {
      fail(res, 400, "VALIDATION_ERROR", "name, species, and breed are required.");
      return;
    }

    const pet = makePet({
      id: id("pet"),
      name: body.name,
      species: body.species,
      breed: body.breed,
      sex: body.sex || "MALE",
      weightKg: Number(body.weightKg || 8),
      bodyCondition: Number(body.bodyCondition || 5),
      dateOfBirth: body.dateOfBirth || new Date(Date.now() - 3 * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
      neutered: body.neutered !== false,
    });

    pets.push(pet);
    const initialScore = computePureScore(pet);
    scoresByPet.set(pet.id, [initialScore]);
    planByPet.set(pet.id, createPlanForPet(pet));
    ensurePetData(pet.id);
    ok(res, toPetWithScore(pet), 201);
    return;
  }

  const petIdMatch = match(pathname, /^\/pets\/([^/]+)$/);
  if (petIdMatch && req.method === "GET") {
    const [petId] = petIdMatch;
    const pet = pets.find((entry) => entry.id === petId);
    if (!pet) {
      fail(res, 404, "NOT_FOUND", "Pet not found");
      return;
    }
    ok(res, toPetWithScore(pet));
    return;
  }

  const scoreMatch = match(pathname, /^\/pets\/([^/]+)\/score$/);
  if (scoreMatch && req.method === "GET") {
    ok(res, latestScore(scoreMatch[0]));
    return;
  }

  const scoreHistoryMatch = match(pathname, /^\/pets\/([^/]+)\/score\/history$/);
  if (scoreHistoryMatch && req.method === "GET") {
    ok(res, scoresByPet.get(scoreHistoryMatch[0]) || []);
    return;
  }

  const recomputeMatch = match(pathname, /^\/pets\/([^/]+)\/score\/recompute$/);
  if (recomputeMatch && req.method === "POST") {
    const petId = recomputeMatch[0];
    const pet = pets.find((p) => p.id === petId);
    if (!pet) {
      fail(res, 404, "NOT_FOUND", "Pet not found");
      return;
    }
    // Full recompute from current attributes (pure engine)
    const next = computePureScore(pet);
    const history = scoresByPet.get(petId) || [];
    history.push(next);
    scoresByPet.set(petId, history.slice(-24));
    ok(res, next);
    return;
  }

  const nutritionMatch = match(pathname, /^\/pets\/([^/]+)\/nutrition\/plan$/);
  if (nutritionMatch && req.method === "GET") {
    const [petId] = nutritionMatch;
    const pet = pets.find((entry) => entry.id === petId);
    if (!pet) {
      fail(res, 404, "NOT_FOUND", "Pet not found");
      return;
    }
    if (!planByPet.has(petId)) {
      planByPet.set(petId, createPlanForPet(pet));
    }
    ok(res, planByPet.get(petId));
    return;
  }

  const nutritionGenerateMatch = match(pathname, /^\/pets\/([^/]+)\/nutrition\/plan\/generate$/);
  if (nutritionGenerateMatch && req.method === "POST") {
    const [petId] = nutritionGenerateMatch;
    const pet = pets.find((entry) => entry.id === petId);
    if (!pet) {
      fail(res, 404, "NOT_FOUND", "Pet not found");
      return;
    }
    const plan = createPlanForPet(pet);
    plan.notes.push("Plan regenerated from latest pet attributes and breed profile.");
    planByPet.set(petId, plan);
    ok(res, plan);
    return;
  }

  const mealsMatch = match(pathname, /^\/pets\/([^/]+)\/meals$/);
  if (mealsMatch && req.method === "GET") {
    const [petId] = mealsMatch;
    const limit = Number(searchParams.get("limit") || 20);
    ensurePetData(petId);
    const history = mealsByPet.get(petId) || [];
    ok(res, history.slice(0, Math.max(1, limit)));
    return;
  }

  if (mealsMatch && req.method === "POST") {
    const [petId] = mealsMatch;
    const body = await parseBody(req);
    ensurePetData(petId);

    const items = Array.isArray(body.items) ? body.items : [];
    const totalCalories = items.reduce((sum, item) => sum + Number(item.calories || 0), 0);
    const meal = {
      id: id("meal"),
      petId,
      type: body.type || "SNACK",
      items,
      totalCalories,
      loggedAt: now(),
    };

    const existing = mealsByPet.get(petId) || [];
    existing.unshift(meal);
    mealsByPet.set(petId, existing.slice(0, 80));

    // Small positive nudge for engagement
    const current = latestScore(petId).score;
    pushScore(petId, Math.max(200, Math.min(999, current + 2)));
    ok(res, meal, 201);
    return;
  }

  const biocardMatch = match(pathname, /^\/pets\/([^/]+)\/biocard\/scan$/);
  if (biocardMatch && req.method === "POST") {
    const result = createBiocardResult(biocardMatch[0]);
    ok(res, result, 201);
    return;
  }

  const biomarkersMatch = match(pathname, /^\/pets\/([^/]+)\/biomarkers$/);
  if (biomarkersMatch && req.method === "GET") {
    const [petId] = biomarkersMatch;
    ensurePetData(petId);
    const sets = biomarkerSetsByPet.get(petId) || [];
    ok(res, { sets, trends: buildBiomarkerTrends(sets) });
    return;
  }

  const environmentMatch = match(pathname, /^\/pets\/([^/]+)\/environment$/);
  if (environmentMatch && req.method === "GET") {
    ok(res, {
      overallRiskLevel: "moderate",
      risks: [
        { title: "Air Quality (PM2.5)", score: 56, level: "elevated", detail: "Outdoor exercise should be shorter today." },
        { title: "Heat Stress", score: 39, level: "moderate", detail: "Hydration and shade recommended after noon." },
      ],
      actionItems: [
        "Shift walk/play windows to morning and evening.",
        "Increase hydration by 10% for the next 24 hours.",
      ],
    });
    return;
  }

  const careMatch = match(pathname, /^\/pets\/([^/]+)\/care\/timeline$/);
  if (careMatch && req.method === "GET") {
    ok(res, [
      { title: "Dental Check", dueDate: "2026-09-12", priority: "due_soon", detail: "Annual oral health exam." },
      { title: "Weight Recheck", dueDate: "2026-09-20", priority: "normal", detail: "Trend follow-up for score optimization." },
      { title: "BioCard Follow-up", dueDate: "2026-09-27", priority: "normal", detail: "Retest cortisol signal for stability." },
    ]);
    return;
  }

  const behaviorMatch = match(pathname, /^\/pets\/([^/]+)\/behavioral\/insights$/);
  if (behaviorMatch && req.method === "GET") {
    ok(res, [
      {
        signal: "Night restlessness increased by 18%",
        recommendation: "Move last meal 90 minutes earlier and add a short evening decompression walk.",
        confidence: 0.82,
        healthRelevance: "high",
      },
      {
        signal: "Hydration trend stable",
        recommendation: "Current water intake supports kidney markers. Keep bowl refresh cadence.",
        confidence: 0.76,
        healthRelevance: "medium",
      },
    ]);
    return;
  }

  const foodAlertMatch = match(pathname, /^\/pets\/([^/]+)\/food\/alerts$/);
  if (foodAlertMatch && req.method === "GET") {
    ok(res, [
      {
        title: "Ingredient mismatch risk",
        detail: "Recent logs include two protein bases in the same day. Watch stool tolerance.",
        severity: "moderate",
      },
    ]);
    return;
  }

  const photoVitalsMatch = match(pathname, /^\/pets\/([^/]+)\/photo-vitals$/);
  if (photoVitalsMatch && req.method === "POST") {
    ok(res, {
      bodyConditionScore: 5,
      bcsConfidence: 0.88,
      coatQuality: { overallScore: 84 },
      eyeHealth: { clarity: 91 },
      recommendations: [
        "Keep coat-support omega source consistent for 14 days.",
        "Retake photo in natural light for better trend stability.",
      ],
    });
    return;
  }

  if (pathname === "/foods/search" && req.method === "GET") {
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const species = (searchParams.get("species") || "").toUpperCase();
    const results = foods.filter((item) => {
      const speciesMatch = !species || item.species === species;
      if (!speciesMatch) return false;
      if (!q) return true;
      const haystack = `${item.brand} ${item.productName} ${item.type}`.toLowerCase();
      return haystack.includes(q);
    });
    ok(res, results.slice(0, 30));
    return;
  }

  fail(res, 404, "NOT_FOUND", `No mock route for ${req.method} ${pathname}`);
}).listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock-api] pure-v1.0 listening on http://localhost:${PORT}`);
});

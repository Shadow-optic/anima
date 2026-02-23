import {createServer} from "node:http";

const PORT = Number(process.env.PORT || 4010);

const id = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

const scoreLabel = (score) => {
  if (score >= 900) return "Exceptional";
  if (score >= 750) return "Excellent";
  if (score >= 600) return "Good";
  if (score >= 400) return "Fair";
  if (score >= 200) return "At Risk";
  return "Critical";
};

const createBreakdown = (score) => {
  const base = Math.max(30, Math.min(98, Math.round(score / 10)));
  return [
    { factor: "genetic", label: "Genetic Baseline", score: base + 4, weight: 0.25, contribution: 0.22, detail: "Breed baseline and inherited risk context.", improvable: false },
    { factor: "bodyCondition", label: "Body Condition", score: base - 2, weight: 0.2, contribution: 0.16, detail: "Weight and BCS relative to ideal range.", improvable: true, suggestion: "Keep BCS between 4 and 5." },
    { factor: "nutritionQuality", label: "Nutrition Quality", score: base - 1, weight: 0.2, contribution: 0.16, detail: "Macro and micronutrient completeness.", improvable: true, suggestion: "Maintain consistent meal quality." },
    { factor: "ageHealth", label: "Age-Adjusted Health", score: base + 1, weight: 0.15, contribution: 0.12, detail: "Health compared to breed-age peers.", improvable: true, suggestion: "Continue preventive checks." },
    { factor: "preventiveCare", label: "Preventive Care", score: base, weight: 0.1, contribution: 0.08, detail: "Vaccines, dental, and scheduled checkups.", improvable: true, suggestion: "Keep timeline events on schedule." },
    { factor: "activityLevel", label: "Activity", score: base - 3, weight: 0.1, contribution: 0.07, detail: "Movement against species targets.", improvable: true, suggestion: "Add one extra play/exercise block daily." },
  ].map((entry) => ({ ...entry, score: Math.max(20, Math.min(100, entry.score)) }));
};

const createScore = (petId, score) => ({
  id: id("score"),
  petId,
  score,
  factors: {
    genetic: 0.8,
    bodyCondition: 0.7,
    nutritionQuality: 0.72,
    ageHealth: 0.74,
    preventiveCare: 0.68,
    activityLevel: 0.7,
  },
  breakdown: createBreakdown(score),
  percentile: Math.max(5, Math.min(99, Math.round((score / 999) * 100))),
  label: scoreLabel(score),
  algorithmVersion: "mock-v1",
  computedAt: now(),
});

const makePet = ({
  id: petId,
  userId = "demo-user",
  name,
  species,
  breed,
  sex,
  weightKg,
  bodyCondition,
}) => ({
  id: petId,
  userId,
  name,
  species,
  breed,
  dateOfBirth: new Date(2022, 3, 12).toISOString(),
  sex,
  neutered: true,
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
  }),
  makePet({
    id: "pet_milo",
    name: "Milo",
    species: "CAT",
    breed: "Domestic Shorthair",
    sex: "MALE",
    weightKg: 4.8,
    bodyCondition: 5,
  }),
];

const scoresByPet = new Map([
  ["pet_luna", [createScore("pet_luna", 742), createScore("pet_luna", 755), createScore("pet_luna", 771)]],
  ["pet_milo", [createScore("pet_milo", 695), createScore("pet_milo", 708)]],
]);

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

const planByPet = new Map();
const mealsByPet = new Map();
const biomarkerSetsByPet = new Map();

const createPlanForPet = (pet) => {
  const dog = pet.species === "DOG";
  const dailyCalories = dog ? 1250 : 260;
  const primary = foods.filter((f) => f.species === pet.species && f.type !== "TREAT")[0];

  const meals = dog
    ? [
        {
          type: "BREAKFAST",
          foods: [{ foodId: primary.id, name: primary.productName, brand: primary.brand, amountGrams: 170, calories: 604 }],
          totalCalories: 604,
          timing: "7:00 AM",
        },
        {
          type: "DINNER",
          foods: [{ foodId: primary.id, name: primary.productName, brand: primary.brand, amountGrams: 170, calories: 604 }],
          totalCalories: 604,
          timing: "6:00 PM",
        },
      ]
    : [
        {
          type: "BREAKFAST",
          foods: [{ foodId: primary.id, name: primary.productName, brand: primary.brand, amountGrams: 80, calories: 88 }],
          totalCalories: 88,
          timing: "7:00 AM",
        },
        {
          type: "DINNER",
          foods: [{ foodId: primary.id, name: primary.productName, brand: primary.brand, amountGrams: 80, calories: 88 }],
          totalCalories: 88,
          timing: "6:00 PM",
        },
      ];

  return {
    petId: pet.id,
    dailyCalories,
    dailyProteinG: dog ? 80 : 28,
    dailyFatG: dog ? 42 : 15,
    dailyFiberG: dog ? 12 : 4,
    meals,
    supplements: [
      {
        name: dog ? "Omega-3 Fish Oil" : "Hydration Mineral Broth",
        dose: dog ? "1200 mg" : "30 mL",
        frequency: "Daily",
        reason: "Supports inflammatory balance and longevity trajectory.",
        priority: "recommended",
      },
    ],
    notes: [
      "Keep feeding windows consistent for metabolic stability.",
      "Monitor stool consistency and appetite as leading indicators.",
    ],
    hydrationTargetMl: dog ? 1400 : 300,
    generatedAt: now(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
};

const ensurePetData = (petId) => {
  if (!mealsByPet.has(petId)) {
    mealsByPet.set(petId, []);
  }
  if (!biomarkerSetsByPet.has(petId)) {
    biomarkerSetsByPet.set(petId, []);
  }
};

for (const pet of pets) {
  planByPet.set(pet.id, createPlanForPet(pet));
  ensurePetData(pet.id);
}

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

const latestScore = (petId) => {
  const history = scoresByPet.get(petId) || [];
  return history[history.length - 1] || createScore(petId, 650);
};

const pushScore = (petId, nextScoreValue) => {
  const current = scoresByPet.get(petId) || [];
  const next = createScore(petId, nextScoreValue);
  current.push(next);
  scoresByPet.set(petId, current.slice(-24));
  return next;
};

const buildBiomarkerTrends = (sets) => {
  const names = ["BUN", "CREATININE", "PH", "CORTISOL"];
  return names.map((name) => {
    const points = sets
      .slice(-8)
      .flatMap((set) => set.readings.filter((reading) => reading.name === name).map((reading) => ({
        value: reading.value,
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
    warnings: ["Cortisol is elevated relative to baseline. Recheck in 3-5 days."],
  };
};

const toPetWithScore = (pet) => ({
  ...pet,
  currentScore: latestScore(pet.id),
  twin: {
    id: id("twin"),
    petId: pet.id,
    healthTrajectory: "stable",
    riskPredictions: [],
    recommendations: [],
    lastComputed: now(),
    dataCompleteness: 62,
  },
});

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const { pathname, searchParams } = url;

  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  if (pathname === "/health") {
    ok(res, { status: "ok", timestamp: now() });
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
    });

    pets.push(pet);
    scoresByPet.set(pet.id, [createScore(pet.id, 640 + Math.floor(Math.random() * 80))]);
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
    const current = latestScore(petId).score;
    const delta = Math.floor(Math.random() * 11) - 3;
    const next = Math.max(300, Math.min(999, current + delta));
    ok(res, pushScore(petId, next));
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
    plan.notes.push("Plan regenerated from latest behavioral and biomarker context.");
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

    const current = latestScore(petId).score;
    pushScore(petId, Math.max(300, Math.min(999, current + 1)));
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
      { title: "Dental Check", dueDate: "2026-03-12", priority: "due_soon", detail: "Annual oral health exam." },
      { title: "Weight Recheck", dueDate: "2026-03-20", priority: "normal", detail: "Trend follow-up for score optimization." },
      { title: "BioCard Follow-up", dueDate: "2026-03-27", priority: "normal", detail: "Retest cortisol signal for stability." },
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
  console.log(`[mock-api] listening on http://localhost:${PORT}`);
});

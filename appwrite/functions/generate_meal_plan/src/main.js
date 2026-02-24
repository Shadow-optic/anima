function parseBody(req) {
  if (!req || req.body == null) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim().length > 0) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

async function appwriteRequest(path, method, body) {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    throw new Error('Missing Appwrite function environment variables for API access');
  }

  const base = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-appwrite-project': projectId,
      'x-appwrite-key': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Appwrite API ${response.status}: ${text}`);
  }

  return response.json();
}

async function getPetDocument(petId) {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'anima_db';
  const petsCollectionId = process.env.APPWRITE_PETS_COLLECTION_ID || 'pets';

  return appwriteRequest(
    `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(petsCollectionId)}/documents/${encodeURIComponent(petId)}`,
    'GET'
  );
}

async function storeMealPlanDocument(petId, plan) {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'anima_db';
  const plansCollectionId = process.env.APPWRITE_NUTRITION_COLLECTION_ID || 'nutrition_plans';

  return appwriteRequest(
    `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(plansCollectionId)}/documents`,
    'POST',
    {
      documentId: 'unique()',
      data: {
        petId,
        dailyCalories: plan.dailyCalories,
        meals: JSON.stringify(plan.meals),
        supplements: JSON.stringify(plan.supplements),
        hydrationTarget: plan.hydrationTarget,
        notes: JSON.stringify(plan.notes),
        generatedAt: plan.generatedAt,
        validUntil: plan.validUntil,
      },
    }
  );
}

function buildPlan(petId, pet) {
  const species = (pet?.species || 'DOG').toUpperCase();
  const weightKg = Number.isFinite(Number(pet?.weightKg)) ? Number(pet.weightKg) : 20;
  const rer = 70 * Math.pow(weightKg, 0.75);

  let multiplier = species === 'CAT' ? 1.4 : 1.6;
  if (Number.isFinite(Number(pet?.bodyCondition))) {
    const bcs = Number(pet.bodyCondition);
    if (bcs >= 7) multiplier *= 0.9;
    if (bcs <= 4) multiplier *= 1.08;
  }

  const dailyCalories = Math.max(150, Math.round(rer * multiplier));

  const meals = [
    {
      type: 'BREAKFAST',
      totalCalories: Math.round(dailyCalories * 0.45),
      foods: [
        {
          name: species === 'CAT' ? 'High-Protein Wet Food' : 'Complete Kibble',
          amountGrams: Math.round((dailyCalories * 0.45) / 3.6),
          calories: Math.round(dailyCalories * 0.45),
        },
      ],
    },
    {
      type: 'DINNER',
      totalCalories: Math.round(dailyCalories * 0.45),
      foods: [
        {
          name: species === 'CAT' ? 'Balanced Dry + Wet Blend' : 'Complete Kibble',
          amountGrams: Math.round((dailyCalories * 0.45) / 3.6),
          calories: Math.round(dailyCalories * 0.45),
        },
      ],
    },
    {
      type: 'SNACK',
      totalCalories: Math.round(dailyCalories * 0.1),
      foods: [
        {
          name: 'Low-calorie functional treats',
          amountGrams: Math.round((dailyCalories * 0.1) / 4.0),
          calories: Math.round(dailyCalories * 0.1),
        },
      ],
    },
  ];

  const supplements = [
    {
      name: 'Omega-3 (EPA/DHA)',
      dose: `${Math.round(weightKg * 45)} mg/day`,
      rationale: 'Supports skin, coat, and anti-inflammatory balance.',
    },
  ];

  const hydrationTarget = Math.round(weightKg * (species === 'CAT' ? 55 : 50));

  return {
    petId,
    dailyCalories,
    meals,
    supplements,
    hydrationTarget,
    notes: [
      'Split calories across at least two meals.',
      'Adjust portions weekly based on weight trend.',
      'Keep water available at all times.',
    ],
    generatedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

async function handler({ req, res, log, error }) {
  try {
    const payload = parseBody(req);
    const petId = payload.petId;

    if (!petId) {
      return res.json({ error: 'petId is required' }, 400);
    }

    let pet = payload.pet || null;
    if (!pet) {
      try {
        pet = await getPetDocument(petId);
      } catch (fetchError) {
        log(`Unable to fetch pet document, using fallback data: ${fetchError.message}`);
      }
    }

    const plan = buildPlan(petId, pet || {});

    let documentId = null;
    try {
      const stored = await storeMealPlanDocument(petId, plan);
      documentId = stored.$id || null;
    } catch (storeError) {
      log(`Unable to persist meal plan: ${storeError.message}`);
    }

    return res.json({ ...plan, documentId }, 200);
  } catch (err) {
    error(`generate_meal_plan failed: ${err.message}`);
    return res.json({ error: err.message || 'Unexpected error' }, 500);
  }
}

module.exports = handler;
module.exports.default = handler;

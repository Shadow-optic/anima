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

function seededValue(seed, min, max) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return min + normalized * (max - min);
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

async function storeScoreDocument(petId, result) {
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'anima_db';
  const scoresCollectionId = process.env.APPWRITE_LONGEVITY_COLLECTION_ID || 'longevity_scores';

  return appwriteRequest(
    `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(scoresCollectionId)}/documents`,
    'POST',
    {
      documentId: 'unique()',
      data: {
        petId,
        score: result.score,
        factors: JSON.stringify(result.factors),
        breakdown: JSON.stringify(result.breakdown),
        percentile: result.percentile,
        label: result.label,
        algorithmVersion: result.algorithmVersion,
        computedAt: new Date().toISOString(),
      },
    }
  );
}

function buildScoreResult(petId, pet) {
  const seed = `${petId}:${pet?.species || 'PET'}:${pet?.breed || 'unknown'}`;
  const bodyCondition = Number.isFinite(Number(pet?.bodyCondition)) ? Number(pet.bodyCondition) : 5;

  const factors = {
    genetic: seededValue(`${seed}:genetic`, 0.62, 0.9),
    bodyCondition: Math.max(0.45, Math.min(0.95, 0.88 - Math.abs(bodyCondition - 5) * 0.07)),
    nutritionQuality: seededValue(`${seed}:nutrition`, 0.6, 0.92),
    ageHealth: seededValue(`${seed}:age`, 0.55, 0.88),
    preventiveCare: seededValue(`${seed}:preventive`, 0.52, 0.9),
    activityLevel: seededValue(`${seed}:activity`, 0.58, 0.93),
    biomarkerHealth: seededValue(`${seed}:biomarker`, 0.5, 0.9),
    trajectory: seededValue(`${seed}:trajectory`, 0.5, 0.88),
  };

  const weights = {
    genetic: 0.15,
    bodyCondition: 0.12,
    nutritionQuality: 0.15,
    ageHealth: 0.08,
    preventiveCare: 0.08,
    activityLevel: 0.1,
    biomarkerHealth: 0.2,
    trajectory: 0.12,
  };

  let weighted = 0;
  Object.keys(weights).forEach((key) => {
    weighted += factors[key] * weights[key];
  });

  const score = Math.round(weighted * 999);
  const breakdown = Object.keys(weights)
    .map((key) => ({
      factor: key,
      score: Math.round(factors[key] * 100),
      weight: weights[key],
      contribution: factors[key] * weights[key],
    }))
    .sort((a, b) => b.contribution - a.contribution);

  return {
    petId,
    score,
    factors,
    weights,
    breakdown,
    percentile: Math.max(1, Math.min(99, Math.round((score / 999) * 100))),
    label: score >= 750 ? 'Excellent' : score >= 600 ? 'Good' : score >= 400 ? 'Fair' : 'At Risk',
    algorithmVersion: 'v1.0.0',
    computedAt: new Date().toISOString(),
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

    const result = buildScoreResult(petId, pet || {});

    let documentId = null;
    try {
      const stored = await storeScoreDocument(petId, result);
      documentId = stored.$id || null;
    } catch (storeError) {
      log(`Unable to persist longevity score: ${storeError.message}`);
    }

    return res.json({ ...result, documentId }, 200);
  } catch (err) {
    error(`compute_longevity_score failed: ${err.message}`);
    return res.json({ error: err.message || 'Unexpected error' }, 500);
  }
}

module.exports = handler;
module.exports.default = handler;

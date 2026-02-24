/**
 * Appwrite Function: Compute Longevity Score
 * 
 * Triggered by: App request or scheduled job
 * Input: { petId: string }
 * Output: { score: 0-999, factors, breakdown, percentile, label }
 * 
 * Stores result in Appwrite collection: longevity_scores
 */

import { Client, Databases } from 'appwrite';

// Import the scoring engine (will be bundled with function)
// In production, this would be imported from the same codebase
async function computeScore(pet: any, petId: string, database: any, project: string) {
  // Stub implementation - in production, this would call the actual engine
  // For now, returning a basic score structure that Appwrite Functions can use
  
  const factors = {
    genetic: 0.75,
    bodyCondition: 0.80,
    nutritionQuality: 0.85,
    ageHealth: 0.70,
    preventiveCare: 0.65,
    activityLevel: 0.88,
    biomarkerHealth: 0.72,
    trajectory: 0.68,
  };

  const weights = {
    genetic: 0.15,
    bodyCondition: 0.12,
    nutritionQuality: 0.15,
    ageHealth: 0.08,
    preventiveCare: 0.08,
    activityLevel: 0.10,
    biomarkerHealth: 0.20,
    trajectory: 0.12,
  };

  let rawScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const factorKey = key as keyof typeof factors;
    rawScore += (factors[factorKey] || 0) * weight;
  }

  const score = Math.round(rawScore * 999);

  const breakdown = [
    {
      factor: 'genetic',
      score: Math.round(factors.genetic * 100),
      weight: weights.genetic,
      contribution: factors.genetic * weights.genetic,
      label: 'Genetic Baseline',
      detail: 'Breed genetic predispositions',
      improvable: false,
    },
    {
      factor: 'bodyCondition',
      score: Math.round(factors.bodyCondition * 100),
      weight: weights.bodyCondition,
      contribution: factors.bodyCondition * weights.bodyCondition,
      label: 'Body Condition',
      detail: 'Weight and BCS status',
      improvable: true,
    },
    {
      factor: 'nutritionQuality',
      score: Math.round(factors.nutritionQuality * 100),
      weight: weights.nutritionQuality,
      contribution: factors.nutritionQuality * weights.nutritionQuality,
      label: 'Nutrition Quality',
      detail: 'Diet completeness and balance',
      improvable: true,
    },
    {
      factor: 'ageHealth',
      score: Math.round(factors.ageHealth * 100),
      weight: weights.ageHealth,
      contribution: factors.ageHealth * weights.ageHealth,
      label: 'Age & Health',
      detail: 'Age-adjusted health position',
      improvable: false,
    },
    {
      factor: 'preventiveCare',
      score: Math.round(factors.preventiveCare * 100),
      weight: weights.preventiveCare,
      contribution: factors.preventiveCare * weights.preventiveCare,
      label: 'Preventive Care',
      detail: 'Vaccination and checkup adherence',
      improvable: true,
    },
    {
      factor: 'activityLevel',
      score: Math.round(factors.activityLevel * 100),
      weight: weights.activityLevel,
      contribution: factors.activityLevel * weights.activityLevel,
      label: 'Activity Level',
      detail: 'Exercise relative to breed needs',
      improvable: true,
    },
    {
      factor: 'biomarkerHealth',
      score: Math.round(factors.biomarkerHealth * 100),
      weight: weights.biomarkerHealth,
      contribution: factors.biomarkerHealth * weights.biomarkerHealth,
      label: 'Biomarker Health',
      detail: 'Lab results and health markers',
      improvable: true,
    },
    {
      factor: 'trajectory',
      score: Math.round(factors.trajectory * 100),
      weight: weights.trajectory,
      contribution: factors.trajectory * weights.trajectory,
      label: 'Health Trajectory',
      detail: 'Trend direction over time',
      improvable: true,
    },
  ];

  return {
    score,
    factors,
    weights,
    breakdown: breakdown.sort((a, b) => b.contribution - a.contribution),
    percentile: Math.floor(Math.random() * 100), // Placeholder
    label: score >= 750 ? 'Excellent' : score >= 600 ? 'Good' : score >= 400 ? 'Fair' : 'At Risk',
    algorithmVersion: 'v1.0',
  };
}

export default async function handler(req: any, res: any) {
  const client = new Client();
  const database = new Databases(client);

  // Initialize Appwrite client
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://appwrite/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || 'anima_project')
    .setKey(process.env.APPWRITE_API_KEY || '');

  try {
    const payload = req.body ? JSON.parse(req.body) : {};
    const { petId } = payload;

    if (!petId) {
      return res.json({ error: 'petId required' }, 400);
    }

    console.log(`Computing score for pet: ${petId}`);

    // Fetch pet data
    const pet = await database.getDocument('anima_db', 'pets', petId);

    // Fetch related data
    const mealsResponse = await database.listDocuments('anima_db', 'meals', [
      `query.equal("petId", "${petId}")`,
    ]);

    const biomarkersResponse = await database.listDocuments('anima_db', 'biomarkers', [
      `query.equal("petId", "${petId}")`,
    ]);

    const vetRecordsResponse = await database.listDocuments('anima_db', 'vet_records', [
      `query.equal("petId", "${petId}")`,
    ]);

    // Compute score using the engine
    const result = await computeScore(
      {
        ...pet,
        meals: mealsResponse.documents,
        biomarkerSets: biomarkersResponse.documents,
        vetRecords: vetRecordsResponse.documents,
      },
      petId,
      database,
      process.env.APPWRITE_PROJECT_ID || 'anima_project'
    );

    // Save result to Appwrite
    const scoreDocument = await database.createDocument(
      'anima_db',
      'longevity_scores',
      'unique()',
      {
        petId,
        score: result.score,
        factors: JSON.stringify(result.factors),
        breakdown: JSON.stringify(result.breakdown),
        percentile: result.percentile,
        label: result.label,
        algorithmVersion: result.algorithmVersion,
        computedAt: new Date().toISOString(),
      }
    );

    console.log(`Score ${result.score} saved for pet ${petId}`);

    return res.json({
      ...result,
      documentId: scoreDocument.$id,
    });
  } catch (error: any) {
    console.error('Score computation failed:', error);
    return res.json({ error: error.message }, 500);
  }
}

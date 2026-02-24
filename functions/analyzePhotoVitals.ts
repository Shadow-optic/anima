/**
 * Appwrite Function: Analyze Photo Vitals
 * 
 * Triggered by: User uploads pet photo
 * Input: { petId: string, imageBase64: string }
 * Output: { bodyConditionScore, coatQuality, eyeHealth, recommendations[] }
 * 
 * Stores result in Appwrite collection: photo_vitals
 */

import { Client, Databases } from 'appwrite';

async function analyzePhotoVitals(petId: string, imageBase64: string, pet: any, database: any) {
  // In production, this would call an ML inference service
  // For now, returning synthetic analysis data

  const coatQuality = {
    overallScore: 75 + Math.random() * 25,
    sheen: 70 + Math.random() * 30,
    uniformity: 80 + Math.random() * 20,
    flags: [] as string[],
  };

  const eyeHealth = {
    clarity: 85 + Math.random() * 15,
    discharge: Math.random() > 0.8,
    redness: 5 + Math.random() * 20,
    symmetry: 90 + Math.random() * 10,
    thirdEyelidVisible: false,
  };

  const dentalIndicators = {
    tartarLevel: Math.floor(Math.random() * 3),
    gumColor: 'pink',
    gumColorConcern: false,
    visibleTeethCondition: 80 + Math.random() * 20,
  };

  const bodyConditionScore = 3 + Math.floor(Math.random() * 5); // 3-9 scale
  const emotionalState = {
    state: Math.random() > 0.5 ? 'relaxed' : 'alert',
    confidence: 0.7 + Math.random() * 0.25,
    signals: ['soft_eyes', 'relaxed_ears'],
  };

  const recommendations = [];

  if (coatQuality.overallScore < 70) {
    recommendations.push('Coat appears dry or dull. Consider omega-3 supplementation.');
  }

  if (eyeHealth.discharge) {
    recommendations.push('Minor eye discharge noted. Monitor and consult vet if persistent.');
  }

  if (bodyConditionScore > 6) {
    recommendations.push(`Body condition appears higher than logged BCS (${pet.bodyCondition}). Consider a weigh-in.`);
  }

  if (dentalIndicators.tartarLevel > 1) {
    recommendations.push('Tartar buildup detected. Professional cleaning may be beneficial.');
  }

  return {
    petId,
    bodyConditionScore: bodyConditionScore > 0 ? bodyConditionScore : null,
    bcsConfidence: 0.7,
    coatQuality,
    eyeHealth,
    dentalIndicators,
    emotionalState,
    recommendations,
    assessableRegions: ['face', 'eyes', 'torso', 'legs'],
    rawFeatures: {
      coat_sheen: coatQuality.sheen,
      coat_uniformity: coatQuality.uniformity,
      eye_clarity: eyeHealth.clarity,
      eye_redness: eyeHealth.redness,
      tartar_level: dentalIndicators.tartarLevel,
      emotional_valence: emotionalState.state === 'relaxed' ? 0.8 : 0.5,
    },
    timestamp: new Date().toISOString(),
  };
}

export default async function handler(req: any, res: any) {
  const client = new Client();
  const database = new Databases(client);

  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://appwrite/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || 'anima_project')
    .setKey(process.env.APPWRITE_API_KEY || '');

  try {
    const payload = req.body ? JSON.parse(req.body) : {};
    const { petId, imageBase64 } = payload;

    if (!petId || !imageBase64) {
      return res.json({ error: 'petId and imageBase64 required' }, 400);
    }

    console.log(`Analyzing photo vitals for pet: ${petId}`);

    // Fetch pet data
    const pet = await database.getDocument('anima_db', 'pets', petId);

    // Analyze photo (call ML service in production)
    const analysis = await analyzePhotoVitals(petId, imageBase64, pet, database);

    // Save to Appwrite
    const vitalDocument = await database.createDocument(
      'anima_db',
      'photo_vitals',
      'unique()',
      {
        petId,
        bodyConditionScore: analysis.bodyConditionScore,
        bcsConfidence: analysis.bcsConfidence,
        coatQuality: JSON.stringify(analysis.coatQuality),
        eyeHealth: JSON.stringify(analysis.eyeHealth),
        dentalIndicators: JSON.stringify(analysis.dentalIndicators),
        emotionalState: JSON.stringify(analysis.emotionalState),
        recommendations: JSON.stringify(analysis.recommendations),
        assessableRegions: JSON.stringify(analysis.assessableRegions),
        rawFeatures: JSON.stringify(analysis.rawFeatures),
        timestamp: analysis.timestamp,
      }
    );

    console.log(`Photo vitals analyzed and saved for pet ${petId}`);

    return res.json({
      ...analysis,
      documentId: vitalDocument.$id,
    });
  } catch (error: any) {
    console.error('Photo vitals analysis failed:', error);
    return res.json({ error: error.message }, 500);
  }
}

/**
 * Appwrite Function: Generate Meal Plan
 * 
 * Triggered by: App request when user wants personalized nutrition plan
 * Input: { petId: string }
 * Output: { dailyCalories, meals[], supplements[], recommendations[] }
 * 
 * Stores result in Appwrite collection: nutrition_plans
 */

import { Client, Databases } from 'appwrite';

async function generateMealPlan(petId: string, pet: any, database: any) {
  // Compute daily calories
  const weightKg = pet.weightKg || 20;
  const ageYears = (Date.now() - new Date(pet.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  
  const rer = 70 * Math.pow(weightKg, 0.75);
  let multiplier = pet.neutered ? 1.6 : 1.8;

  if (pet.species === 'DOG') {
    if (ageYears < 1) multiplier = 2.0;
    if (ageYears > 7) multiplier *= 0.9;
  } else {
    if (ageYears < 1) multiplier = 2.5;
    if (ageYears > 10) multiplier *= 0.9;
  }

  const dailyCalories = Math.round(rer * multiplier);

  // Generate sample meal plan
  const meals = [
    {
      type: 'BREAKFAST',
      foods: [
        {
          name: 'Premium Kibble',
          brand: 'Hill\'s Science Diet',
          amountGrams: Math.round(dailyCalories * 0.4 / 3.5),
          calories: Math.round(dailyCalories * 0.4),
          timing: '7:00 AM',
        },
      ],
      totalCalories: Math.round(dailyCalories * 0.4),
    },
    {
      type: 'DINNER',
      foods: [
        {
          name: 'Premium Kibble',
          brand: 'Hill\'s Science Diet',
          amountGrams: Math.round(dailyCalories * 0.45 / 3.5),
          calories: Math.round(dailyCalories * 0.45),
          timing: '6:00 PM',
        },
      ],
      totalCalories: Math.round(dailyCalories * 0.45),
    },
    {
      type: 'SNACK',
      foods: [
        {
          name: 'Training Treats',
          brand: 'Stella & Chewy\'s',
          amountGrams: 30,
          calories: Math.round(dailyCalories * 0.15),
          timing: '2:00 PM',
        },
      ],
      totalCalories: Math.round(dailyCalories * 0.15),
    },
  ];

  // Generate supplements
  const supplements = [];
  
  if (ageYears > 7) {
    supplements.push({
      name: 'Joint Support',
      dose: `${Math.round(weightKg * 20)}mg glucosamine`,
      frequency: 'daily',
      reason: 'Senior joint health maintenance',
      priority: 'recommended',
    });
  }

  supplements.push({
    name: 'Omega-3 Fish Oil',
    dose: `${Math.round(weightKg * 50)}mg EPA/DHA`,
    frequency: 'daily',
    reason: 'Skin, coat, and cognitive health support',
    priority: 'recommended',
  });

  const hydrationTarget = Math.round(weightKg * (pet.species === 'CAT' ? 60 : 50));

  const notes = [
    `Daily calories: ${dailyCalories} kcal`,
    `Body Condition Score: ${pet.bodyCondition}/9 - ${pet.bodyCondition <= 4 ? 'consider increasing calories' : pet.bodyCondition >= 7 ? 'consider calorie reduction' : 'ideal'}`,
    `Feeding schedule: ${pet.species === 'CAT' ? '2-3 meals daily' : '1-2 meals daily'}`,
    `Fresh water always available`,
  ];

  return {
    petId,
    dailyCalories,
    meals,
    supplements,
    hydrationTarget,
    notes,
    generatedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
    const { petId } = payload;

    if (!petId) {
      return res.json({ error: 'petId required' }, 400);
    }

    console.log(`Generating meal plan for pet: ${petId}`);

    // Fetch pet data
    const pet = await database.getDocument('anima_db', 'pets', petId);

    // Generate meal plan
    const plan = await generateMealPlan(petId, pet, database);

    // Save to Appwrite
    const planDocument = await database.createDocument(
      'anima_db',
      'nutrition_plans',
      'unique()',
      {
        petId,
        dailyCalories: plan.dailyCalories,
        meals: JSON.stringify(plan.meals),
        supplements: JSON.stringify(plan.supplements),
        hydrationTarget: plan.hydrationTarget,
        notes: JSON.stringify(plan.notes),
        generatedAt: plan.generatedAt,
        validUntil: plan.validUntil,
      }
    );

    console.log(`Meal plan generated and saved for pet ${petId}`);

    return res.json({
      ...plan,
      documentId: planDocument.$id,
    });
  } catch (error: any) {
    console.error('Meal plan generation failed:', error);
    return res.json({ error: error.message }, 500);
  }
}

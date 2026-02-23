/**
 * ANIMA Breed Risk Profiles
 *
 * Population-level health data for common breeds.
 * Sources: OFA, PennHIP, Dog Aging Project, breed club health surveys.
 * Updated quarterly from published veterinary epidemiology.
 */

export interface BreedRiskProfile {
  species: string;
  breed: string;
  avgLifespanYears: number;
  idealWeightMin: number;     // kg
  idealWeightMax: number;     // kg
  healthScore: number;        // 0-100 overall breed health
  dailyExerciseMinutes: number;
  geneticRisks: string[];
  commonConditions: string[];
  nutritionNotes: string[];
}

export const breedRiskProfiles: Record<string, BreedRiskProfile> = {
  // ── DOGS ──────────────────────────────────

  "DOG:labrador retriever": {
    species: "DOG", breed: "labrador retriever",
    avgLifespanYears: 12.5, idealWeightMin: 25, idealWeightMax: 36,
    healthScore: 72, dailyExerciseMinutes: 60,
    geneticRisks: ["hip_dysplasia", "elbow_dysplasia", "obesity", "exercise_induced_collapse"],
    commonConditions: ["obesity", "ear_infections", "joint_disease", "allergies"],
    nutritionNotes: ["Prone to obesity — strict calorie control essential", "Joint support from 2 years"],
  },

  "DOG:golden retriever": {
    species: "DOG", breed: "golden retriever",
    avgLifespanYears: 11.0, idealWeightMin: 25, idealWeightMax: 34,
    healthScore: 62, dailyExerciseMinutes: 60,
    geneticRisks: ["hip_dysplasia", "heart_disease", "cancer", "skin_allergies"],
    commonConditions: ["cancer", "hip_dysplasia", "skin_allergies", "ear_infections", "hypothyroidism"],
    nutritionNotes: ["Anti-inflammatory diet critical — omega-3 from puppyhood", "Cancer risk: antioxidant-rich diet"],
  },

  "DOG:german shepherd": {
    species: "DOG", breed: "german shepherd",
    avgLifespanYears: 11.0, idealWeightMin: 22, idealWeightMax: 40,
    healthScore: 65, dailyExerciseMinutes: 90,
    geneticRisks: ["hip_dysplasia", "degenerative_myelopathy", "bloat", "exocrine_pancreatic_insufficiency"],
    commonConditions: ["hip_dysplasia", "bloat", "allergies", "digestive_issues"],
    nutritionNotes: ["GDV risk: smaller frequent meals, no exercise after eating", "EPI-prone: highly digestible protein"],
  },

  "DOG:french bulldog": {
    species: "DOG", breed: "french bulldog",
    avgLifespanYears: 10.5, idealWeightMin: 8, idealWeightMax: 13,
    healthScore: 45, dailyExerciseMinutes: 30,
    geneticRisks: ["brachycephalic_syndrome", "spinal_disease", "skin_allergies", "heat_intolerance"],
    commonConditions: ["breathing_difficulty", "skin_fold_dermatitis", "allergies", "eye_problems", "IVDD"],
    nutritionNotes: ["Weight management critical for breathing", "Hypoallergenic diet often needed", "Skin health: omega fatty acids"],
  },

  "DOG:poodle": {
    species: "DOG", breed: "poodle",
    avgLifespanYears: 14.0, idealWeightMin: 2.5, idealWeightMax: 32,
    healthScore: 78, dailyExerciseMinutes: 60,
    geneticRisks: ["hip_dysplasia", "eye_disease", "bloat", "addisons_disease"],
    commonConditions: ["ear_infections", "dental_disease", "eye_problems"],
    nutritionNotes: ["Generally healthy breed", "Dental health: appropriate kibble size or dental treats"],
  },

  "DOG:bulldog": {
    species: "DOG", breed: "bulldog",
    avgLifespanYears: 8.5, idealWeightMin: 18, idealWeightMax: 25,
    healthScore: 38, dailyExerciseMinutes: 20,
    geneticRisks: ["brachycephalic_syndrome", "hip_dysplasia", "skin_allergies", "heart_disease", "heat_intolerance"],
    commonConditions: ["breathing_difficulty", "skin_infections", "cherry_eye", "joint_issues"],
    nutritionNotes: ["Extreme weight management needed", "Cooling treats in summer", "Anti-inflammatory support"],
  },

  "DOG:beagle": {
    species: "DOG", breed: "beagle",
    avgLifespanYears: 13.0, idealWeightMin: 9, idealWeightMax: 14,
    healthScore: 75, dailyExerciseMinutes: 60,
    geneticRisks: ["obesity", "epilepsy", "hypothyroidism", "eye_disease"],
    commonConditions: ["obesity", "ear_infections", "dental_disease"],
    nutritionNotes: ["Very food-motivated: strict portion control", "Puzzle feeders recommended"],
  },

  "DOG:mixed": {
    species: "DOG", breed: "mixed",
    avgLifespanYears: 13.5, idealWeightMin: 5, idealWeightMax: 40,
    healthScore: 80, dailyExerciseMinutes: 45,
    geneticRisks: [],
    commonConditions: ["dental_disease", "obesity", "arthritis"],
    nutritionNotes: ["Hybrid vigor advantage", "Base nutrition on estimated adult size"],
  },

  // ── CATS ──────────────────────────────────

  "CAT:domestic shorthair": {
    species: "CAT", breed: "domestic shorthair",
    avgLifespanYears: 15.0, idealWeightMin: 3.5, idealWeightMax: 5.5,
    healthScore: 80, dailyExerciseMinutes: 30,
    geneticRisks: [],
    commonConditions: ["obesity", "dental_disease", "kidney_disease", "UTI"],
    nutritionNotes: ["Obligate carnivore: high protein essential", "Hydration critical: wet food preferred"],
  },

  "CAT:siamese": {
    species: "CAT", breed: "siamese",
    avgLifespanYears: 15.5, idealWeightMin: 3.0, idealWeightMax: 5.0,
    healthScore: 72, dailyExerciseMinutes: 30,
    geneticRisks: ["amyloidosis", "asthma", "heart_disease", "eye_disease"],
    commonConditions: ["dental_disease", "respiratory_issues", "GI_sensitivity"],
    nutritionNotes: ["Sensitive digestion common", "Limited ingredient diets may help"],
  },

  "CAT:persian": {
    species: "CAT", breed: "persian",
    avgLifespanYears: 14.0, idealWeightMin: 3.0, idealWeightMax: 5.5,
    healthScore: 55, dailyExerciseMinutes: 15,
    geneticRisks: ["polycystic_kidney_disease", "brachycephalic_syndrome", "eye_disease", "heart_disease"],
    commonConditions: ["kidney_disease", "eye_discharge", "breathing_difficulty", "dental_disease"],
    nutritionNotes: ["PKD monitoring: low phosphorus after age 5", "Flat-faced kibble design for eating"],
  },

  "CAT:maine coon": {
    species: "CAT", breed: "maine coon",
    avgLifespanYears: 13.0, idealWeightMin: 5.0, idealWeightMax: 11.0,
    healthScore: 68, dailyExerciseMinutes: 30,
    geneticRisks: ["hip_dysplasia", "heart_disease", "spinal_muscular_atrophy"],
    commonConditions: ["HCM", "hip_dysplasia", "dental_disease"],
    nutritionNotes: ["Large breed: joint support from kittenhood", "Heart health: taurine-rich diet"],
  },

  "CAT:mixed": {
    species: "CAT", breed: "mixed",
    avgLifespanYears: 15.5, idealWeightMin: 3.5, idealWeightMax: 6.0,
    healthScore: 82, dailyExerciseMinutes: 25,
    geneticRisks: [],
    commonConditions: ["dental_disease", "obesity", "kidney_disease"],
    nutritionNotes: ["Generally robust health", "Hydration is #1 priority for all cats"],
  },
};

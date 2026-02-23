/**
 * Minimal nutrient targets used by the nutrition and scoring engines.
 * Values are practical defaults for early-stage personalization.
 */

export interface NutrientProfile {
  proteinMinPct: number;
  fatMinPct: number;
  fiberMaxPct: number;
  calciumMgPerKg: number;
  phosphorusMgPerKg: number;
  omega3MgPerKg: number;
  omega6MgPerKg: number;
}

type LifeStage = "puppy_kitten" | "adult" | "senior";
type Species = "DOG" | "CAT";

export const nutrientRequirements: Record<Species, Record<LifeStage, NutrientProfile>> = {
  DOG: {
    puppy_kitten: {
      proteinMinPct: 28,
      fatMinPct: 17,
      fiberMaxPct: 6,
      calciumMgPerKg: 320,
      phosphorusMgPerKg: 240,
      omega3MgPerKg: 60,
      omega6MgPerKg: 120,
    },
    adult: {
      proteinMinPct: 22,
      fatMinPct: 12,
      fiberMaxPct: 8,
      calciumMgPerKg: 200,
      phosphorusMgPerKg: 150,
      omega3MgPerKg: 50,
      omega6MgPerKg: 100,
    },
    senior: {
      proteinMinPct: 26,
      fatMinPct: 10,
      fiberMaxPct: 10,
      calciumMgPerKg: 180,
      phosphorusMgPerKg: 130,
      omega3MgPerKg: 65,
      omega6MgPerKg: 90,
    },
  },
  CAT: {
    puppy_kitten: {
      proteinMinPct: 35,
      fatMinPct: 20,
      fiberMaxPct: 5,
      calciumMgPerKg: 300,
      phosphorusMgPerKg: 220,
      omega3MgPerKg: 60,
      omega6MgPerKg: 120,
    },
    adult: {
      proteinMinPct: 30,
      fatMinPct: 15,
      fiberMaxPct: 6,
      calciumMgPerKg: 210,
      phosphorusMgPerKg: 160,
      omega3MgPerKg: 55,
      omega6MgPerKg: 110,
    },
    senior: {
      proteinMinPct: 32,
      fatMinPct: 14,
      fiberMaxPct: 8,
      calciumMgPerKg: 190,
      phosphorusMgPerKg: 140,
      omega3MgPerKg: 70,
      omega6MgPerKg: 95,
    },
  },
};

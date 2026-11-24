/**
 * Breed reference data.
 *
 * `lifespanYears` comes from published life tables / longevity studies; the
 * `lifespanSource` key points at the citation in `shared/score/evidence.ts`.
 * Where a breed has no published figure the species or type average is used
 * and the source is marked "estimate".
 *
 * `idealWeightKg` is the typical adult range from breed standards. It spans
 * both sexes, so it is only a coarse check; body condition score is the
 * primary measure.
 *
 * `exerciseMinutes` is typical daily exercise guidance for the breed type. It
 * is guidance, not a measured requirement.
 */

import type { Species } from "../types";

export type LifespanSource = "mcmillan2024" | "teng2024cats" | "oneill2015cats" | "estimate";

export interface BreedProfile {
  species: Species;
  name: string;
  lifespanYears: number;
  lifespanSource: LifespanSource;
  idealWeightKg: [number, number] | null;
  exerciseMinutes: number;
  /** Flat-faced (brachycephalic) breed. */
  brachycephalic?: boolean;
  /** Breed-specific things worth knowing when choosing food. */
  nutritionNotes: string[];
}

/** Species medians used as the reference point for the genetic factor. */
export const SPECIES_LIFESPAN: Record<Species, { median: number; low: number; high: number; source: LifespanSource }> = {
  DOG: { median: 12.5, low: 8, high: 15.5, source: "mcmillan2024" },
  CAT: { median: 11.7, low: 7, high: 14.5, source: "teng2024cats" },
};

function dog(
  name: string,
  lifespanYears: number,
  lifespanSource: LifespanSource,
  idealWeightKg: [number, number] | null,
  exerciseMinutes: number,
  nutritionNotes: string[] = [],
  brachycephalic = false
): BreedProfile {
  return { species: "DOG", name, lifespanYears, lifespanSource, idealWeightKg, exerciseMinutes, nutritionNotes, brachycephalic };
}

function cat(
  name: string,
  lifespanYears: number,
  lifespanSource: LifespanSource,
  idealWeightKg: [number, number] | null,
  nutritionNotes: string[] = [],
  brachycephalic = false
): BreedProfile {
  return { species: "CAT", name, lifespanYears, lifespanSource, idealWeightKg, exerciseMinutes: 30, nutritionNotes, brachycephalic };
}

const LARGE_BREED_NOTE = "Large breed: puppies need a growth food labelled for large-size dogs to control calcium.";
const WEIGHT_NOTE = "Gains weight easily. Measure portions and keep treats under 10% of calories.";
const BRACHY_NOTE = "Flat-faced: staying lean makes breathing easier.";

export const BREEDS: BreedProfile[] = [
  // Dogs — median life expectancy from McMillan et al. 2024 (UK, 584,734 dogs)
  dog("Labrador Retriever", 13.1, "mcmillan2024", [25, 36], 90, [WEIGHT_NOTE, LARGE_BREED_NOTE]),
  dog("Golden Retriever", 13.2, "mcmillan2024", [25, 34], 90, [WEIGHT_NOTE, LARGE_BREED_NOTE]),
  dog("German Shepherd", 11.3, "mcmillan2024", [22, 40], 90, [LARGE_BREED_NOTE]),
  dog("French Bulldog", 9.8, "mcmillan2024", [8, 13], 45, [BRACHY_NOTE], true),
  dog("Bulldog", 9.8, "mcmillan2024", [18, 25], 40, [BRACHY_NOTE, WEIGHT_NOTE], true),
  dog("Poodle", 14.0, "mcmillan2024", null, 60, []),
  dog("Beagle", 12.5, "mcmillan2024", [9, 14], 75, [WEIGHT_NOTE]),
  dog("Rottweiler", 10.6, "mcmillan2024", [36, 60], 90, [LARGE_BREED_NOTE]),
  dog("Dachshund", 13.2, "mcmillan2024", [7, 14.5], 50, ["Long back: extra weight raises the risk of disc disease."]),
  dog("Miniature Dachshund", 14.0, "mcmillan2024", [3.5, 5.5], 40, ["Long back: extra weight raises the risk of disc disease."]),
  dog("Siberian Husky", 11.9, "mcmillan2024", [16, 27], 100, []),
  dog("Boxer", 11.3, "mcmillan2024", [25, 32], 90, [], true),
  dog("Great Dane", 10.6, "mcmillan2024", [45, 90], 75, [LARGE_BREED_NOTE]),
  dog("Dobermann", 11.2, "mcmillan2024", [27, 45], 90, [LARGE_BREED_NOTE]),
  dog("Australian Shepherd", 13.7, "mcmillan2024", [16, 32], 100, []),
  dog("Border Collie", 13.1, "estimate", [12, 20], 100, []),
  dog("Cocker Spaniel", 13.3, "estimate", [12, 15], 70, [WEIGHT_NOTE]),
  dog("Cavalier King Charles Spaniel", 11.8, "mcmillan2024", [5.5, 8.5], 50, [WEIGHT_NOTE]),
  dog("Shih Tzu", 12.8, "mcmillan2024", [4, 7.5], 40, [], true),
  dog("Yorkshire Terrier", 13.3, "mcmillan2024", [2, 3.5], 40, []),
  dog("Chihuahua", 11.8, "mcmillan2024", [1.5, 3], 30, []),
  dog("Pomeranian", 12.2, "mcmillan2024", [1.5, 3.5], 30, []),
  dog("Mixed Breed", 12.0, "mcmillan2024", null, 60, []),

  // Cats — life expectancy at birth from Teng et al. 2024 (UK) where listed
  cat("Domestic Shorthair", 11.9, "teng2024cats", [3.5, 5.5]),
  cat("Domestic Longhair", 11.9, "teng2024cats", [3.5, 6]),
  cat("Siamese", 11.7, "teng2024cats", [3, 5]),
  cat("Persian", 10.9, "teng2024cats", [3, 5.5], [BRACHY_NOTE], true),
  cat("Maine Coon", 9.7, "teng2024cats", [4.5, 8.5]),
  cat("Ragdoll", 10.3, "teng2024cats", [4.5, 9]),
  cat("Bengal", 8.5, "teng2024cats", [3.5, 7]),
  cat("British Shorthair", 9.6, "teng2024cats", [4, 8], [WEIGHT_NOTE]),
  cat("Burmese", 14.4, "teng2024cats", [3.5, 5.5]),
  cat("Birman", 14.4, "teng2024cats", [3, 6]),
  cat("Sphynx", 6.7, "teng2024cats", [3, 5.5]),
  cat("Russian Blue", 9.7, "teng2024cats", [3, 5.5]),
  cat("Abyssinian", 10.0, "oneill2015cats", [3, 5]),
  cat("Scottish Fold", 11.7, "estimate", [3, 6]),
  cat("Mixed Breed", 11.9, "teng2024cats", null),
];

const byKey = new Map<string, BreedProfile>(BREEDS.map((b) => [`${b.species}:${b.name.toLowerCase()}`, b]));

export function breedsFor(species: Species): BreedProfile[] {
  return BREEDS.filter((b) => b.species === species);
}

/** Look up a breed; unknown names fall back to the species' mixed-breed profile. */
export function getBreed(species: Species, breed: string): BreedProfile {
  return (
    byKey.get(`${species}:${(breed || "").trim().toLowerCase()}`) ??
    byKey.get(`${species}:mixed breed`)!
  );
}

/** Dogs expected to exceed 32 kg (70 lb) as adults: AAFCO's "large size" line. */
export function isLargeBreed(species: Species, breed: string, weightKg?: number): boolean {
  if (species !== "DOG") return false;
  const profile = getBreed(species, breed);
  if (profile.idealWeightKg) return profile.idealWeightKg[1] > 32;
  return (weightKg ?? 0) > 32;
}

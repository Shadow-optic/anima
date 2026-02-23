/**
 * Biomarker reference ranges by species.
 * Units align with common veterinary panel conventions.
 */

type Species = "DOG" | "CAT";

export interface BiomarkerRange {
  unit: string;
  min: number;
  max: number;
}

export const biomarkerRanges: Record<Species, Record<string, BiomarkerRange>> = {
  DOG: {
    BUN: { unit: "mg/dL", min: 7, max: 27 },
    CREATININE: { unit: "mg/dL", min: 0.5, max: 1.8 },
    PH: { unit: "pH", min: 6.0, max: 7.5 },
    CORTISOL: { unit: "ug/dL", min: 1.0, max: 5.0 },
    TOTAL_PROTEIN: { unit: "g/dL", min: 5.2, max: 7.8 },
  },
  CAT: {
    BUN: { unit: "mg/dL", min: 14, max: 36 },
    CREATININE: { unit: "mg/dL", min: 0.6, max: 2.4 },
    PH: { unit: "pH", min: 6.0, max: 7.5 },
    CORTISOL: { unit: "ug/dL", min: 1.0, max: 5.5 },
    TOTAL_PROTEIN: { unit: "g/dL", min: 6.0, max: 8.0 },
  },
};

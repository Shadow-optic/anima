/**
 * Share card payload.
 *
 * A shared Score is carried entirely in the link, so sharing works on a static
 * site with no server and reveals nothing beyond what the owner chose to share.
 * The card is a snapshot the owner generated; it is not verified by ANIMA.
 */

import type { FactorKey, Species } from "../types";

export interface ShareCard {
  v: 1;
  name: string;
  species: Species;
  breed: string;
  score: number;
  /** Factor scores 0–100, in FACTOR_ORDER. */
  factors: number[];
  /** Grade of the main food, if known. */
  foodGrade?: string;
  day: string; // YYYY-MM-DD
}

export const FACTOR_ORDER: FactorKey[] = [
  "nutritionQuality",
  "bodyCondition",
  "genetic",
  "ageHealth",
  "preventiveCare",
  "activityLevel",
];

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((data.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShareCard(card: ShareCard): string {
  const compact = [card.v, card.name, card.species, card.breed, card.score, card.factors, card.foodGrade ?? "", card.day];
  return toBase64Url(JSON.stringify(compact));
}

/** Decode and validate. Returns null for anything malformed: the input is untrusted. */
export function decodeShareCard(data: string | undefined | null): ShareCard | null {
  if (!data || data.length > 600) return null;
  try {
    const raw = JSON.parse(fromBase64Url(data));
    if (!Array.isArray(raw) || raw[0] !== 1) return null;
    const [, name, species, breed, score, factors, foodGrade, day] = raw;
    if (typeof name !== "string" || name.length === 0 || name.length > 40) return null;
    if (species !== "DOG" && species !== "CAT") return null;
    if (typeof breed !== "string" || breed.length > 60) return null;
    if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 999) return null;
    if (!Array.isArray(factors) || factors.length !== FACTOR_ORDER.length) return null;
    if (!factors.every((f) => typeof f === "number" && f >= 0 && f <= 100)) return null;
    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const grade = typeof foodGrade === "string" && /^[A-E]$/.test(foodGrade) ? foodGrade : undefined;
    return { v: 1, name, species, breed, score, factors: factors.map((f) => Math.round(f)), foodGrade: grade, day };
  } catch {
    return null;
  }
}

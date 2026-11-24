import type { FoodProduct } from "../../types";

/**
 * A real product as transcribed from its source page.
 * `note` records anything a reader should know about how a value was obtained.
 * Vitamin and mineral premixes are abbreviated to "vitamins" and "minerals";
 * every other ingredient is kept in label order.
 */
export type RealProduct = Omit<FoodProduct, "id" | "source" | "maker" | "recallsLast5y" | "isSample"> & {
  sourceUrl: string;
  sourceType: "manufacturer" | "retailer";
  note?: string;
};

export const RETRIEVED = "2026-11-24";

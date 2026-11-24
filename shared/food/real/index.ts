/**
 * The real catalog: products people actually buy, with label data transcribed
 * from the maker's own page (or a major retailer where the maker's page shows
 * no label), each carrying its source link and the date it was read.
 *
 * Formulas change. Every product page says where its data came from and asks
 * the reader to check it against their own bag.
 */

import type { FoodProduct } from "../../types";
import { BRAND_FACTS } from "./brands";
import { CATS } from "./cats";
import { DOG_DRY } from "./dogDry";
import { DOG_MORE } from "./dogMore";
import { RETRIEVED, type RealProduct } from "./types";

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function build(p: RealProduct): FoodProduct {
  const { sourceUrl, sourceType, ...rest } = p;
  const facts = BRAND_FACTS[p.brand];
  return {
    ...rest,
    id: `r-${slug(p.brand)}-${slug(p.name)}`.slice(0, 80),
    maker: facts?.maker,
    // Only recalls actually found are counted. "None found" stays unknown.
    recallsLast5y: facts?.recalls?.length ? facts.recalls.length : undefined,
    source: { url: sourceUrl, type: sourceType, retrievedAt: RETRIEVED },
  };
}

export const REAL_CATALOG: FoodProduct[] = [...DOG_DRY, ...DOG_MORE, ...CATS].map(build);

export { BRAND_FACTS } from "./brands";

/**
 * What is on public record about each maker and brand.
 *
 * Maker transparency: `true` or `false` only where the company itself states
 * it (its own website, or its answers in the Pet Nutrition Alliance 2023
 * manufacturer report). Anything not clearly stated is left undefined and
 * earns partial credit in the Food Score, never full marks.
 *
 * Recalls: only recalls actually found on the FDA's listings are recorded.
 * The FDA's public list is not complete for the whole five-year window, so a
 * brand with no entry here is "none found", which is scored as unknown, not
 * as a clean record.
 */

import type { MakerTransparency } from "../../types";

export interface Recall {
  date: string;
  product: string;
  reason: string;
  url: string;
}

export interface BrandFacts {
  company: string;
  maker: MakerTransparency;
  /** Where the maker answers come from. */
  makerSource: string;
  recalls?: Recall[];
}

const PNA = "https://petnutritionalliance.org/wp-content/uploads/2023/04/Pet-Nutrition-Alliance-Pet-Food-Manufacturer-Report-2023.pdf";

const PURINA: BrandFacts = {
  company: "Nestlé Purina PetCare",
  maker: { employsNutritionist: true, ownsManufacturing: true, conductsFeedingTrialsOrResearch: true },
  makerSource: "https://www.purina.com/faq/company-information",
};

const MARS: BrandFacts = {
  company: "Mars Petcare",
  maker: { employsNutritionist: true, ownsManufacturing: true },
  makerSource: "https://www.pedigree.com/faqs",
};

const POST: BrandFacts = { company: "Post Consumer Brands", maker: {}, makerSource: "https://www.postconsumerbrands.com/faq/" };
const SMUCKER: BrandFacts = { company: "The J.M. Smucker Company", maker: {}, makerSource: PNA };
const CHAMPION: BrandFacts = {
  company: "Champion Petfoods",
  maker: { employsNutritionist: true, ownsManufacturing: true, conductsFeedingTrialsOrResearch: true },
  makerSource: "https://www.orijenpetfoods.com/en-US/orijen-why-faq.html",
};
const DIAMOND: BrandFacts = { company: "Diamond Pet Foods", maker: { ownsManufacturing: true }, makerSource: "https://www.diamondpet.com/faqs/" };

export const BRAND_FACTS: Record<string, BrandFacts> = {
  // Two recalls in the window were of Pro Plan Veterinary Diets (prescription
  // foods: EN canned, Nov 2022, labelling; EL dry, Feb 2023, vitamin D). They
  // are a separate line from the retail foods listed here, so are not counted.
  "Purina Pro Plan": PURINA,
  "Purina ONE": PURINA,
  "Purina Dog Chow": PURINA,
  "Purina Cat Chow": PURINA,
  "Purina Kitten Chow": PURINA,
  "Fancy Feast": PURINA,
  Friskies: PURINA,
  "Beggin'": PURINA,
  "Hill's Science Diet": {
    company: "Hill's Pet Nutrition",
    maker: { employsNutritionist: true, ownsManufacturing: true, publishesFullNutrientAnalysis: true, conductsFeedingTrialsOrResearch: true },
    makerSource: "https://www.hillspet.com/about-us/our-company",
  },
  "Royal Canin": {
    company: "Royal Canin (Mars)",
    maker: { employsNutritionist: true, ownsManufacturing: true, conductsFeedingTrialsOrResearch: true },
    makerSource: "https://www.royalcanin.com/us/about-us/our-nutritional-approach/pet-food-safety-questions-to-ask-your-manufacturer",
  },
  Pedigree: {
    ...MARS,
    recalls: [
      {
        date: "2024-05-17",
        product: "Pedigree Adult Complete Nutrition Grilled Steak & Vegetable dry dog food, 44 lb",
        reason: "Potential loose metal pieces",
        url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/mars-petcare-us-inc-voluntarily-recalls-315-bags-pedigreer-adult-complete-nutrition-grilled-steak",
      },
      {
        date: "2026-07-02",
        product: "Pedigree High Protein Chopped Chicken & Duck canned dog food, two lots",
        reason: "Potential foreign material",
        url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/voluntary-recall-two-lots-pedigreer-can-high-protein-chopped-chicken-duck-flavor-wet-dog-food-due",
      },
    ],
  },
  Iams: MARS,
  Nutro: MARS,
  Greenies: MARS,
  Temptations: MARS,
  "Blue Buffalo": {
    company: "Blue Buffalo (General Mills)",
    maker: { employsNutritionist: true, conductsFeedingTrialsOrResearch: true },
    makerSource: "https://bluebuffalo.com/frequently-asked-questions/",
  },
  "Kibbles 'n Bits": POST,
  "Rachael Ray Nutrish": POST,
  "Meow Mix": SMUCKER,
  "Milk-Bone": SMUCKER,
  Orijen: CHAMPION,
  Acana: CHAMPION,
  "Taste of the Wild": DIAMOND,
  "Diamond Naturals": DIAMOND,
  Wellness: {
    company: "Wellness Pet Company",
    maker: { publishesFullNutrientAnalysis: true, conductsFeedingTrialsOrResearch: true },
    makerSource: "https://www.wellnesspetfood.com/safety/",
  },
  Merrick: { company: "Merrick Pet Care (Nestlé Purina)", maker: {}, makerSource: "https://www.merrickpetcare.com/faqs" },
  "Zuke's": { company: "Zuke's (Nestlé Purina)", maker: {}, makerSource: PNA },
  Freshpet: {
    company: "Freshpet",
    maker: { employsNutritionist: true, ownsManufacturing: true, conductsFeedingTrialsOrResearch: true },
    makerSource: "https://www.freshpet.com/vet/fresh-perspectives-blog/top-5-questions-vets-have-about-freshpets-nutrition-quality",
    recalls: [
      {
        date: "2022-06-17",
        product: "Freshpet Select Fresh From the Kitchen Home Cooked Chicken Recipe, 4.5 lb, one lot",
        reason: "Potential Salmonella",
        url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/freshpet-voluntarily-recalls-one-lot-freshpet-select-fresh-kitchen-home-cooked-chicken-recipe-45",
      },
    ],
  },
  "Tiki Cat": { company: "Tiki Pets (General Mills)", maker: {}, makerSource: "https://tikipets.com/" },
  Weruva: { company: "Weruva", maker: { ownsManufacturing: false }, makerSource: "https://help.weruva.com/s/topic/0TOUO0000004MGT4A2/nutritional-standards" },
};

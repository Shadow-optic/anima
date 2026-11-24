/**
 * The evidence behind the Longevity Score and the Food Score.
 *
 * Every citation here was checked against the publisher, PubMed or the issuing
 * body. Findings are quoted as the papers state them. Where the evidence is
 * weak or indirect the text says so: `strength` is shown to users.
 */

import type { FactorKey } from "../types";

export interface Reference {
  id: string;
  citation: string;
  url: string;
  /** What the source found, in one or two sentences. */
  finding: string;
}

export const REFERENCES: Record<string, Reference> = {
  mcmillan2024: {
    id: "mcmillan2024",
    citation:
      "McMillan KM, Bielby J, Williams CL, Upjohn MM, Casey RA, Christley RM. Longevity of companion dog breeds: those at risk from early death. Sci Rep. 2024;14:531.",
    url: "https://doi.org/10.1038/s41598-023-50458-w",
    finding:
      "584,734 UK dogs across 155 breeds. Overall median survival 12.5 years; breed medians range from under 10 years (French Bulldog 9.8, Bulldog 9.8) to 14 and above (Poodle 14.0).",
  },
  teng2022dogs: {
    id: "teng2022dogs",
    citation:
      "Teng KT, Brodbelt DC, Pegram C, Church DB, O'Neill DG. Life tables of annual life expectancy and mortality for companion dogs in the United Kingdom. Sci Rep. 2022;12:6415.",
    url: "https://doi.org/10.1038/s41598-022-10341-6",
    finding:
      "Life expectancy at birth 11.23 years overall, with large differences between breeds (Jack Russell Terrier 12.72, French Bulldog 4.53).",
  },
  teng2024cats: {
    id: "teng2024cats",
    citation:
      "Teng KT, Brodbelt DC, Church DB, O'Neill DG. Life tables of annual life expectancy and risk factors for mortality in cats in the UK. J Feline Med Surg. 2024;26(5):1098612X241234556.",
    url: "https://doi.org/10.1177/1098612X241234556",
    finding:
      "Life expectancy at birth 11.74 years overall; crossbred 11.89, Burmese 14.42, Birman 14.39, Bengal 8.51, Sphynx 6.68.",
  },
  oneill2015cats: {
    id: "oneill2015cats",
    citation:
      "O'Neill DG, Church DB, McGreevy PD, Thomson PC, Brodbelt DC. Longevity and mortality of cats attending primary care veterinary practices in England. J Feline Med Surg. 2015;17(2):125-133.",
    url: "https://doi.org/10.1177/1098612X14536176",
    finding: "Median longevity 14.0 years; crossbred cats 14.0 years against 12.5 for purebred cats.",
  },
  bannasch2021: {
    id: "bannasch2021",
    citation:
      "Bannasch D, Famula T, Donner J, et al. The effect of inbreeding, body size and morphology on health in dog breeds. Canine Med Genet. 2021;8:12.",
    url: "https://doi.org/10.1186/s40575-021-00111-4",
    finding:
      "Across 227 breeds, body size and inbreeding both predicted how much veterinary care a breed needs, and flat-faced breeds needed more than others.",
  },
  kealy2002: {
    id: "kealy2002",
    citation:
      "Kealy RD, Lawler DF, Ballam JM, et al. Effects of diet restriction on life span and age-related changes in dogs. J Am Vet Med Assoc. 2002;220(9):1315-1320.",
    url: "https://doi.org/10.2460/javma.2002.220.1315",
    finding:
      "48 Labrador Retrievers followed for life. Dogs fed 25% less than their paired littermates stayed lean and lived significantly longer; the follow-up review (Lawler 2008) reports a median 1.8 years longer.",
  },
  salt2019: {
    id: "salt2019",
    citation:
      "Salt C, Morris PJ, Wilson D, Lund EM, German AJ. Association between life span and body condition in neutered client-owned dogs. J Vet Intern Med. 2019;33(1):89-99.",
    url: "https://doi.org/10.1111/jvim.15367",
    finding:
      "50,787 dogs of 12 breeds. Overweight dogs had shorter median lifespans in every breed, by between 5 months (German Shepherd) and 2.5 years (Yorkshire Terrier).",
  },
  teng2018cats: {
    id: "teng2018cats",
    citation:
      "Teng KT, McGreevy PD, Toribio JL, Raubenheimer D, Kendall K, Dhand NK. Strong associations of nine-point body condition scoring with survival and lifespan in cats. J Feline Med Surg. 2018;20(12):1110-1118.",
    url: "https://doi.org/10.1177/1098612X17752198",
    finding:
      "2,609 cats. Body condition scores below 5 and of 9 were associated with shorter survival; cats peaking at 6 did best.",
  },
  laflamme1997: {
    id: "laflamme1997",
    citation:
      "Laflamme D. Development and validation of a body condition score system for dogs. Canine Practice. 1997;22(4):10-15.",
    url: "https://wsava.org/global-guidelines/global-nutrition-guidelines/",
    finding: "Introduced the 9-point body condition scale used here, on which 4–5 is ideal for dogs. WSAVA publishes the charts.",
  },
  aaha2021: {
    id: "aaha2021",
    citation:
      "Cline MG, Burns KM, Coe JB, et al. 2021 AAHA Nutrition and Weight Management Guidelines for Dogs and Cats. J Am Anim Hosp Assoc. 2021;57(4):153-178.",
    url: "https://doi.org/10.5326/JAAHA-MS-7232",
    finding:
      "Resting energy requirement = 70 × body weight(kg)^0.75, with life-stage multipliers as a starting point. Treats should stay at or under 10% of daily calories.",
  },
  aaha2014: {
    id: "aaha2014",
    citation:
      "Brooks D, Churchill J, Fein K, et al. 2014 AAHA Weight Management Guidelines for Dogs and Cats. J Am Anim Hosp Assoc. 2014;50(1):1-11.",
    url: "https://doi.org/10.5326/JAAHA-MS-6331",
    finding:
      "Desired weight loss is 1–2% a week in dogs and 0.5–2% in cats. Recheck every two weeks until the rate is established. If loss is too fast, raise calories by 10%; if too slow with adherence verified, cut by 10–20%. Each body condition point above 5 of 9 is about 10% overweight. Below 60% of resting energy at ideal weight needs a veterinary nutritionist.",
  },
  bermingham2014: {
    id: "bermingham2014",
    citation:
      "Bermingham EN, Thomas DG, Cave NJ, Morris PJ, Butterwick RF, German AJ. Energy requirements of adult dogs: a meta-analysis. PLoS One. 2014;9(10):e109681.",
    url: "https://doi.org/10.1371/journal.pone.0109681",
    finding:
      "Across 29 studies, maintenance energy needs averaged 142.8 kcal per kg^0.75 a day with a standard deviation of 55.3. The authors conclude the mean \"will not adequately reflect the actual requirement for many dogs\".",
  },
  apop2022: {
    id: "apop2022",
    citation: "Association for Pet Obesity Prevention. 2022 State of U.S. Pet Obesity report.",
    url: "https://petobesityprevention.org/2022-state-of-pet-obesity-report-summary",
    finding: "Veterinary professionals classified 59% of dogs and 61% of cats as overweight or having obesity.",
  },
  pna2023: {
    id: "pna2023",
    citation: "Pet Nutrition Alliance. Pet Food Manufacturer Evaluation Report. 2023.",
    url: "https://petnutritionalliance.org/wp-content/uploads/2023/04/Pet-Nutrition-Alliance-Pet-Food-Manufacturer-Report-2023.pdf",
    finding:
      "Tabulates makers' own answers on whether they employ a qualified nutritionist, own their plants and can supply nutrient data. Several makers did not respond.",
  },
  fdaRecalls: {
    id: "fdaRecalls",
    citation: "U.S. Food and Drug Administration. Animal & Veterinary Recalls & Withdrawals.",
    url: "https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals",
    finding: "The public list of pet food recalls. Older entries are archived, so it is not a complete five-year record.",
  },
  aafcoProfiles: {
    id: "aafcoProfiles",
    citation: "AAFCO. Dog and Cat Food Nutrient Profiles, in: Methods for Substantiating Nutritional Adequacy of Dog and Cat Foods.",
    url: "https://www.aafco.org/wp-content/uploads/2023/01/Model_Bills_and_Regulations_Agenda_Midyear_2015_Final_Attachment_A.__Proposed_revisions_to_AAFCO_Nutrient_Profiles_PFC_Final_070214.pdf",
    finding:
      "Dry-matter minimums: dogs 18% protein and 5.5% fat for adults, 22.5% and 8.5% for growth; cats 26% and 9% for adults, 30% and 9% for growth. Dog calcium 0.5–2.5% (maximum 1.8% for large-size puppies), calcium-to-phosphorus 1:1 to 2:1. Cat taurine at least 0.10% (dry) or 0.20% (canned).",
  },
  aafcoCalories: {
    id: "aafcoCalories",
    citation: "AAFCO. Calorie content: modified Atwater factors.",
    url: "https://www.aafco.org/resources/startups/calorie-content/",
    finding: "Metabolisable energy (kcal/kg) = 10 × (3.5 × protein% + 8.5 × fat% + 3.5 × carbohydrate%).",
  },
  wsavaSelecting: {
    id: "wsavaSelecting",
    citation: "WSAVA Global Nutrition Committee. Guidelines on Selecting Pet Foods. Updated 10 March 2021.",
    url: "https://wsava.org/wp-content/uploads/2021/04/Selecting-a-pet-food-for-your-pet-updated-2021_WSAVA-Global-Nutrition-Toolkit.pdf",
    finding:
      "Judge a food by its maker and its adequacy statement, not its ingredient list: does the company employ a qualified nutritionist, who formulates the diet, what quality control and research back it, and is it complete for the life stage by feeding trial or formulation.",
  },
  fdaDcm: {
    id: "fdaDcm",
    citation: "U.S. Food and Drug Administration. FDA Investigation into Potential Link between Certain Diets and Canine Dilated Cardiomyopathy.",
    url: "https://www.fda.gov/animal-veterinary/news-events/fda-investigation-potential-link-between-certain-diets-and-canine-dilated-cardiomyopathy",
    finding:
      "Of 524 reports to April 2019, over 90% of the diets were grain-free and 93% contained peas or lentils. The FDA says the reports do not establish a causal relationship and has paused public updates until there is new science.",
  },
  urfer2019: {
    id: "urfer2019",
    citation:
      "Urfer SR, Wang M, Yang M, Lund EM, Lefebvre SL. Risk factors associated with lifespan in pet dogs evaluated in primary care veterinary hospitals. J Am Anim Hosp Assoc. 2019;55(3):130-137.",
    url: "https://doi.org/10.5326/JAAHA-MS-6763",
    finding:
      "2.37 million dogs at 787 US hospitals. The hazard of death fell as the frequency of dental scaling rose, and was higher in intact than in neutered dogs.",
  },
  hoffman2013: {
    id: "hoffman2013",
    citation:
      "Hoffman JM, Creevy KE, Promislow DEL. Reproductive capability is associated with lifespan and cause of death in companion dogs. PLoS One. 2013;8(4):e61082.",
    url: "https://doi.org/10.1371/journal.pone.0061082",
    finding:
      "Sterilisation was associated with 13.8% longer life expectancy in males and 26.3% in females, with fewer deaths from infection and more from cancer.",
  },
  bray2023: {
    id: "bray2023",
    citation:
      "Bray EE, Raichlen DA, Forsyth KK, et al. Associations between physical activity and cognitive dysfunction in older companion dogs: results from the Dog Aging Project. GeroScience. 2023;45(2):645-661.",
    url: "https://doi.org/10.1007/s11357-022-00655-8",
    finding:
      "11,574 dogs aged 6–18. More active dogs had roughly half the odds of clinical cognitive dysfunction (odds ratio 0.53). Cross-sectional, so it cannot show cause.",
  },
  bray2022: {
    id: "bray2022",
    citation:
      "Bray EE, Zheng Z, Tolbert MK, et al. Once-daily feeding is associated with better health in companion dogs: results from the Dog Aging Project. GeroScience. 2022;44(3):1779-1790.",
    url: "https://doi.org/10.1007/s11357-022-00575-7",
    finding:
      "Dogs fed once a day had lower odds of several health conditions. Cross-sectional; the authors make no causal claim, and ANIMA does not score feeding frequency.",
  },
};

export type EvidenceStrength = "strong" | "moderate" | "limited";

export const STRENGTH_LABEL: Record<EvidenceStrength, string> = {
  strong: "Strong evidence",
  moderate: "Moderate evidence",
  limited: "Limited evidence",
};

export interface FactorEvidence {
  factor: FactorKey;
  title: string;
  /** What we measure. */
  measures: string;
  /** How the number is produced. */
  method: string;
  /** Why it is in the Score. */
  why: string;
  strength: EvidenceStrength;
  /** What this factor cannot tell you. */
  limits: string;
  references: string[];
}

export const FACTOR_EVIDENCE: Record<FactorKey, FactorEvidence> = {
  nutritionQuality: {
    factor: "nutritionQuality",
    title: "Nutrition",
    measures: "The quality of the food your pet eats and how it is fed.",
    method:
      "55% the ANIMA Food Score of the main diet, weighted by calories. 20% calories logged against the daily target (within 10% is full marks). 15% how many of the last 7 days were logged. 10% treats staying under 10% of calories.",
    why: "How much a dog is fed is the only thing shown to extend lifespan in a lifelong controlled trial. A complete and balanced diet matched to life stage is the basis of every veterinary nutrition guideline.",
    strength: "moderate",
    limits:
      "The evidence is strongest for the amount fed and for nutritional adequacy. No study has shown that one food format, such as fresh over kibble, extends lifespan, and the Food Score does not claim that.",
    references: ["kealy2002", "aaha2021", "aafcoProfiles", "wsavaSelecting"],
  },
  bodyCondition: {
    factor: "bodyCondition",
    title: "Body Condition",
    measures: "Body fat, on the 9-point body condition scale vets use.",
    method:
      "Full marks at 4–5 out of 9, falling away on both sides. For adult purebreds, 20% of the factor checks weight against the breed's typical range.",
    why: "Lean dogs live longer. This is the best-supported modifiable factor in the Score.",
    strength: "strong",
    limits: "Owners tend to score their own pets leaner than a vet would. Ask your vet to confirm the score at the next visit.",
    references: ["kealy2002", "salt2019", "teng2018cats", "laflamme1997"],
  },
  genetic: {
    factor: "genetic",
    title: "Breed Baseline",
    measures: "Where your pet's breed sits in the published range of life expectancy for its species.",
    method:
      "The breed's median life expectancy from UK life-table studies, placed on a scale from the shortest- to longest-lived breeds. Mixed breeds use the crossbred figure.",
    why: "Life expectancy differs widely by breed. Among common dog breeds the published medians run from 9.8 years to 14.0.",
    strength: "strong",
    limits:
      "A breed median describes a population, not your pet. The figures are from UK veterinary and insurance records and may differ elsewhere. You cannot change this factor.",
    references: ["mcmillan2024", "teng2022dogs", "teng2024cats", "oneill2015cats", "bannasch2021"],
  },
  ageHealth: {
    factor: "ageHealth",
    title: "Life Stage",
    measures: "How far through its breed's typical lifespan your pet is.",
    method: "Age divided by the breed's life expectancy. The factor falls steadily with age.",
    why: "The Score is a snapshot of where a pet stands, and age is part of that. It keeps a young and an old pet with identical care from scoring the same.",
    strength: "strong",
    limits: "It measures time elapsed, not health. A fit senior loses points here through no fault of its owner. You cannot change this factor.",
    references: ["mcmillan2024", "teng2024cats"],
  },
  preventiveCare: {
    factor: "preventiveCare",
    title: "Preventive Care",
    measures: "Whether routine veterinary care is up to date.",
    method:
      "45% a wellness exam in the last 12 months (6 for seniors). 25% dental care in the last 12 months. 20% vaccination in the last 3 years. 10% parasite prevention in the last 3 months.",
    why: "In 2.4 million dogs, more frequent dental cleaning went with a lower hazard of death. Regular exams are how weight gain, dental disease and chronic illness are caught early.",
    strength: "moderate",
    limits:
      "The dental finding is an association: owners who pay for dental care differ in other ways too. Vaccine and parasite schedules vary by region and lifestyle, so follow your vet's schedule over these defaults.",
    references: ["urfer2019", "hoffman2013", "aaha2021"],
  },
  activityLevel: {
    factor: "activityLevel",
    title: "Activity",
    measures: "Typical daily active minutes against guidance for the breed type.",
    method: "Your reported minutes divided by typical guidance for the breed (30% less for seniors). Full marks from 80% of the guide figure.",
    why: "More active older dogs show far less cognitive decline, and activity is half of weight control.",
    strength: "limited",
    limits:
      "This is the weakest factor. The activity studies are cross-sectional, the minutes are self-reported, and breed exercise targets are guidance, not measured requirements. That is why it carries only 10% of the Score.",
    references: ["bray2023", "kealy2002"],
  },
};

export interface MethodNote {
  title: string;
  body: string;
  references: string[];
}

/** How the Food Score is built, component by component. */
export const FOOD_SCORE_METHOD: MethodNote[] = [
  {
    title: "Complete & balanced (30 points)",
    body: "The adequacy statement on the label. Full marks when the food passed AAFCO feeding trials, slightly fewer when it is formulated to meet the nutrient profiles, and none when it is for supplemental feeding only. A food that is not complete and balanced cannot grade above D as a main diet.",
    references: ["wsavaSelecting", "aafcoProfiles"],
  },
  {
    title: "Nutrient profile (30 points)",
    body: "Protein, fat, fibre, calcium and phosphorus converted to dry matter so wet and dry foods compare fairly, then checked against AAFCO minimums and ranges for the life stage. Protein scores zero below the minimum and full marks at 28% of dry matter for dogs, 40% for cats. For cats, estimated carbohydrate above 25% of dry matter loses points.",
    references: ["aafcoProfiles", "aafcoCalories"],
  },
  {
    title: "Ingredients (15 points)",
    body: "Kept deliberately small, because WSAVA advises against judging a food by its ingredient list. Only a few signals count: a named animal protein in the first three ingredients, unnamed animal ingredients, added colourings, synthetic preservatives, added sugar, onion or garlic, and pulse- or potato-heavy dog foods.",
    references: ["wsavaSelecting", "fdaDcm"],
  },
  {
    title: "Maker transparency (15 points)",
    body: "The WSAVA questions: does the maker employ a qualified nutritionist, make the food in its own plants, provide a full nutrient analysis, and run feeding trials or publish research. An answer counts only when the company states it itself, on its website or in the Pet Nutrition Alliance survey. Unanswered questions earn partial credit, never full.",
    references: ["wsavaSelecting", "pna2023"],
  },
  {
    title: "Recall record (10 points)",
    body: "Recalls of the brand in the last five years. A verified clean record is full marks, one recall is half, two or more is zero. The FDA's public list is incomplete for part of that period, so a brand with no recall found is scored as unknown (partial credit), not as clean. Recalls of a maker's separate prescription line are not counted against its retail foods.",
    references: ["fdaRecalls"],
  },
  {
    title: "Fit for your pet",
    body: "The base score is then adjusted for the individual: a food for the wrong species or life stage is marked unsuitable, large-breed puppies need controlled calcium, overweight pets do better on lower-calorie high-protein foods, and seniors on higher protein.",
    references: ["aafcoProfiles", "aaha2021"],
  },
  {
    title: "Treats and toppers",
    body: "Not meant to be complete, so they are scored on ingredients (40), calories per treat (30), maker transparency (15) and recall record (15). Treats should stay under 10% of daily calories.",
    references: ["aaha2021"],
  },
];

/** How Portion Autopilot works, for the science page. */
export const AUTOPILOT_METHOD: MethodNote[] = [
  {
    title: "Why a formula is not enough",
    body: "Every feeding guide starts from an equation for the average animal. Measured needs vary so widely around that average that the estimate is wrong for many pets, which is one reason most dogs and cats in the US are overweight. Autopilot treats the formula as a first guess and corrects it from the pet's own weight.",
    references: ["bermingham2014", "apop2022"],
  },
  {
    title: "The loop",
    body: "Feed a measured portion. Weigh every two weeks on the same scale. Autopilot compares the change with the safe range for the goal: losing 1–2% of body weight a week for dogs and 0.5–2% for cats, or holding within 0.5% a week at ideal weight. Too slow, it proposes 10% less; too fast, 10% more; in range, no change. Each applied step is stored as the pet's personal factor, so the plan converges on what this animal needs.",
    references: ["aaha2014", "aaha2021"],
  },
  {
    title: "Telling a wrong plan from a plan not followed",
    body: "When at least half the days were logged, Autopilot checks intake before it touches the plan. If logged calories ran more than 15% over the plan, it says so and leaves the plan alone, because the guideline is to adjust only once adherence is verified.",
    references: ["aaha2014"],
  },
  {
    title: "Limits it will not cross",
    body: "It never plans below 60% of resting energy at ideal weight, the point at which the guidelines call for a veterinary nutritionist. It does not restrict growing animals. Weight that falls while the full portion is eaten is flagged for a vet, not answered with more food. Every change is a proposal the owner applies. Ideal weight is estimated at 10% per body condition point, so a vet's target weight is better where there is one.",
    references: ["aaha2014"],
  },
];

export const SCORE_DISCLAIMER =
  "The Longevity Score is a wellness index, not a prediction of how long your pet will live and not a diagnosis. It summarises how your pet's circumstances compare with factors the veterinary literature links to longer, healthier lives. Talk to your vet before changing diet, weight or exercise.";

export const FOOD_DISCLAIMER =
  "The Food Score is an educational estimate calculated from label data. It is not veterinary advice and does not replace a diet your vet has prescribed.";

export function referencesFor(ids: string[]): Reference[] {
  return ids.map((id) => REFERENCES[id]).filter(Boolean);
}

/**
 * ANIMA API Routes
 * Express router setup with all endpoint handlers
 */

import {Request, Response, Router} from "express";
import {PrismaClient} from "@prisma/client";
import {computeScore} from "../services/longevityScorer";
import {generateMealPlan, generateNutritionTargets} from "../services/nutritionEngine";
import {z} from "zod";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────

const CreatePetSchema = z.object({
  name: z.string().min(1).max(50),
  species: z.enum(["DOG", "CAT"]),
  breed: z.string().min(1),
  breedSecondary: z.string().optional(),
  dateOfBirth: z.string().datetime(),
  sex: z.enum(["MALE", "FEMALE"]),
  neutered: z.boolean(),
  weightKg: z.number().positive().max(200),
  bodyCondition: z.number().int().min(1).max(9).default(5),
});

const LogMealSchema = z.object({
  type: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "TREAT"]),
  items: z.array(z.object({
    foodId: z.string().optional(),
    name: z.string(),
    amountGrams: z.number().positive(),
    calories: z.number().optional(),
  })),
  notes: z.string().optional(),
});

const BioCardScanSchema = z.object({
  imageBase64: z.string(),
  cardVersion: z.string().default("v1"),
});

// ─────────────────────────────────────────────
// PET ROUTES
// ─────────────────────────────────────────────

export const petRouter = Router();

/**
 * GET /pets
 * List all pets for authenticated user
 */
petRouter.get("/", async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const pets = await prisma.pet.findMany({
    where: { userId },
    include: {
      scores: {
        orderBy: { computedAt: "desc" },
        take: 1,
      },
      twin: {
        select: {
          healthTrajectory: true,
          lastComputed: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const petsWithScores = pets.map((pet) => ({
    ...pet,
    currentScore: pet.scores[0] || null,
    scores: undefined, // Don't send full history
  }));

  res.json({ success: true, data: petsWithScores });
});

/**
 * POST /pets
 * Create a new pet profile + compute initial score
 */
petRouter.post("/", async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const body = CreatePetSchema.parse(req.body);

  // Check tier limits
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const petCount = await prisma.pet.count({ where: { userId } });

  const limits: Record<string, number> = {
    FREE: 1,
    PREMIUM: 3,
    PRO: 100,
    VET: 100,
  };

  if (petCount >= (limits[user.tier] || 1)) {
    res.status(403).json({
      success: false,
      error: { code: "PET_LIMIT", message: `${user.tier} tier allows ${limits[user.tier]} pet(s). Upgrade to add more.` },
    });
    return;
  }

  const pet = await prisma.pet.create({
    data: {
      ...body,
      userId,
    },
  });

  // Create initial Digital Twin
  await prisma.digitalTwin.create({
    data: {
      petId: pet.id,
      currentState: {
        identity: { name: pet.name, species: pet.species, breed: pet.breed },
        created: new Date().toISOString(),
      },
    },
  });

  // Log initial weight
  await prisma.weightLog.create({
    data: {
      petId: pet.id,
      weightKg: pet.weightKg,
      bodyCondition: pet.bodyCondition,
      source: "MANUAL",
    },
  });

  // Compute initial Longevity Score
  const score = await computeScore(pet.id);

  res.status(201).json({
    success: true,
    data: { ...pet, currentScore: score },
  });
});

/**
 * GET /pets/:id
 * Get detailed pet profile with current score and twin summary
 */
petRouter.get("/:id", async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const pet = await prisma.pet.findFirst({
    where: { id, userId },
    include: {
      scores: {
        orderBy: { computedAt: "desc" },
        take: 10,
      },
      twin: true,
      weightHistory: {
        orderBy: { recordedAt: "desc" },
        take: 12,
      },
      biomarkerSets: {
        orderBy: { recordedAt: "desc" },
        take: 5,
        include: { readings: true },
      },
    },
  });

  if (!pet) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Pet not found" },
    });
    return;
  }

  res.json({ success: true, data: pet });
});

// ─────────────────────────────────────────────
// SCORE ROUTES
// ─────────────────────────────────────────────

export const scoreRouter = Router();

/**
 * GET /pets/:id/score
 * Get current Longevity Score with full breakdown
 */
scoreRouter.get("/:id/score", async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  // Verify ownership
  const pet = await prisma.pet.findFirst({ where: { id, userId } });
  if (!pet) {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Pet not found" } });
    return;
  }

  const latestScore = await prisma.longevityScore.findFirst({
    where: { petId: id },
    orderBy: { computedAt: "desc" },
  });

  if (!latestScore) {
    // Compute first score
    const score = await computeScore(id);
    res.json({ success: true, data: score });
    return;
  }

  res.json({ success: true, data: latestScore });
});

/**
 * POST /pets/:id/score/recompute
 * Force score recomputation (e.g., after new data)
 */
scoreRouter.post("/:id/score/recompute", async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const pet = await prisma.pet.findFirst({ where: { id, userId } });
  if (!pet) {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Pet not found" } });
    return;
  }

  const score = await computeScore(id);
  res.json({ success: true, data: score });
});

/**
 * GET /pets/:id/score/history
 * Score trend over time (for charts)
 */
scoreRouter.get("/:id/score/history", async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const scores = await prisma.longevityScore.findMany({
    where: { petId: id, pet: { userId } },
    orderBy: { computedAt: "asc" },
    select: { score: true, computedAt: true, factors: true },
  });

  res.json({ success: true, data: scores });
});

// ─────────────────────────────────────────────
// NUTRITION ROUTES
// ─────────────────────────────────────────────

export const nutritionRouter = Router();

/**
 * GET /pets/:id/nutrition/plan
 * Get current active nutrition plan
 */
nutritionRouter.get("/:id/nutrition/plan", async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const plan = await prisma.nutritionPlan.findFirst({
    where: { petId: id, active: true },
    orderBy: { createdAt: "desc" },
  });

  if (!plan) {
    // Generate first plan
    const newPlan = await generateMealPlan(id);
    res.json({ success: true, data: newPlan });
    return;
  }

  res.json({ success: true, data: plan });
});

/**
 * POST /pets/:id/nutrition/plan/generate
 * Generate a new meal plan
 */
nutritionRouter.post("/:id/nutrition/plan/generate", async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  // Deactivate old plans
  await prisma.nutritionPlan.updateMany({
    where: { petId: id, active: true },
    data: { active: false },
  });

  const plan = await generateMealPlan(id);
  res.json({ success: true, data: plan });
});

/**
 * POST /pets/:id/meals
 * Log a meal
 */
nutritionRouter.post("/:id/meals", async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const body = LogMealSchema.parse(req.body);

  const meal = await prisma.meal.create({
    data: {
      petId: id,
      type: body.type,
      notes: body.notes,
      items: {
        create: body.items.map((item) => ({
          foodId: item.foodId,
          name: item.name,
          amountGrams: item.amountGrams,
          calories: item.calories,
        })),
      },
    },
    include: { items: true },
  });

  // Recompute score async (meal data affects nutrition factor)
  // await scoreQueue.add('recompute', { petId: id });

  res.status(201).json({ success: true, data: meal });
});

/**
 * GET /pets/:id/meals
 * Get meal history
 */
nutritionRouter.get("/:id/meals", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = "20", offset = "0" } = req.query;

  const meals = await prisma.meal.findMany({
    where: { petId: id },
    include: { items: { include: { food: true } } },
    orderBy: { loggedAt: "desc" },
    take: parseInt(limit as string),
    skip: parseInt(offset as string),
  });

  res.json({ success: true, data: meals });
});

/**
 * GET /pets/:id/nutrition/targets
 * Get computed nutrition targets (without generating full plan)
 */
nutritionRouter.get("/:id/nutrition/targets", async (req: Request, res: Response) => {
  const { id } = req.params;
  const targets = await generateNutritionTargets(id);
  res.json({ success: true, data: targets });
});

// ─────────────────────────────────────────────
// BIOCARD ROUTES
// ─────────────────────────────────────────────

export const biocardRouter = Router();

/**
 * POST /pets/:id/biocard/scan
 * Process a BioCard scan image
 */
biocardRouter.post("/:id/biocard/scan", async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const body = BioCardScanSchema.parse(req.body);

  // Verify Pro tier
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.tier !== "PRO" && user.tier !== "VET") {
    res.status(403).json({
      success: false,
      error: { code: "TIER_REQUIRED", message: "BioCard scanning requires Pro tier" },
    });
    return;
  }

  // Decode and save image
  const imageBuffer = Buffer.from(body.imageBase64, "base64");
  const imagePath = `/tmp/biocard_${id}_${Date.now()}.jpg`;

  // In production: save to Supabase Storage
  // For now, process directly

  // Call Python CV pipeline
  // const result = await callBioCardPipeline(imagePath, pet.species, body.cardVersion);

  // Mock result for development
  const mockResult = {
    success: true,
    cardVersion: body.cardVersion,
    lotNumber: "BC-2026-0001",
    scanQuality: 0.87,
    readings: [
      { name: "pH", value: 6.8, unit: "pH", status: "NORMAL" as const, confidence: 0.92 },
      { name: "BUN", value: 18.3, unit: "mg/dL", status: "NORMAL" as const, confidence: 0.85 },
      { name: "protein", value: 6.2, unit: "g/dL", status: "NORMAL" as const, confidence: 0.88 },
    ],
    warnings: [],
  };

  // Persist biomarker readings
  const biomarkerSet = await prisma.biomarkerSet.create({
    data: {
      petId: id,
      source: "BIOCARD",
      sourceRef: mockResult.lotNumber,
      scanQuality: mockResult.scanQuality,
      readings: {
        create: mockResult.readings.map((r) => ({
          name: r.name,
          value: r.value,
          unit: r.unit,
          status: r.status,
          confidence: r.confidence,
          method: "colorimetric",
        })),
      },
    },
    include: { readings: true },
  });

  // Recompute score with new biomarker data
  const updatedScore = await computeScore(id);

  res.json({
    success: true,
    data: {
      biomarkers: biomarkerSet,
      updatedScore,
      scanQuality: mockResult.scanQuality,
      warnings: mockResult.warnings,
    },
  });
});

/**
 * GET /pets/:id/biomarkers
 * Get biomarker history with trends
 */
biocardRouter.get("/:id/biomarkers", async (req: Request, res: Response) => {
  const { id } = req.params;

  const sets = await prisma.biomarkerSet.findMany({
    where: { petId: id },
    include: { readings: true },
    orderBy: { recordedAt: "desc" },
    take: 20,
  });

  // Compute trends per biomarker
  const biomarkerMap = new Map<string, Array<{ value: number; date: string; source: string }>>();

  for (const set of sets) {
    for (const reading of set.readings) {
      if (!biomarkerMap.has(reading.name)) {
        biomarkerMap.set(reading.name, []);
      }
      biomarkerMap.get(reading.name)!.push({
        value: reading.value,
        date: set.recordedAt.toISOString(),
        source: set.source,
      });
    }
  }

  const trends = Array.from(biomarkerMap.entries()).map(([name, points]) => {
    const sorted = points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = sorted[0]?.value || 0;
    const last = sorted[sorted.length - 1]?.value || 0;
    const change = last - first;

    return {
      name,
      unit: sets[0]?.readings.find((r) => r.name === name)?.unit || "",
      dataPoints: sorted,
      trend: Math.abs(change) < 0.5 ? "stable" : change > 0 ? "rising" : "falling",
    };
  });

  res.json({ success: true, data: { sets, trends } });
});

// ─────────────────────────────────────────────
// FOOD SEARCH ROUTES
// ─────────────────────────────────────────────

export const foodRouter = Router();

/**
 * GET /foods/search
 * Search food database (Typesense-powered)
 */
foodRouter.get("/search", async (req: Request, res: Response) => {
  const { q, species, type, limit = "20" } = req.query;

  const where: any = { verified: true };
  if (species) where.species = species;
  if (type) where.type = type;

  const foods = await prisma.food.findMany({
    where: {
      ...where,
      OR: q ? [
        { productName: { contains: q as string, mode: "insensitive" } },
        { brand: { contains: q as string, mode: "insensitive" } },
      ] : undefined,
    },
    take: parseInt(limit as string),
    orderBy: { brand: "asc" },
  });

  res.json({ success: true, data: foods });
});

// ─────────────────────────────────────────────
// MAIN ROUTER ASSEMBLY
// ─────────────────────────────────────────────

export function createApiRouter(): Router {
  const api = Router();

  api.use("/pets", petRouter);
  api.use("/pets", scoreRouter);
  api.use("/pets", nutritionRouter);
  api.use("/pets", biocardRouter);
  api.use("/foods", foodRouter);

  // Health check
  api.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() });
  });

  return api;
}

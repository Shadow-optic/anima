/**
 * ANIMA React Query Hooks
 * 
 * All server state management. Each hook handles:
 * - Fetching, caching, and revalidation
 * - Optimistic updates where appropriate
 * - Error handling with typed errors
 * - Offline support via query persistence
 */

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {api} from "../config/api";
import {usePetStore} from "../stores";
import type {
    BiomarkerSet,
    BiomarkerTrend,
    LongevityScore,
    MealLog,
    NutritionPlan,
    PetWithScore,
} from "../../shared/types";

// ─────────────────────────────────────────────
// Query Keys (centralized for cache management)
// ─────────────────────────────────────────────

export const queryKeys = {
  pets: ["pets"] as const,
  pet: (id: string) => ["pet", id] as const,
  score: (petId: string) => ["score", petId] as const,
  scoreHistory: (petId: string) => ["scoreHistory", petId] as const,
  nutritionPlan: (petId: string) => ["nutritionPlan", petId] as const,
  meals: (petId: string) => ["meals", petId] as const,
  biomarkers: (petId: string) => ["biomarkers", petId] as const,
  environmentRisks: (petId: string) => ["envRisks", petId] as const,
  careTimeline: (petId: string) => ["careTimeline", petId] as const,
  behavioralInsights: (petId: string) => ["behavioral", petId] as const,
  foodSearch: (query: string) => ["foods", query] as const,
  foodAlerts: (petId: string) => ["foodAlerts", petId] as const,
} as const;

// ─────────────────────────────────────────────
// PET HOOKS
// ─────────────────────────────────────────────

/** Fetch all pets for current user */
export function usePets() {
  return useQuery({
    queryKey: queryKeys.pets,
    queryFn: () => api.get<PetWithScore[]>("/pets"),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/** Fetch single pet with full details */
export function usePet(petId: string) {
  return useQuery({
    queryKey: queryKeys.pet(petId),
    queryFn: () => api.get<PetWithScore>(`/pets/${petId}`),
    enabled: !!petId,
  });
}

/** Create a new pet */
export function useCreatePet() {
  const queryClient = useQueryClient();
  const { setActivePet } = usePetStore();

  return useMutation({
    mutationFn: (data: {
      name: string;
      species: "DOG" | "CAT";
      breed: string;
      breedSecondary?: string;
      dateOfBirth: string;
      sex: "MALE" | "FEMALE";
      neutered: boolean;
      weightKg: number;
      bodyCondition?: number;
    }) => api.post<PetWithScore>("/pets", data),

    onSuccess: (newPet) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pets });
      if (newPet.currentScore) {
        setActivePet(newPet, newPet.currentScore);
      }
    },
  });
}

// ─────────────────────────────────────────────
// SCORE HOOKS
// ─────────────────────────────────────────────

/** Fetch current Longevity Score */
export function useScore(petId: string) {
  return useQuery({
    queryKey: queryKeys.score(petId),
    queryFn: () => api.get<LongevityScore>(`/pets/${petId}/score`),
    enabled: !!petId,
    staleTime: 10 * 60 * 1000, // 10 min (scores don't change that fast)
  });
}

/** Fetch score history for trend chart */
export function useScoreHistory(petId: string) {
  return useQuery({
    queryKey: queryKeys.scoreHistory(petId),
    queryFn: () => api.get<Array<{ score: number; computedAt: string; factors: any }>>(
      `/pets/${petId}/score/history`
    ),
    enabled: !!petId,
  });
}

/** Force score recomputation */
export function useRecomputeScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (petId: string) => api.post<LongevityScore>(`/pets/${petId}/score/recompute`),
    onSuccess: (score, petId) => {
      queryClient.setQueryData(queryKeys.score(petId), score);
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreHistory(petId) });
    },
  });
}

// ─────────────────────────────────────────────
// NUTRITION HOOKS
// ─────────────────────────────────────────────

/** Fetch active nutrition plan */
export function useNutritionPlan(petId: string) {
  return useQuery({
    queryKey: queryKeys.nutritionPlan(petId),
    queryFn: () => api.get<NutritionPlan>(`/pets/${petId}/nutrition/plan`),
    enabled: !!petId,
  });
}

/** Generate new meal plan */
export function useGeneratePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (petId: string) => api.post<NutritionPlan>(`/pets/${petId}/nutrition/plan/generate`),
    onSuccess: (plan, petId) => {
      queryClient.setQueryData(queryKeys.nutritionPlan(petId), plan);
    },
  });
}

/** Log a meal (with optimistic update) */
export function useLogMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ petId, meal }: {
      petId: string;
      meal: {
        type: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "TREAT";
        items: Array<{ foodId?: string; name: string; amountGrams: number; calories?: number }>;
        notes?: string;
      };
    }) => api.post<MealLog>(`/pets/${petId}/meals`, meal),

    // Optimistic update: add meal to cache immediately
    onMutate: async ({ petId, meal }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.meals(petId) });
      const previous = queryClient.getQueryData(queryKeys.meals(petId));

      queryClient.setQueryData(queryKeys.meals(petId), (old: MealLog[] | undefined) => {
        const optimistic: MealLog = {
          id: `temp_${Date.now()}`,
          petId,
          type: meal.type,
          items: meal.items.map((i) => ({ ...i, amountGrams: i.amountGrams, calories: i.calories || 0 })),
          totalCalories: meal.items.reduce((s, i) => s + (i.calories || 0), 0),
          loggedAt: new Date().toISOString(),
        };
        return [optimistic, ...(old || [])];
      });

      return { previous };
    },

    onError: (_err, { petId }, context) => {
      queryClient.setQueryData(queryKeys.meals(petId), context?.previous);
    },

    onSettled: (_, __, { petId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meals(petId) });
      // Score may change after meal logging
      queryClient.invalidateQueries({ queryKey: queryKeys.score(petId) });
    },
  });
}

/** Fetch meal history */
export function useMeals(petId: string, limit = 20) {
  return useQuery({
    queryKey: queryKeys.meals(petId),
    queryFn: () => api.get<MealLog[]>(`/pets/${petId}/meals`, { limit: String(limit) }),
    enabled: !!petId,
  });
}

// ─────────────────────────────────────────────
// BIOCARD HOOKS
// ─────────────────────────────────────────────

/** Submit BioCard scan */
export function useScanBioCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ petId, imageBase64, cardVersion }: {
      petId: string;
      imageBase64: string;
      cardVersion?: string;
    }) => api.post<{ biomarkers: BiomarkerSet; updatedScore: LongevityScore; scanQuality: number }>(
      `/pets/${petId}/biocard/scan`,
      { imageBase64, cardVersion }
    ),

    onSuccess: (result, { petId }) => {
      queryClient.setQueryData(queryKeys.score(petId), result.updatedScore);
      queryClient.invalidateQueries({ queryKey: queryKeys.biomarkers(petId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.scoreHistory(petId) });
    },
  });
}

/** Fetch biomarker history with trends */
export function useBiomarkers(petId: string) {
  return useQuery({
    queryKey: queryKeys.biomarkers(petId),
    queryFn: () => api.get<{ sets: BiomarkerSet[]; trends: BiomarkerTrend[] }>(
      `/pets/${petId}/biomarkers`
    ),
    enabled: !!petId,
  });
}

// ─────────────────────────────────────────────
// AMBIENT INTELLIGENCE HOOKS
// ─────────────────────────────────────────────

/** Fetch environmental risk report */
export function useEnvironmentRisks(petId: string, lat?: number, lng?: number) {
  return useQuery({
    queryKey: queryKeys.environmentRisks(petId),
    queryFn: () => api.get<any>(`/pets/${petId}/environment`, {
      ...(lat ? { lat: String(lat) } : {}),
      ...(lng ? { lng: String(lng) } : {}),
    }),
    enabled: !!petId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/** Fetch care timeline */
export function useCareTimeline(petId: string) {
  return useQuery({
    queryKey: queryKeys.careTimeline(petId),
    queryFn: () => api.get<any[]>(`/pets/${petId}/care/timeline`),
    enabled: !!petId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/** Fetch behavioral insights */
export function useBehavioralInsights(petId: string) {
  return useQuery({
    queryKey: queryKeys.behavioralInsights(petId),
    queryFn: () => api.get<any[]>(`/pets/${petId}/behavioral/insights`),
    enabled: !!petId,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
  });
}

/** Fetch food safety alerts */
export function useFoodAlerts(petId: string) {
  return useQuery({
    queryKey: queryKeys.foodAlerts(petId),
    queryFn: () => api.get<any[]>(`/pets/${petId}/food/alerts`),
    enabled: !!petId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ─────────────────────────────────────────────
// FOOD SEARCH
// ─────────────────────────────────────────────

/** Search food database */
export function useFoodSearch(query: string, species?: string) {
  return useQuery({
    queryKey: queryKeys.foodSearch(query),
    queryFn: () => api.get<any[]>("/foods/search", {
      q: query,
      ...(species ? { species } : {}),
    }),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────
// PHOTO VITALS
// ─────────────────────────────────────────────

/** Submit photo for vitals analysis */
export function useAnalyzePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ petId, imageBase64 }: { petId: string; imageBase64: string }) =>
      api.post<any>(`/pets/${petId}/photo-vitals`, { imageBase64 }),

    onSuccess: (_, { petId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pet(petId) });
    },
  });
}

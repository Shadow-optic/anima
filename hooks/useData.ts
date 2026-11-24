/**
 * Data hooks. Every screen reads and writes through these.
 *
 * Reads come from the repo (this browser for guests, Supabase for accounts).
 * The Score and food ratings are computed on the client from that data, so
 * they update the moment a meal or care event is saved.
 */

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRepo } from "@/lib/repo";
import { useAuthStore, usePetStore } from "@/stores";
import { SAMPLE_CATALOG } from "@/shared/food/catalog";
import { rateFood, type FoodRating } from "@/shared/food/rating";
import {
  ALGORITHM_VERSION,
  computeLongevityScore,
  petContext,
  summariseCare,
  summariseDiet,
  type DietSummary,
} from "@/shared/score/longevity";
import type {
  CareEvent,
  FoodProduct,
  LongevityScore,
  MealLog,
  NewCareEvent,
  NewMealLog,
  NewPet,
  Pet,
  ScoreSnapshot,
} from "@/shared/types";

function useRepo() {
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.userId);
  const repo = useMemo(() => getRepo(status === "account"), [status]);
  // Cache is keyed by who is looking, so one user's data never shows for another.
  const scope = status === "account" ? userId ?? "account" : "guest";
  return { repo, scope, ready: status !== "loading" };
}

const keys = {
  pets: (scope: string) => ["pets", scope] as const,
  meals: (scope: string, petId: string) => ["meals", scope, petId] as const,
  care: (scope: string, petId: string) => ["care", scope, petId] as const,
  foods: (scope: string) => ["foods", scope] as const,
  snapshots: (scope: string, petId: string) => ["snapshots", scope, petId] as const,
};

// ── Pets ──────────────────────────────────────

export function usePets() {
  const { repo, scope, ready } = useRepo();
  return useQuery({ queryKey: keys.pets(scope), queryFn: () => repo.listPets(), enabled: ready });
}

/** The selected pet, defaulting to the first one. */
export function useActivePet(): { pet: Pet | null; pets: Pet[]; isLoading: boolean } {
  const { data: pets, isPending } = usePets();
  const { activePetId, setActivePetId } = usePetStore();
  const pet = pets?.find((p) => p.id === activePetId) ?? pets?.[0] ?? null;
  useEffect(() => {
    if (pet && pet.id !== activePetId) setActivePetId(pet.id);
  }, [pet?.id, activePetId]);
  return { pet, pets: pets ?? [], isLoading: isPending };
}

export function useCreatePet() {
  const { repo, scope } = useRepo();
  const qc = useQueryClient();
  const setActivePetId = usePetStore((s) => s.setActivePetId);
  return useMutation({
    mutationFn: (pet: NewPet) => repo.createPet(pet),
    onSuccess: (pet) => {
      qc.setQueryData<Pet[]>(keys.pets(scope), (old) => [...(old ?? []), pet]);
      setActivePetId(pet.id);
    },
  });
}

export function useUpdatePet() {
  const { repo, scope } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NewPet> }) => repo.updatePet(id, patch),
    onSuccess: (pet) => {
      qc.setQueryData<Pet[]>(keys.pets(scope), (old) => (old ?? []).map((p) => (p.id === pet.id ? pet : p)));
    },
  });
}

export function useDeletePet() {
  const { repo, scope } = useRepo();
  const qc = useQueryClient();
  const setActivePetId = usePetStore((s) => s.setActivePetId);
  return useMutation({
    mutationFn: (id: string) => repo.deletePet(id),
    onSuccess: (_void, id) => {
      qc.setQueryData<Pet[]>(keys.pets(scope), (old) => (old ?? []).filter((p) => p.id !== id));
      setActivePetId(null);
    },
  });
}

// ── Foods ─────────────────────────────────────

/** Catalog plus the user's own label entries. */
export function useFoods(): { foods: FoodProduct[]; byId: Map<string, FoodProduct> } {
  const { repo, scope, ready } = useRepo();
  const { data: custom } = useQuery({ queryKey: keys.foods(scope), queryFn: () => repo.listCustomFoods(), enabled: ready });
  return useMemo(() => {
    const foods = [...(custom ?? []), ...SAMPLE_CATALOG];
    return { foods, byId: new Map(foods.map((f) => [f.id, f])) };
  }, [custom]);
}

export function useAddCustomFood() {
  const { repo, scope } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (food: Omit<FoodProduct, "id">) => repo.addCustomFood(food),
    onSuccess: (food) => {
      qc.setQueryData<FoodProduct[]>(keys.foods(scope), (old) => [...(old ?? []), food]);
    },
  });
}

/** Rate a food for the given pet (or generically when there is no pet). */
export function useFoodRating(food: FoodProduct | undefined, pet: Pet | null): FoodRating | null {
  return useMemo(() => (food ? rateFood(food, pet ? petContext(pet) : undefined) : null), [food, pet]);
}

// ── Meals ─────────────────────────────────────

export function useMeals(petId: string | undefined) {
  const { repo, scope, ready } = useRepo();
  return useQuery({
    queryKey: keys.meals(scope, petId ?? ""),
    queryFn: () => repo.listMeals(petId!),
    enabled: ready && !!petId,
  });
}

export function useLogMeal() {
  const { repo, scope } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meal: NewMealLog) => repo.addMeal(meal),
    onSuccess: (meal) => {
      qc.setQueryData<MealLog[]>(keys.meals(scope, meal.petId), (old) => [meal, ...(old ?? [])]);
    },
  });
}

export function useDeleteMeal() {
  const { repo, scope } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meal: MealLog) => repo.deleteMeal(meal.id),
    onSuccess: (_void, meal) => {
      qc.setQueryData<MealLog[]>(keys.meals(scope, meal.petId), (old) => (old ?? []).filter((m) => m.id !== meal.id));
    },
  });
}

// ── Care ──────────────────────────────────────

export function useCare(petId: string | undefined) {
  const { repo, scope, ready } = useRepo();
  return useQuery({
    queryKey: keys.care(scope, petId ?? ""),
    queryFn: () => repo.listCare(petId!),
    enabled: ready && !!petId,
  });
}

export function useAddCare() {
  const { repo, scope } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (event: NewCareEvent) => repo.addCare(event),
    onSuccess: (event) => {
      qc.setQueryData<CareEvent[]>(keys.care(scope, event.petId), (old) =>
        [event, ...(old ?? [])].sort((a, b) => b.date.localeCompare(a.date))
      );
    },
  });
}

export function useDeleteCare() {
  const { repo, scope } = useRepo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (event: CareEvent) => repo.deleteCare(event.id),
    onSuccess: (_void, event) => {
      qc.setQueryData<CareEvent[]>(keys.care(scope, event.petId), (old) => (old ?? []).filter((e) => e.id !== event.id));
    },
  });
}

// ── Score ─────────────────────────────────────

export interface PetScore {
  score: LongevityScore | null;
  diet: DietSummary | null;
  /** True while meals or care records are still loading. */
  isLoading: boolean;
}

/** Live Score for a pet, recomputed whenever its data changes. */
export function usePetScore(pet: Pet | null): PetScore {
  const { data: meals } = useMeals(pet?.id);
  const { data: care } = useCare(pet?.id);
  const { byId } = useFoods();

  return useMemo(() => {
    if (!pet) return { score: null, diet: null, isLoading: false };
    if (!meals || !care) return { score: null, diet: null, isLoading: true };
    const diet = summariseDiet(pet, meals, byId);
    const score = computeLongevityScore({ pet, diet, care: summariseCare(care) });
    return { score, diet, isLoading: false };
  }, [pet, meals, care, byId]);
}

export function useSnapshots(petId: string | undefined) {
  const { repo, scope, ready } = useRepo();
  return useQuery({
    queryKey: keys.snapshots(scope, petId ?? ""),
    queryFn: () => repo.listSnapshots(petId!),
    enabled: ready && !!petId,
  });
}

/** Keep one Score per pet per day so the trend line has history. */
export function useRecordSnapshot(pet: Pet | null, score: LongevityScore | null) {
  const { repo, scope } = useRepo();
  const qc = useQueryClient();
  const value = score?.score;
  useEffect(() => {
    if (!pet || !score) return;
    const day = new Date().toISOString().slice(0, 10);
    const key = keys.snapshots(scope, pet.id);
    const existing = qc.getQueryData<ScoreSnapshot[]>(key)?.find((s) => s.day === day);
    if (existing?.score === score.score) return;
    const snapshot: ScoreSnapshot = {
      petId: pet.id,
      day,
      score: score.score,
      factors: score.factors,
      algorithmVersion: ALGORITHM_VERSION,
    };
    repo
      .saveSnapshot(snapshot)
      .then(() => {
        qc.setQueryData<ScoreSnapshot[]>(key, (old) => [...(old ?? []).filter((s) => s.day !== day), snapshot]);
      })
      .catch(() => {
        // The trend line is a nicety; never surface a failure to save it.
      });
  }, [pet?.id, value, scope]);
}

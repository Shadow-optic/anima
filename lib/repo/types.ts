import type {
  CareEvent,
  FoodProduct,
  MealLog,
  NewCareEvent,
  NewMealLog,
  NewPet,
  Pet,
  ScoreSnapshot,
} from "@/shared/types";

/**
 * Persistence boundary. Two implementations:
 *   - LocalRepo: this browser only (guests, and when Supabase is not configured)
 *   - SupabaseRepo: the signed-in user's account
 * Screens never know which one they are talking to.
 */
export interface Repo {
  readonly kind: "local" | "account";

  listPets(): Promise<Pet[]>;
  createPet(pet: NewPet): Promise<Pet>;
  updatePet(id: string, patch: Partial<NewPet>): Promise<Pet>;
  deletePet(id: string): Promise<void>;

  listMeals(petId: string): Promise<MealLog[]>;
  addMeal(meal: NewMealLog): Promise<MealLog>;
  deleteMeal(id: string): Promise<void>;

  listCare(petId: string): Promise<CareEvent[]>;
  addCare(event: NewCareEvent): Promise<CareEvent>;
  deleteCare(id: string): Promise<void>;

  listCustomFoods(): Promise<FoodProduct[]>;
  addCustomFood(food: Omit<FoodProduct, "id">): Promise<FoodProduct>;

  listSnapshots(petId: string): Promise<ScoreSnapshot[]>;
  saveSnapshot(snapshot: ScoreSnapshot): Promise<void>;
}

/** Meals older than this are not needed for scoring or display. */
export const MEAL_HISTORY_DAYS = 30;

export function totalCalories(items: NewMealLog["items"]): number {
  return Math.round(items.reduce((sum, i) => sum + (Number.isFinite(i.calories) ? i.calories : 0), 0));
}

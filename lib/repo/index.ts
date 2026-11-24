import { supabase } from "@/config/supabase";
import { clearLocal, LocalRepo, readLocal } from "./local";
import { SupabaseRepo } from "./supabase";
import type { Repo } from "./types";

const local = new LocalRepo();
const account = supabase ? new SupabaseRepo(supabase) : null;

/** The repo for the current session: the account when signed in, this browser otherwise. */
export function getRepo(signedIn: boolean): Repo {
  return signedIn && account ? account : local;
}

/**
 * After a guest signs up, move what they created in this browser into their
 * account so the Score they just saw is not lost. Each pet is removed from the
 * browser as soon as it is copied. Returns the number of pets moved.
 */
export async function moveGuestDataToAccount(): Promise<number> {
  if (!account) return 0;
  const data = readLocal();
  if (data.pets.length === 0) return 0;

  const foodIds = new Map<string, string>();
  for (const food of data.foods) {
    const { id, ownerId, createdAt, ...rest } = food;
    const saved = await account.addCustomFood(rest);
    foodIds.set(id, saved.id);
  }
  const mapFood = (id: string | null) => (id && foodIds.has(id) ? foodIds.get(id)! : id);

  for (const pet of data.pets) {
    const { id, userId, createdAt, updatedAt, ...rest } = pet;
    const saved = await account.createPet({ ...rest, primaryFoodId: mapFood(rest.primaryFoodId) });
    for (const meal of data.meals.filter((m) => m.petId === id)) {
      await account.addMeal({
        petId: saved.id,
        type: meal.type,
        loggedAt: meal.loggedAt,
        items: meal.items.map((i) => ({ ...i, foodId: mapFood(i.foodId) })),
      });
    }
    for (const event of data.care.filter((c) => c.petId === id)) {
      await account.addCare({ petId: saved.id, kind: event.kind, date: event.date, note: event.note });
    }
    for (const snap of data.snapshots.filter((s) => s.petId === id)) {
      await account.saveSnapshot({ ...snap, petId: saved.id });
    }
    // Drop each pet from the browser once it is safely copied, so a retry
    // after a network failure cannot create it twice.
    await local.deletePet(id);
  }
  clearLocal();
  return data.pets.length;
}

export type { Repo } from "./types";

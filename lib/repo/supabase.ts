/**
 * SupabaseRepo: the signed-in user's data in Postgres.
 * Row level security scopes every query to the user, so no user id is sent.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CareEvent, FoodProduct, MealLog, NewPet, Pet, ScoreSnapshot } from "@/shared/types";
import { MEAL_HISTORY_DAYS, totalCalories, type Repo } from "./types";

function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data == null) throw new Error("No data returned");
  return result.data;
}

function check(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message);
}

function petFromRow(r: any): Pet {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    species: r.species,
    breed: r.breed,
    dateOfBirth: new Date(r.date_of_birth).toISOString(),
    sex: r.sex,
    neutered: r.neutered,
    weightKg: Number(r.weight_kg),
    bodyCondition: r.body_condition,
    activityMinutesPerDay: r.activity_minutes_per_day,
    primaryFoodId: r.primary_food_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function petToRow(p: Partial<NewPet>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.species !== undefined) row.species = p.species;
  if (p.breed !== undefined) row.breed = p.breed;
  if (p.dateOfBirth !== undefined) row.date_of_birth = p.dateOfBirth.slice(0, 10);
  if (p.sex !== undefined) row.sex = p.sex;
  if (p.neutered !== undefined) row.neutered = p.neutered;
  if (p.weightKg !== undefined) row.weight_kg = p.weightKg;
  if (p.bodyCondition !== undefined) row.body_condition = p.bodyCondition;
  if (p.activityMinutesPerDay !== undefined) row.activity_minutes_per_day = p.activityMinutesPerDay;
  if (p.primaryFoodId !== undefined) row.primary_food_id = p.primaryFoodId;
  return row;
}

function mealFromRow(r: any): MealLog {
  return {
    id: r.id,
    petId: r.pet_id,
    type: r.type,
    items: Array.isArray(r.items) ? r.items : [],
    totalCalories: r.total_calories,
    loggedAt: r.logged_at,
  };
}

function careFromRow(r: any): CareEvent {
  return { id: r.id, petId: r.pet_id, kind: r.kind, date: r.date, note: r.note ?? undefined, createdAt: r.created_at };
}

export class SupabaseRepo implements Repo {
  readonly kind = "account" as const;

  constructor(private db: SupabaseClient) {}

  async listPets() {
    return must(await this.db.from("pets").select("*").order("created_at")).map(petFromRow);
  }

  async createPet(pet: NewPet) {
    return petFromRow(must(await this.db.from("pets").insert(petToRow(pet)).select().single()));
  }

  async updatePet(id: string, patch: Partial<NewPet>) {
    return petFromRow(must(await this.db.from("pets").update(petToRow(patch)).eq("id", id).select().single()));
  }

  async deletePet(id: string) {
    check(await this.db.from("pets").delete().eq("id", id));
  }

  async listMeals(petId: string) {
    const since = new Date(Date.now() - MEAL_HISTORY_DAYS * 86400000).toISOString();
    return must(
      await this.db.from("meal_logs").select("*").eq("pet_id", petId).gte("logged_at", since).order("logged_at", { ascending: false })
    ).map(mealFromRow);
  }

  async addMeal(meal: Parameters<Repo["addMeal"]>[0]) {
    return mealFromRow(
      must(
        await this.db
          .from("meal_logs")
          .insert({
            pet_id: meal.petId,
            type: meal.type,
            items: meal.items,
            total_calories: totalCalories(meal.items),
            ...(meal.loggedAt ? { logged_at: meal.loggedAt } : {}),
          })
          .select()
          .single()
      )
    );
  }

  async deleteMeal(id: string) {
    check(await this.db.from("meal_logs").delete().eq("id", id));
  }

  async listCare(petId: string) {
    return must(await this.db.from("care_events").select("*").eq("pet_id", petId).order("date", { ascending: false })).map(careFromRow);
  }

  async addCare(event: Parameters<Repo["addCare"]>[0]) {
    return careFromRow(
      must(
        await this.db
          .from("care_events")
          .insert({ pet_id: event.petId, kind: event.kind, date: event.date, note: event.note ?? null })
          .select()
          .single()
      )
    );
  }

  async deleteCare(id: string) {
    check(await this.db.from("care_events").delete().eq("id", id));
  }

  async listCustomFoods() {
    const rows = must(await this.db.from("custom_foods").select("*").order("created_at"));
    return rows.map((r: any) => ({ ...(r.data as FoodProduct), id: `c-${r.id}`, ownerId: r.user_id, createdAt: r.created_at }));
  }

  async addCustomFood(food: Omit<FoodProduct, "id">) {
    const r: any = must(await this.db.from("custom_foods").insert({ data: food }).select().single());
    return { ...(r.data as FoodProduct), id: `c-${r.id}`, ownerId: r.user_id, createdAt: r.created_at };
  }

  async listSnapshots(petId: string) {
    const rows = must(await this.db.from("score_snapshots").select("*").eq("pet_id", petId).order("day"));
    return rows.map(
      (r: any): ScoreSnapshot => ({ petId: r.pet_id, day: r.day, score: r.score, factors: r.factors, algorithmVersion: r.algorithm_version })
    );
  }

  async saveSnapshot(s: ScoreSnapshot) {
    check(
      await this.db
        .from("score_snapshots")
        .upsert({ pet_id: s.petId, day: s.day, score: s.score, factors: s.factors, algorithm_version: s.algorithmVersion })
    );
  }
}

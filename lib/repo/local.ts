/**
 * LocalRepo: everything in this browser's localStorage.
 *
 * This is what a visitor uses before creating an account, so the first Score
 * needs no sign-up. On native (no localStorage) it falls back to memory.
 */

import type { CareEvent, FoodProduct, MealLog, Pet, ScoreSnapshot } from "@/shared/types";
import { MEAL_HISTORY_DAYS, totalCalories, type Repo } from "./types";

const KEY = "anima.local.v1";
export const LOCAL_USER_ID = "local";

interface LocalData {
  pets: Pet[];
  meals: MealLog[];
  care: CareEvent[];
  foods: FoodProduct[];
  snapshots: ScoreSnapshot[];
}

const EMPTY: LocalData = { pets: [], meals: [], care: [], foods: [], snapshots: [] };
let memory: string | null = null;

function storage(): Storage | null {
  try {
    return typeof globalThis !== "undefined" && "localStorage" in globalThis ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

export function readLocal(): LocalData {
  try {
    const raw = storage()?.getItem(KEY) ?? memory;
    if (!raw) return structuredCloneSafe(EMPTY);
    const parsed = JSON.parse(raw);
    return {
      pets: Array.isArray(parsed.pets) ? parsed.pets : [],
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      care: Array.isArray(parsed.care) ? parsed.care : [],
      foods: Array.isArray(parsed.foods) ? parsed.foods : [],
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
    };
  } catch {
    return structuredCloneSafe(EMPTY);
  }
}

function writeLocal(data: LocalData): void {
  const raw = JSON.stringify(data);
  memory = raw;
  try {
    storage()?.setItem(KEY, raw);
  } catch {
    // Storage full or blocked: keep working from memory for this visit.
  }
}

export function clearLocal(): void {
  memory = null;
  try {
    storage()?.removeItem(KEY);
  } catch {
    // ignore
  }
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function newId(): string {
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class LocalRepo implements Repo {
  readonly kind = "local" as const;

  async listPets() {
    return readLocal().pets;
  }

  async createPet(pet: Parameters<Repo["createPet"]>[0]) {
    const data = readLocal();
    const now = new Date().toISOString();
    const created: Pet = { ...pet, id: newId(), userId: LOCAL_USER_ID, createdAt: now, updatedAt: now };
    data.pets.push(created);
    writeLocal(data);
    return created;
  }

  async updatePet(id: string, patch: Parameters<Repo["updatePet"]>[1]) {
    const data = readLocal();
    const idx = data.pets.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error("Pet not found");
    data.pets[idx] = { ...data.pets[idx], ...patch, updatedAt: new Date().toISOString() };
    writeLocal(data);
    return data.pets[idx];
  }

  async deletePet(id: string) {
    const data = readLocal();
    data.pets = data.pets.filter((p) => p.id !== id);
    data.meals = data.meals.filter((m) => m.petId !== id);
    data.care = data.care.filter((c) => c.petId !== id);
    data.snapshots = data.snapshots.filter((s) => s.petId !== id);
    writeLocal(data);
  }

  async listMeals(petId: string) {
    const cutoff = Date.now() - MEAL_HISTORY_DAYS * 86400000;
    return readLocal()
      .meals.filter((m) => m.petId === petId && new Date(m.loggedAt).getTime() >= cutoff)
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  }

  async addMeal(meal: Parameters<Repo["addMeal"]>[0]) {
    const data = readLocal();
    const created: MealLog = {
      id: newId(),
      petId: meal.petId,
      type: meal.type,
      items: meal.items,
      totalCalories: totalCalories(meal.items),
      loggedAt: meal.loggedAt ?? new Date().toISOString(),
    };
    data.meals.push(created);
    writeLocal(data);
    return created;
  }

  async deleteMeal(id: string) {
    const data = readLocal();
    data.meals = data.meals.filter((m) => m.id !== id);
    writeLocal(data);
  }

  async listCare(petId: string) {
    return readLocal()
      .care.filter((c) => c.petId === petId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async addCare(event: Parameters<Repo["addCare"]>[0]) {
    const data = readLocal();
    const created: CareEvent = { ...event, id: newId(), createdAt: new Date().toISOString() };
    data.care.push(created);
    writeLocal(data);
    return created;
  }

  async deleteCare(id: string) {
    const data = readLocal();
    data.care = data.care.filter((c) => c.id !== id);
    writeLocal(data);
  }

  async listCustomFoods() {
    return readLocal().foods;
  }

  async addCustomFood(food: Omit<FoodProduct, "id">) {
    const data = readLocal();
    const created: FoodProduct = { ...food, id: `c-${newId()}`, ownerId: LOCAL_USER_ID, createdAt: new Date().toISOString() };
    data.foods.push(created);
    writeLocal(data);
    return created;
  }

  async listSnapshots(petId: string) {
    return readLocal()
      .snapshots.filter((s) => s.petId === petId)
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  async saveSnapshot(snapshot: ScoreSnapshot) {
    const data = readLocal();
    data.snapshots = data.snapshots.filter((s) => !(s.petId === snapshot.petId && s.day === snapshot.day));
    data.snapshots.push(snapshot);
    writeLocal(data);
  }
}

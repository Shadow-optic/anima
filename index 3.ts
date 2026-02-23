/**
 * ANIMA Global State (Zustand)
 * 
 * Zustand for sync state (auth, active pet, UI).
 * TanStack Query for server state (pets, scores, meals).
 * MMKV for offline persistence.
 */

import {create} from "zustand";
import {MMKV} from "react-native-mmkv";
import type {LongevityScore, Pet, Tier} from "../../shared/types";

// ─────────────────────────────────────────────
// Offline Storage
// ─────────────────────────────────────────────

export const storage = new MMKV({ id: "anima-store" });

// ─────────────────────────────────────────────
// Auth Store
// ─────────────────────────────────────────────

interface AuthState {
  userId: string | null;
  email: string | null;
  name: string | null;
  tier: Tier;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: { id: string; email: string; name?: string; tier: Tier }) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  name: null,
  tier: "FREE",
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({
      userId: user.id,
      email: user.email,
      name: user.name || null,
      tier: user.tier,
      isAuthenticated: true,
      isLoading: false,
    }),

  clearUser: () =>
    set({
      userId: null,
      email: null,
      name: null,
      tier: "FREE",
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),
}));

// ─────────────────────────────────────────────
// Pet Store (active pet selection)
// ─────────────────────────────────────────────

interface PetState {
  activePetId: string | null;
  activePet: Pet | null;
  activeScore: LongevityScore | null;

  setActivePet: (pet: Pet, score?: LongevityScore) => void;
  setActiveScore: (score: LongevityScore) => void;
  clearActivePet: () => void;
}

export const usePetStore = create<PetState>((set) => {
  // Restore from offline storage
  const savedPetId = storage.getString("activePetId") || null;

  return {
    activePetId: savedPetId,
    activePet: null,
    activeScore: null,

    setActivePet: (pet, score) => {
      storage.set("activePetId", pet.id);
      set({ activePetId: pet.id, activePet: pet, activeScore: score || null });
    },

    setActiveScore: (score) => set({ activeScore: score }),

    clearActivePet: () => {
      storage.delete("activePetId");
      set({ activePetId: null, activePet: null, activeScore: null });
    },
  };
});

// ─────────────────────────────────────────────
// UI Store
// ─────────────────────────────────────────────

interface UIState {
  isDarkMode: boolean;
  bottomSheetOpen: boolean;
  bottomSheetContent: string | null;
  onboardingComplete: boolean;
  voiceMonitorActive: boolean;

  toggleDarkMode: () => void;
  openBottomSheet: (content: string) => void;
  closeBottomSheet: () => void;
  setOnboardingComplete: () => void;
  setVoiceMonitor: (active: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDarkMode: true,
  bottomSheetOpen: false,
  bottomSheetContent: null,
  onboardingComplete: storage.getBoolean("onboardingComplete") || false,
  voiceMonitorActive: false,

  toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
  openBottomSheet: (content) => set({ bottomSheetOpen: true, bottomSheetContent: content }),
  closeBottomSheet: () => set({ bottomSheetOpen: false, bottomSheetContent: null }),
  setOnboardingComplete: () => {
    storage.set("onboardingComplete", true);
    set({ onboardingComplete: true });
  },
  setVoiceMonitor: (active) => set({ voiceMonitorActive: active }),
}));

// ─────────────────────────────────────────────
// Offline Queue (for offline-first meal logging etc.)
// ─────────────────────────────────────────────

interface OfflineAction {
  id: string;
  type: "log_meal" | "update_weight" | "log_photo";
  payload: any;
  createdAt: string;
}

interface OfflineState {
  pendingActions: OfflineAction[];
  addAction: (action: Omit<OfflineAction, "id" | "createdAt">) => void;
  removeAction: (id: string) => void;
  clearAll: () => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  pendingActions: JSON.parse(storage.getString("pendingActions") || "[]"),

  addAction: (action) =>
    set((state) => {
      const newAction: OfflineAction = {
        ...action,
        id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [...state.pendingActions, newAction];
      storage.set("pendingActions", JSON.stringify(updated));
      return { pendingActions: updated };
    }),

  removeAction: (id) =>
    set((state) => {
      const updated = state.pendingActions.filter((a) => a.id !== id);
      storage.set("pendingActions", JSON.stringify(updated));
      return { pendingActions: updated };
    }),

  clearAll: () => {
    storage.set("pendingActions", "[]");
    set({ pendingActions: [] });
  },
}));

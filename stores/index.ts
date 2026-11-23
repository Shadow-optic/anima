/**
 * Client state (Zustand).
 * Server/persisted data goes through TanStack Query and the repo; this holds
 * only who is signed in and which pet is selected.
 */

import { create } from "zustand";

function readPref(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writePref(key: string, value: string | null): void {
  try {
    if (value == null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    // ignore
  }
}

export type AuthStatus = "loading" | "guest" | "account";

interface AuthState {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  setAccount: (user: { id: string; email: string | null }) => void;
  setGuest: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  userId: null,
  email: null,
  setAccount: (user) => set({ status: "account", userId: user.id, email: user.email }),
  setGuest: () => set({ status: "guest", userId: null, email: null }),
}));

interface PetState {
  activePetId: string | null;
  setActivePetId: (id: string | null) => void;
}

export const usePetStore = create<PetState>((set) => ({
  activePetId: readPref("anima.activePetId"),
  setActivePetId: (id) => {
    writePref("anima.activePetId", id);
    set({ activePetId: id });
  },
}));

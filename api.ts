/**
 * ANIMA API Configuration
 * Supabase client + REST API client
 */

import {createClient} from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import {Platform} from "react-native";

// ─────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────

const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key",
  API_URL: process.env.EXPO_PUBLIC_API_URL || "https://api.animapet.com",
} as const;

// ─────────────────────────────────────────────
// Supabase Client (Auth, DB, Storage)
// ─────────────────────────────────────────────

/**
 * Custom storage adapter using expo-secure-store for auth tokens.
 * Secure on-device storage, encrypted at rest on both iOS and Android.
 */
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Fallback for web
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Fallback for web
    }
  },
};

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─────────────────────────────────────────────
// REST API Client
// ─────────────────────────────────────────────

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  body?: any;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(method: HttpMethod, path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const headers = { ...(await this.getAuthHeaders()), ...options?.headers };

    const response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Network error" }));
      throw new ApiError(response.status, error.error?.code || "UNKNOWN", error.error?.message || "Something went wrong");
    }

    const data = await response.json();
    return data.data as T;
  }

  // Convenience methods
  get<T>(path: string, params?: Record<string, string>) {
    return this.request<T>("GET", path, { params });
  }

  post<T>(path: string, body?: any) {
    return this.request<T>("POST", path, { body });
  }

  put<T>(path: string, body?: any) {
    return this.request<T>("PUT", path, { body });
  }

  patch<T>(path: string, body?: any) {
    return this.request<T>("PATCH", path, { body });
  }

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Platform": Platform.OS,
      "X-App-Version": "1.0.0",
    };
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const api = new ApiClient(ENV.API_URL);
export { ENV };

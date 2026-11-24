/**
 * Supabase client: the one backend ANIMA uses for accounts and saved data.
 *
 * Configure with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 * (see .env.example). Without them the site still works in guest mode, with
 * data kept in the visitor's browser, and the sign-in screens are hidden.
 *
 * The anon key is public by design. Row level security in
 * supabase/migrations is what protects each user's data.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  /^https?:\/\//.test(url) && anonKey.length > 20 && !url.includes("your-project");

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Email confirmation and OAuth return to the site with the session in the URL.
        detectSessionInUrl: true,
      },
    })
  : null;

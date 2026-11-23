/**
 * Root layout: query client and the auth listener.
 *
 * Nothing here forces a sign-in. A visitor can get a Score as a guest; an
 * account only decides where the data is saved.
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/config/supabase";
import { theme } from "@/config/theme";
import { moveGuestDataToAccount } from "@/lib/repo";
import { useAuthStore } from "@/stores";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000, refetchOnWindowFocus: false } },
});

export default function RootLayout() {
  const setAccount = useAuthStore((s) => s.setAccount);
  const setGuest = useAuthStore((s) => s.setGuest);

  useEffect(() => {
    if (!supabase) {
      setGuest();
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase calls must not run inside this callback, so defer them.
      setTimeout(async () => {
        if (!session?.user) {
          setGuest();
          return;
        }
        try {
          await moveGuestDataToAccount();
        } catch {
          // Guest data stays in this browser and is retried at the next sign-in.
        }
        setAccount({ id: session.user.id, email: session.user.email ?? null });
        queryClient.invalidateQueries();
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [setAccount, setGuest]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background }, animation: "fade" }} />
    </QueryClientProvider>
  );
}

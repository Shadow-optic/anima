/**
 * ANIMA Root Layout
 * 
 * Expo Router file-based routing.
 * Sets up: QueryClient, Auth listener, Splash screen, Tab navigator
 */

import {useEffect} from "react";
import {StatusBar} from "react-native";
import {Stack, useRouter, useSegments} from "expo-router";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import {supabase} from "./config/api";
import {useAuthStore} from "./stores";
import {theme} from "./config/theme";

// Keep splash visible while loading
SplashScreen.preventAutoHideAsync();

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
});

/**
 * Auth guard: redirects to login if not authenticated,
 * or to main app if already authenticated.
 */
function useProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments]);
}

export default function RootLayout() {
  const { setUser, clearUser, setLoading } = useAuthStore();

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user profile from our API
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name,
          tier: "FREE", // Will be updated from API
        });
      } else {
        clearUser();
      }
      setLoading(false);
      await SplashScreen.hideAsync();
    });

    return () => subscription.unsubscribe();
  }, []);

  useProtectedRoute();

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="pet/[id]" />
      </Stack>
    </QueryClientProvider>
  );
}

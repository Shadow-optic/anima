/**
 * Main navigation. A bottom tab bar on phones, a top bar on wide screens.
 */

import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Redirect, Tabs, usePathname, useRouter } from "expo-router";
import { theme } from "@/config/theme";
import { Loading } from "@/components/ui";
import { useActivePet } from "@/hooks/useData";
import { useAuthStore } from "@/stores";

const c = theme.colors;
const ICONS: Record<string, string> = { index: "◎", nutrition: "🍽", shop: "🛍", care: "♡", profile: "○" };

const TABS = [
  { name: "index", title: "Score", href: "/(tabs)", path: "/" },
  { name: "nutrition", title: "Nutrition", href: "/(tabs)/nutrition", path: "/nutrition" },
  { name: "shop", title: "Shop", href: "/(tabs)/shop", path: "/shop" },
  { name: "care", title: "Care", href: "/(tabs)/care", path: "/care" },
  { name: "profile", title: "Profile", href: "/(tabs)/profile", path: "/profile" },
] as const;

function NavBar({ wide, petName }: { wide: boolean; petName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <View accessibilityRole="tablist" style={[s.bar, wide ? s.barTop : s.barBottom]}>
      <View style={[s.inner, wide && s.innerWide]}>
        {wide ? (
          <View style={s.brand}>
            <Text style={s.logo}>ANIMA</Text>
            <Text style={s.pet}>{petName}</Text>
          </View>
        ) : null}
        <View style={wide ? s.tabsWide : s.tabs}>
          {TABS.map((tab) => {
            const focused = pathname === tab.path;
            return (
              <Pressable
                key={tab.name}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tab.title}
                onPress={() => !focused && router.navigate(tab.href as any)}
                style={({ hovered, focused: kb }: any) => [wide ? s.tabWide : s.tab, focused && wide && s.tabWideOn, (hovered || kb) && !focused && { opacity: 0.8 }]}
              >
                {wide ? null : <Text style={[s.icon, { opacity: focused ? 1 : 0.55 }]}>{ICONS[tab.name] ?? "·"}</Text>}
                <Text style={[s.label, wide && { fontSize: 14 }, { color: focused ? c.textPrimary : c.textSecondary }]}>{tab.title}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const status = useAuthStore((st) => st.status);
  const { pet, isLoading } = useActivePet();

  if (status === "loading" || isLoading) return <Loading />;
  if (!pet) return <Redirect href="/" />;

  // The bar is rendered outside the navigator so it can sit above the content
  // on wide screens and below it on phones without overlapping either.
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {wide ? <NavBar wide petName={pet.name} /> : null}
      <View style={{ flex: 1 }}>
        <Tabs tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.background } }}>
          {TABS.map((tab) => (
            <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
          ))}
        </Tabs>
      </View>
      {wide ? null : <NavBar wide={false} petName={pet.name} />}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { backgroundColor: c.background, borderColor: c.surfaceBorder },
  barBottom: { borderTopWidth: 1, paddingBottom: 6 },
  barTop: { borderBottomWidth: 1 },
  inner: { flexDirection: "row", alignItems: "center" },
  innerWide: { maxWidth: 1040, width: "100%", alignSelf: "center", paddingHorizontal: 20, height: 60, justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "baseline", gap: 12 },
  logo: { fontSize: 16, fontWeight: "800", letterSpacing: 4, color: c.textPrimary },
  pet: { fontSize: 13, color: c.textSecondary },
  tabs: { flex: 1, flexDirection: "row" },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, gap: 2, minHeight: 52 },
  tabsWide: { flexDirection: "row", gap: 4 },
  tabWide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 16, minHeight: 40, borderRadius: 10 },
  tabWideOn: { backgroundColor: c.surfaceHover },
  icon: { fontSize: 18, color: c.textPrimary },
  label: { fontSize: 11, fontWeight: "600" },
});

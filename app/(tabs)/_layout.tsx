/**
 * ANIMA Tab Navigator
 *
 * Custom tab bar with the ANIMA aesthetic.
 * 6 tabs: Dashboard, Nutrition, Health, BioCard, Marketplace, Profile
 */

import {Pressable, StyleSheet, Text, View} from "react-native";
import {Tabs} from "expo-router";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {theme} from "@/config/theme";
import {usePetStore} from "@/stores";

// ─────────────────────────────────────────────
// Tab Icons (inline SVG-like components)
// ─────────────────────────────────────────────

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: focused ? "◉" : "◎",           // Dashboard
    nutrition: focused ? "🍽" : "🍽",      // Nutrition
    health: focused ? "♥" : "♡",           // Health
    scan: focused ? "⬡" : "⬢",            // BioCard
    marketplace: focused ? "🛍" : "👜",    // Marketplace
    profile: focused ? "●" : "○",          // Profile
  };

  return (
    <Text style={{
      fontSize: name === "nutrition" ? 18 : 20,
      color: focused ? theme.colors.textPrimary : theme.colors.textTertiary,
      opacity: focused ? 1 : 0.6,
    }}>
      {icons[name] || "·"}
    </Text>
  );
}

// ─────────────────────────────────────────────
// Custom Tab Bar
// ─────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { activePet } = usePetStore();

  return (
    <View style={[
      styles.tabBar,
      { paddingBottom: Math.max(insets.bottom, 8) }
    ]}>
      {/* Active pet indicator */}
      {activePet && (
        <View style={styles.petIndicator}>
          <Text style={styles.petIndicatorText}>
            {activePet.name}
          </Text>
          <View style={[styles.petIndicatorDot, { backgroundColor: theme.colors.success }]} />
        </View>
      )}

      <View style={styles.tabBarInner}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Center tab (BioCard scan) gets special treatment
          const isScanTab = route.name === "scan";

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[
                styles.tab,
                isScanTab && styles.scanTab,
              ]}
            >
              {isScanTab ? (
                <View style={[styles.scanButton, isFocused && styles.scanButtonActive]}>
                  <Text style={styles.scanButtonIcon}>⬡</Text>
                </View>
              ) : (
                <>
                  <TabIcon name={route.name} focused={isFocused} />
                  <Text style={[
                    styles.tabLabel,
                    { color: isFocused ? theme.colors.textPrimary : theme.colors.textTertiary },
                    isFocused && styles.tabLabelActive,
                  ]}>
                    {label}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Tab Layout
// ─────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="nutrition" options={{ title: "Nutrition" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="health" options={{ title: "Health" }} />
      <Tabs.Screen name="marketplace" options={{ title: "Shop" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    paddingTop: 4,
  },
  petIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  petIndicatorText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.textTertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  petIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  tabBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  tabLabelActive: {
    fontWeight: "600",
  },
  scanTab: {
    marginTop: -16,
  },
  scanButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surfaceHover,
    borderWidth: 2,
    borderColor: theme.colors.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonActive: {
    borderColor: theme.colors.biocard,
    backgroundColor: `${theme.colors.biocard}20`,
  },
  scanButtonIcon: {
    fontSize: 22,
    color: theme.colors.biocard,
  },
});

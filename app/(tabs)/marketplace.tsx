import {useMemo} from "react";
import {Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {theme} from "@/config/theme";
import {usePetStore} from "@/stores";
import {useFoodSearch} from "@/hooks/useApi";

const CURATED_QUERIES = ["joint support", "kidney care", "sensitive stomach"];

export default function MarketplaceScreen() {
  const { activePet } = usePetStore();
  const query = useMemo(() => (activePet?.species === "CAT" ? "cat wet food" : "dog food"), [activePet?.species]);
  const { data: products = [] } = useFoodSearch(query, activePet?.species);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Marketplace</Text>
      <Text style={s.subtitle}>Precision nutrition and longevity essentials</Text>

      <View style={s.bundleCard}>
        <Text style={s.bundleTitle}>Recommended Stack</Text>
        <Text style={s.bundleBody}>
          Built from {activePet?.name || "your pet"}'s score profile: anti-inflammatory food base, omega-3 support, and mobility booster.
        </Text>
        <Pressable style={s.bundleButton}>
          <Text style={s.bundleButtonText}>Add Bundle to Cart</Text>
        </Pressable>
      </View>

      <Text style={s.sectionTitle}>Trending Collections</Text>
      <View style={s.tagRow}>
        {CURATED_QUERIES.map((tag) => (
          <View key={tag} style={s.tag}>
            <Text style={s.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <Text style={s.sectionTitle}>Top Matches</Text>
      {products.slice(0, 8).map((product: any, idx) => (
        <View key={product.id || idx} style={s.productCard}>
          <View>
            <Text style={s.productBrand}>{product.brand || "ANIMA Partner"}</Text>
            <Text style={s.productName}>{product.productName || product.name || "Longevity Blend"}</Text>
            <Text style={s.productMeta}>
              {product.caloriesPer100g || 320} kcal/100g · {(product.type || "COMPLETE").toString().replaceAll("_", " ")}
            </Text>
          </View>
          <Pressable style={s.addButton}>
            <Text style={s.addButtonText}>Add</Text>
          </Pressable>
        </View>
      ))}

      {products.length === 0 && (
        <View style={s.emptyCard}>
          <Text style={s.emptyTitle}>Catalog loading</Text>
          <Text style={s.emptyBody}>Start the local mock API to unlock searchable products.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary },
  bundleCard: {
    marginTop: 8,
    backgroundColor: `${theme.colors.accent}14`,
    borderWidth: 1,
    borderColor: `${theme.colors.accent}44`,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  bundleTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.accent },
  bundleBody: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  bundleButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.accent,
  },
  bundleButtonText: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: "700" },
  sectionTitle: { marginTop: 8, fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tagText: { fontSize: 11, color: theme.colors.textSecondary },
  productCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  productBrand: { fontSize: 11, color: theme.colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.7 },
  productName: { marginTop: 4, fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  productMeta: { marginTop: 4, fontSize: 11, color: theme.colors.textSecondary },
  addButton: {
    backgroundColor: `${theme.colors.success}22`,
    borderWidth: 1,
    borderColor: `${theme.colors.success}55`,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addButtonText: { fontSize: 12, fontWeight: "600", color: theme.colors.success },
  emptyCard: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 14,
    backgroundColor: theme.colors.surface,
  },
  emptyTitle: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary },
  emptyBody: { marginTop: 4, fontSize: 12, color: theme.colors.textSecondary },
});

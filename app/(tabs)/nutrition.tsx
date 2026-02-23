/**
 * ANIMA Nutrition Tab
 * 
 * Shows: Active meal plan, meal log, food search, nutrition targets.
 * This is where daily engagement happens — meal logging is the
 * primary user action that feeds the Digital Twin.
 */

import {useCallback, useState} from "react";
import {Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,} from "react-native";
import * as Haptics from "expo-haptics";
import {theme} from "@/config/theme";
import {usePetStore} from "@/stores";
import {useFoodSearch, useGeneratePlan, useLogMeal, useMeals, useNutritionPlan,} from "@/hooks/useApi";

export default function NutritionScreen() {
  const { activePet, activePetId } = usePetStore();
  const [activeView, setActiveView] = useState<"plan" | "log" | "search">("plan");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: plan, refetch: refetchPlan } = useNutritionPlan(activePetId || "");
  const { data: meals, refetch: refetchMeals } = useMeals(activePetId || "");
  const { data: searchResults } = useFoodSearch(searchQuery, activePet?.species);
  const logMeal = useLogMeal();
  const generatePlan = useGeneratePlan();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPlan(), refetchMeals()]);
    setRefreshing(false);
  }, []);

  if (!activePet || !activePetId) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Add a pet to see nutrition plans</Text>
      </View>
    );
  }

  const handleQuickLog = (mealType: "BREAKFAST" | "DINNER" | "SNACK") => {
    if (!plan?.meals) return;

    const plannedMeal = plan.meals.find((m: any) => m.type === mealType);
    if (!plannedMeal) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    logMeal.mutate({
      petId: activePetId,
      meal: {
        type: mealType,
        items: plannedMeal.foods.map((f: any) => ({
          foodId: f.foodId,
          name: `${f.brand} ${f.name}`,
          amountGrams: f.amountGrams,
          calories: f.calories,
        })),
      },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textTertiary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition</Text>
        <Text style={styles.subtitle}>{activePet.name}'s daily plan</Text>
      </View>

      {/* View switcher */}
      <View style={styles.viewSwitcher}>
        {(["plan", "log", "search"] as const).map((view) => (
          <Pressable
            key={view}
            style={[styles.viewTab, activeView === view && styles.viewTabActive]}
            onPress={() => setActiveView(view)}
          >
            <Text style={[styles.viewTabText, activeView === view && styles.viewTabTextActive]}>
              {view === "plan" ? "Today's Plan" : view === "log" ? "Meal Log" : "Find Food"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Meal Plan View ── */}
      {activeView === "plan" && plan && (
        <View>
          {/* Calorie summary */}
          <View style={styles.calorieCard}>
            <View style={styles.calorieHeader}>
              <Text style={styles.calorieTitle}>Daily Target</Text>
              <Pressable
                style={styles.regenerateButton}
                onPress={() => {
                  Alert.alert("Regenerate Plan?", "Create a new meal plan based on latest Twin data?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Regenerate", onPress: () => generatePlan.mutate(activePetId) },
                  ]);
                }}
              >
                <Text style={styles.regenerateText}>↻ New Plan</Text>
              </Pressable>
            </View>
            <Text style={styles.calorieNumber}>{plan.dailyCalories}</Text>
            <Text style={styles.calorieUnit}>kcal/day</Text>

            <View style={styles.macroRow}>
              {[
                { label: "Protein", value: `${Math.round((plan as any).dailyProteinG || 0)}g` },
                { label: "Fat", value: `${Math.round((plan as any).dailyFatG || 0)}g` },
                { label: "Fiber", value: `${Math.round((plan as any).dailyFiberG || 0)}g` },
              ].map((macro) => (
                <View key={macro.label} style={styles.macroItem}>
                  <Text style={styles.macroValue}>{macro.value}</Text>
                  <Text style={styles.macroLabel}>{macro.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Meal cards */}
          {plan.meals?.map((meal: any, i: number) => (
            <View key={i} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <View>
                  <Text style={styles.mealType}>{meal.type}</Text>
                  <Text style={styles.mealTime}>{meal.timing}</Text>
                </View>
                <Text style={styles.mealCalories}>{meal.totalCalories} kcal</Text>
              </View>

              {meal.foods?.map((food: any, j: number) => (
                <View key={j} style={styles.foodItem}>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.brand}</Text>
                    <Text style={styles.foodProduct}>{food.name}</Text>
                  </View>
                  <Text style={styles.foodAmount}>{food.amountGrams}g</Text>
                </View>
              ))}

              {/* Quick log button */}
              <Pressable
                style={styles.quickLogButton}
                onPress={() => handleQuickLog(meal.type)}
              >
                <Text style={styles.quickLogText}>
                  {logMeal.isPending ? "Logging..." : "✓ Log This Meal"}
                </Text>
              </Pressable>
            </View>
          ))}

          {/* Supplements */}
          {plan.supplements && plan.supplements.length > 0 && (
            <View style={styles.supplementSection}>
              <Text style={styles.supplementTitle}>Daily Supplements</Text>
              {plan.supplements.map((supp: any, i: number) => (
                <View key={i} style={styles.supplementItem}>
                  <View style={[styles.supplementDot, {
                    backgroundColor: supp.priority === "essential"
                      ? theme.colors.danger
                      : supp.priority === "recommended"
                      ? theme.colors.warning
                      : theme.colors.info,
                  }]} />
                  <View style={styles.supplementInfo}>
                    <Text style={styles.supplementName}>{supp.name}</Text>
                    <Text style={styles.supplementDose}>{supp.dose} · {supp.frequency}</Text>
                    <Text style={styles.supplementReason}>{supp.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Plan notes */}
          {plan.notes && plan.notes.length > 0 && (
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>Notes</Text>
              {plan.notes.map((note: string, i: number) => (
                <Text key={i} style={styles.noteText}>• {note}</Text>
              ))}
            </View>
          )}

          {/* Hydration reminder */}
          <View style={styles.hydrationCard}>
            <Text style={styles.hydrationIcon}>💧</Text>
            <View>
              <Text style={styles.hydrationTitle}>Hydration Target</Text>
              <Text style={styles.hydrationAmount}>{plan.hydrationTargetMl || Math.round(activePet.weightKg * 55)} mL/day</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Meal Log View ── */}
      {activeView === "log" && (
        <View>
          {meals && meals.length > 0 ? (
            meals.map((meal: any, i: number) => (
              <View key={meal.id || i} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <Text style={styles.logType}>{meal.type}</Text>
                  <Text style={styles.logDate}>
                    {new Date(meal.loggedAt).toLocaleDateString(undefined, {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </Text>
                </View>
                {meal.items?.map((item: any, j: number) => (
                  <Text key={j} style={styles.logFood}>
                    {item.name} — {item.amountGrams}g {item.calories ? `(${item.calories} kcal)` : ""}
                  </Text>
                ))}
                <Text style={styles.logTotal}>
                  Total: {meal.totalCalories || meal.items?.reduce((s: number, i: any) => s + (i.calories || 0), 0)} kcal
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyLog}>
              <Text style={styles.emptyLogText}>No meals logged yet. Start by logging today's meals!</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Food Search View ── */}
      {activeView === "search" && (
        <View>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods, brands..."
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>

          {searchResults && searchResults.map((food: any, i: number) => (
            <Pressable key={food.id || i} style={styles.searchResult}>
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultBrand}>{food.brand}</Text>
                <Text style={styles.searchResultName}>{food.productName}</Text>
                <Text style={styles.searchResultMeta}>
                  {food.caloriesPer100g} kcal/100g · {food.type}
                </Text>
              </View>
              <Pressable style={styles.addFoodButton}>
                <Text style={styles.addFoodText}>+</Text>
              </Pressable>
            </Pressable>
          ))}

          {searchQuery.length >= 2 && (!searchResults || searchResults.length === 0) && (
            <Text style={styles.noResults}>No foods found for "{searchQuery}"</Text>
          )}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: 60, paddingHorizontal: 20 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },

  viewSwitcher: { flexDirection: "row", gap: 4, marginBottom: 20 },
  viewTab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, backgroundColor: "transparent",
  },
  viewTabActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  viewTabText: { fontSize: 13, fontWeight: "500", color: theme.colors.textTertiary },
  viewTabTextActive: { color: theme.colors.textPrimary },

  calorieCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.surfaceBorder,
    padding: 20, alignItems: "center", marginBottom: 16,
  },
  calorieHeader: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 8 },
  calorieTitle: { fontSize: 13, color: theme.colors.textSecondary },
  calorieNumber: { fontSize: 48, fontWeight: "700", color: theme.colors.nutrition },
  calorieUnit: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  macroRow: { flexDirection: "row", gap: 24, marginTop: 16 },
  macroItem: { alignItems: "center" },
  macroValue: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  macroLabel: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },

  regenerateButton: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  regenerateText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: "500" },

  mealCard: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.surfaceBorder,
    padding: 16, marginBottom: 10,
  },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  mealType: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, textTransform: "uppercase", letterSpacing: 0.5 },
  mealTime: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  mealCalories: { fontSize: 15, fontWeight: "600", color: theme.colors.nutrition },

  foodItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.colors.surfaceBorder },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 12, fontWeight: "600", color: theme.colors.textPrimary },
  foodProduct: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 },
  foodAmount: { fontSize: 13, fontWeight: "600", color: theme.colors.textSecondary },

  quickLogButton: { marginTop: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: `${theme.colors.nutrition}15`, alignItems: "center" },
  quickLogText: { fontSize: 13, fontWeight: "600", color: theme.colors.nutrition },

  supplementSection: { marginTop: 16, marginBottom: 16 },
  supplementTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 10 },
  supplementItem: { flexDirection: "row", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceBorder },
  supplementDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  supplementInfo: { flex: 1 },
  supplementName: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary },
  supplementDose: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  supplementReason: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2, fontStyle: "italic" },

  notesCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 16, marginBottom: 12 },
  notesTitle: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 8 },
  noteText: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: 4 },

  hydrationCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: `${theme.colors.info}10`, borderRadius: theme.radius.md,
    padding: 16, marginBottom: 16,
  },
  hydrationIcon: { fontSize: 28 },
  hydrationTitle: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary },
  hydrationAmount: { fontSize: 11, color: theme.colors.info, marginTop: 2 },

  // Log view
  logItem: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.surfaceBorder },
  logHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  logType: { fontSize: 12, fontWeight: "600", color: theme.colors.nutrition, textTransform: "uppercase", letterSpacing: 0.5 },
  logDate: { fontSize: 11, color: theme.colors.textTertiary },
  logFood: { fontSize: 12, color: theme.colors.textSecondary, paddingVertical: 2 },
  logTotal: { fontSize: 12, fontWeight: "600", color: theme.colors.textPrimary, marginTop: 6, borderTopWidth: 1, borderTopColor: theme.colors.surfaceBorder, paddingTop: 6 },
  emptyLog: { padding: 40, alignItems: "center" },
  emptyLogText: { fontSize: 13, color: theme.colors.textTertiary, textAlign: "center" },

  // Search view
  searchBar: { marginBottom: 16 },
  searchInput: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.surfaceBorder,
    padding: 14, fontSize: 14, color: theme.colors.textPrimary,
  },
  searchResult: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceBorder },
  searchResultInfo: { flex: 1 },
  searchResultBrand: { fontSize: 11, fontWeight: "600", color: theme.colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 },
  searchResultName: { fontSize: 14, fontWeight: "500", color: theme.colors.textPrimary, marginTop: 2 },
  searchResultMeta: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  addFoodButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceHover, alignItems: "center", justifyContent: "center" },
  addFoodText: { fontSize: 18, color: theme.colors.textPrimary, fontWeight: "500" },
  noResults: { padding: 20, textAlign: "center", fontSize: 13, color: theme.colors.textTertiary },

  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary },
});

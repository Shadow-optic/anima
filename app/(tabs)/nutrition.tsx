/**
 * Nutrition: calorie target, meal and treat logging, and the week's summary.
 */

import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@/config/theme";
import { Bar, Button, Card, Field, GradeBadge, LinkText, Loading, Notice, PageHeader, Screen, SectionTitle, Segmented, confirmAction } from "@/components/ui";
import { foodTitle } from "@/components/food";
import { useActivePet, useDeleteMeal, useFoods, useLogMeal, useMeals, usePetScore } from "@/hooks/useData";
import { caloriesForGrams, dailyPortionGrams, rateFood } from "@/shared/food/rating";
import { petContext } from "@/shared/score/longevity";

const c = theme.colors;

export default function Nutrition() {
  const router = useRouter();
  const { pet } = useActivePet();
  const { foods, byId } = useFoods();
  const { data: meals } = useMeals(pet?.id);
  const { diet } = usePetScore(pet);
  const logMeal = useLogMeal();
  const deleteMeal = useDeleteMeal();

  const [grams, setGrams] = useState("");
  const [treatId, setTreatId] = useState<string | null>(null);
  const [treatCount, setTreatCount] = useState("1");
  const [message, setMessage] = useState<string | null>(null);

  const mainFood = pet?.primaryFoodId ? byId.get(pet.primaryFoodId) : undefined;
  const ctx = useMemo(() => (pet ? petContext(pet) : null), [pet]);
  const treats = useMemo(
    () => (pet ? foods.filter((f) => f.category !== "COMPLETE" && (f.species === pet.species || f.species === "BOTH")) : []),
    [foods, pet]
  );

  if (!pet || !ctx) return null;
  if (!meals || !diet) return <Loading />;

  const today = new Date().toISOString().slice(0, 10);
  const todayKcal = meals.filter((m) => m.loggedAt.slice(0, 10) === today).reduce((sum, m) => sum + m.totalCalories, 0);
  const target = diet.dailyCalorieTarget;
  const portion = mainFood ? dailyPortionGrams(mainFood, target) : 0;
  const defaultGrams = portion ? Math.round(portion / 2) : 0;
  const gramsNum = grams ? parseFloat(grams) : defaultGrams;
  const treat = treatId ? byId.get(treatId) : treats[0];
  const count = Math.max(1, Math.min(50, parseInt(treatCount, 10) || 1));
  const treatKcal = treat ? (treat.kcalPerTreat != null ? treat.kcalPerTreat * count : caloriesForGrams(treat, 10 * count)) : 0;

  const logMain = () => {
    if (!mainFood || !Number.isFinite(gramsNum) || gramsNum <= 0 || gramsNum > 5000) {
      setMessage("Enter an amount in grams.");
      return;
    }
    const calories = caloriesForGrams(mainFood, gramsNum);
    logMeal.mutate(
      { petId: pet.id, type: "MEAL", items: [{ foodId: mainFood.id, name: foodTitle(mainFood), amountGrams: gramsNum, calories }] },
      { onSuccess: () => setMessage(`Logged ${gramsNum} g (${calories} kcal).`), onError: (e: any) => setMessage(e?.message ?? "Could not save.") }
    );
  };

  const logTreat = () => {
    if (!treat) return;
    logMeal.mutate(
      {
        petId: pet.id,
        type: "TREAT",
        items: [{ foodId: treat.id, name: `${foodTitle(treat)} × ${count}`, amountGrams: treat.kcalPerTreat != null ? 0 : 10 * count, calories: Math.round(treatKcal) }],
      },
      { onSuccess: () => setMessage(`Logged ${count} treat${count === 1 ? "" : "s"} (${Math.round(treatKcal)} kcal).`), onError: (e: any) => setMessage(e?.message ?? "Could not save.") }
    );
  };

  const ratio = target > 0 ? todayKcal / target : 0;
  const treatAllowance = Math.round(target * 0.1);

  return (
    <Screen>
      <PageHeader title="Nutrition" subtitle={`What ${pet.name} eats is 25% of the Longevity Score.`} />

      <Card>
        <View style={s.targetRow}>
          <View>
            <Text style={s.big}>
              {todayKcal} <Text style={s.bigOf}>/ {target} kcal</Text>
            </Text>
            <Text style={s.meta}>logged today against the daily target</Text>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Bar value={Math.min(100, ratio * 100)} color={ratio > 1.1 ? c.warning : c.success} />
        </View>
        <Text style={s.meta}>
          The target is a starting point from {pet.name}'s weight, life stage and body condition. Individual needs vary, so
          adjust it against body condition. Treat allowance: {treatAllowance} kcal a day.
        </Text>
      </Card>

      <SectionTitle>This week</SectionTitle>
      <View style={s.stats}>
        <Stat label="Days logged" value={`${diet.daysLoggedLast7}/7`} />
        <Stat label="Diet quality" value={diet.foodScore != null ? `${diet.foodScore}/100` : "—"} />
        <Stat label="Calories vs target" value={diet.calorieRatio != null ? `${Math.round(diet.calorieRatio * 100)}%` : "—"} />
        <Stat label="From treats" value={diet.treatCalorieShare != null ? `${Math.round(diet.treatCalorieShare * 100)}%` : "—"} warn={(diet.treatCalorieShare ?? 0) > 0.1} />
      </View>
      {diet.daysLoggedLast7 < 3 ? <Text style={s.hint}>Calories and treats are scored once three days are logged.</Text> : null}

      <SectionTitle action="Change food" onAction={() => router.push("/(tabs)/shop")}>
        Log a meal
      </SectionTitle>
      {mainFood ? (
        <Card>
          <View style={s.foodHead}>
            <GradeBadge grade={rateFood(mainFood, ctx).fit?.grade ?? "C"} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.foodName}>{foodTitle(mainFood)}</Text>
              <Text style={s.meta}>About {portion} g a day meets the target.</Text>
            </View>
          </View>
          <View style={s.logRow}>
            <View style={{ flex: 1 }}>
              <Field label="Amount (grams)" value={grams} onChangeText={setGrams} placeholder={String(defaultGrams)} inputMode="decimal" />
            </View>
            <Button title="Log meal" variant="accent" onPress={logMain} loading={logMeal.isPending} style={{ marginTop: 22 }} />
          </View>
        </Card>
      ) : (
        <Card>
          <Text style={s.foodName}>Choose {pet.name}'s main food first</Text>
          <Text style={s.meta}>Meals are logged against a rated food so the calories and quality are known.</Text>
          <View style={s.actions}>
            <Button small title="Choose a food" variant="accent" onPress={() => router.push("/(tabs)/shop")} />
            <Button small title="Enter a label" variant="secondary" onPress={() => router.push("/food/new")} />
          </View>
        </Card>
      )}

      <SectionTitle>Log a treat</SectionTitle>
      {treats.length > 0 && treat ? (
        <Card>
          <Segmented value={treat.id} onChange={setTreatId} options={treats.map((t) => ({ value: t.id, label: foodTitle(t) }))} wrap />
          <View style={s.logRow}>
            <View style={{ flex: 1 }}>
              <Field
                label={treat.kcalPerTreat != null ? "How many" : "How many 10 g portions"}
                value={treatCount}
                onChangeText={setTreatCount}
                inputMode="numeric"
                hint={`${Math.round(treatKcal)} kcal`}
              />
            </View>
            <Button title="Log treat" variant="secondary" onPress={logTreat} loading={logMeal.isPending} style={{ marginTop: 22 }} />
          </View>
        </Card>
      ) : null}

      {message ? (
        <View accessibilityLiveRegion="polite" style={{ marginTop: 12 }}>
          <Notice level="good">{message}</Notice>
        </View>
      ) : null}

      <SectionTitle>Recent log</SectionTitle>
      {meals.length === 0 ? (
        <Text style={s.hint}>Nothing logged yet.</Text>
      ) : (
        meals.slice(0, 20).map((m) => (
          <Card key={m.id} style={s.logItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.logName}>{m.items.map((i) => i.name).join(", ")}</Text>
              <Text style={s.meta}>
                {m.type === "TREAT" ? "Treat" : "Meal"} · {m.totalCalories} kcal ·{" "}
                {new Date(m.loggedAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </Text>
            </View>
            <LinkText onPress={() => confirmAction("Remove this entry?", () => deleteMeal.mutate(m))}>Remove</LinkText>
          </Card>
        ))
      )}

      <Card style={{ marginTop: 28 }}>
        <Text style={s.foodName}>Feeding something that is not listed?</Text>
        <Text style={s.meta}>Type in the guaranteed analysis and ingredients from the bag and get a rating in a minute.</Text>
        <Button small title="Rate a food by its label" variant="secondary" onPress={() => router.push("/food/new")} style={{ marginTop: 12, alignSelf: "flex-start" }} />
      </Card>
    </Screen>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statVal, warn && { color: c.warning }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  targetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  big: { fontSize: 34, fontWeight: "800", color: c.textPrimary, fontVariant: ["tabular-nums"] },
  bigOf: { fontSize: 17, fontWeight: "600", color: c.textSecondary },
  meta: { fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 6 },
  hint: { fontSize: 13, color: c.textTertiary, marginTop: 8 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { flexGrow: 1, flexBasis: 140, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.surfaceBorder, backgroundColor: c.surface },
  statVal: { fontSize: 22, fontWeight: "800", color: c.textPrimary },
  statLabel: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  foodHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  foodName: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  logRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginTop: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  logItem: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8, padding: 14 },
  logName: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
});

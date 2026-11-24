/**
 * Portion Autopilot card: the plan in force, the weight trend, and the
 * recommendation from the latest review, which the owner applies or ignores.
 */

import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@/config/theme";
import { Badge, Button, Card, Field, LinkText, Notice } from "@/components/ui";
import { foodTitle } from "@/components/food";
import { useAddWeighIn, useUpdatePet, useWeighIns } from "@/hooks/useData";
import { buildAutopilot, type Goal, type ReviewAction } from "@/shared/nutrition/autopilot";
import type { FoodProduct, MealLog, Pet } from "@/shared/types";

const c = theme.colors;

const GOAL_LABEL: Record<Goal, string> = {
  LOSE: "Goal: reach ideal weight",
  MAINTAIN: "Goal: hold ideal weight",
  GAIN: "Goal: gain to ideal weight",
  GROW: "Growing",
};

const ACTION_LEVEL: Record<ReviewAction, "good" | "info" | "caution" | "warning"> = {
  COLLECT: "info",
  HOLD: "good",
  DECREASE: "caution",
  INCREASE: "caution",
  FOLLOW_PLAN: "caution",
  SEE_VET: "warning",
};

export function AutopilotCard({ pet, meals, food }: { pet: Pet; meals: MealLog[]; food?: FoodProduct }) {
  const router = useRouter();
  const { data: weighIns } = useWeighIns(pet.id);
  const addWeighIn = useAddWeighIn();
  const updatePet = useUpdatePet();
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const plan = useMemo(() => buildAutopilot({ pet, weighIns: weighIns ?? [], meals, food }), [pet, weighIns, meals, food]);
  const today = new Date().toISOString().slice(0, 10);
  const due = plan.nextWeighIn <= today;
  const learned = Math.round((plan.factor - 1) * 100);

  const record = () => {
    const kg = parseFloat(weight.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 0.3 || kg > 120) return setNote("Enter a weight in kg.");
    addWeighIn.mutate(
      { petId: pet.id, date: today, weightKg: Math.round(kg * 10) / 10 },
      { onSuccess: () => { setWeight(""); setNote("Weigh-in recorded."); }, onError: (e: any) => setNote(e?.message ?? "Could not save.") }
    );
  };

  const apply = () => {
    if (plan.review.newFactor == null) return;
    updatePet.mutate(
      { id: pet.id, patch: { calorieFactor: plan.review.newFactor, planReviewedAt: new Date().toISOString() } },
      { onSuccess: () => setNote(`Plan updated to ${plan.review.newPlanKcal} kcal a day. Next review after the weigh-in in two weeks.`) }
    );
  };

  /** Mark the review as done without changing calories, so the next window starts now. */
  const acknowledge = () =>
    updatePet.mutate({ id: pet.id, patch: { planReviewedAt: new Date().toISOString() } }, { onSuccess: () => setNote("Noted. The next review window starts today.") });

  return (
    <Card style={{ borderColor: `${c.info}66` }}>
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>PORTION AUTOPILOT</Text>
          <Text style={s.title}>{pet.name}'s feeding plan</Text>
        </View>
        <Badge text={GOAL_LABEL[plan.goal]} color={plan.goal === "MAINTAIN" ? c.success : c.info} />
      </View>

      <View style={s.grid}>
        <Cell value={`${plan.planKcal}`} unit="kcal a day" />
        <Cell value={plan.gramsPerMeal != null ? `${plan.gramsPerMeal} g` : "—"} unit={plan.gramsPerMeal != null ? "per meal, twice a day" : "choose a main food"} />
        <Cell value={`${plan.treatBudgetKcal}`} unit="kcal treat budget" />
        <Cell value={plan.goal === "MAINTAIN" || plan.goal === "GROW" ? `${pet.weightKg} kg` : `${plan.idealWeightKg} kg`} unit={plan.goal === "MAINTAIN" || plan.goal === "GROW" ? "current weight" : `ideal (now ${pet.weightKg})`} />
      </View>

      <Text style={s.body}>
        {learned === 0
          ? `Starting from the standard estimate of ${plan.formulaKcal} kcal. Formulas describe the average animal, so Autopilot corrects it from ${pet.name}'s own weigh-ins.`
          : `${pet.name} needs about ${Math.abs(learned)}% ${learned < 0 ? "less" : "more"} than the standard estimate of ${plan.formulaKcal} kcal. This plan is built on ${pet.name}'s own results.`}
        {food && plan.gramsPerDay ? ` Portions are for ${foodTitle(food)} (${plan.gramsPerDay} g a day), leaving the treat budget free.` : ""}
        {plan.packageDays ? ` A ${food?.packageSizeKg} kg pack lasts about ${plan.packageDays} days.` : ""}
        {plan.weeksToGoal ? ` At a safe pace, ideal weight is about ${plan.weeksToGoal} weeks away.` : ""}
      </Text>

      <View style={{ marginTop: 14 }}>
        <Notice level={ACTION_LEVEL[plan.review.action]}>
          <Text style={{ fontWeight: "700" }}>{plan.review.headline}. </Text>
          {plan.review.detail}
        </Notice>
        {plan.review.newFactor != null ? (
          <View style={s.actions}>
            <Button small variant="accent" title={`Apply: ${plan.review.newPlanKcal} kcal a day`} onPress={apply} loading={updatePet.isPending} />
            <Button small variant="ghost" title="Keep current plan" onPress={acknowledge} />
          </View>
        ) : null}
      </View>

      <View style={s.weighRow}>
        <View style={{ flex: 1 }}>
          <Field
            label={due ? "Weigh-in due: today's weight (kg)" : `Next weigh-in ${plan.nextWeighIn}. Weight today (kg)`}
            value={weight}
            onChangeText={setWeight}
            inputMode="decimal"
            placeholder={String(pet.weightKg)}
          />
        </View>
        <Button title="Record" variant={due ? "accent" : "secondary"} onPress={record} loading={addWeighIn.isPending} style={{ marginTop: 22 }} />
      </View>
      {note ? <Text accessibilityLiveRegion="polite" style={s.note}>{note}</Text> : null}

      {weighIns && weighIns.length > 1 ? (
        <Text style={s.history}>
          Weight history: {weighIns.slice(-6).map((w) => `${w.date.slice(5)} ${w.weightKg} kg`).join(" · ")}
        </Text>
      ) : null}

      <Text style={s.small}>
        Autopilot only proposes; you decide. It will not plan below {plan.floorKcal} kcal a day. Pregnant, nursing or unwell
        pets, and any pet on a prescription diet, need their vet's plan instead.{" "}
        <LinkText onPress={() => router.push("/science")} style={{ fontSize: 12 }}>How it works</LinkText>
      </Text>
    </Card>
  );
}

function Cell({ value, unit }: { value: string; unit: string }) {
  return (
    <View style={s.cell}>
      <Text style={s.cellVal}>{value}</Text>
      <Text style={s.cellUnit}>{unit}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "flex-start", gap: 10, flexWrap: "wrap" },
  kicker: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: "#7FB0FF" },
  title: { fontSize: 18, fontWeight: "800", color: c.textPrimary, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  cell: { flexGrow: 1, flexBasis: 130, padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)" },
  cellVal: { fontSize: 22, fontWeight: "800", color: c.textPrimary, fontVariant: ["tabular-nums"] },
  cellUnit: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  body: { fontSize: 14, lineHeight: 21, color: c.textSecondary, marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4, marginBottom: 4 },
  weighRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginTop: 12 },
  note: { fontSize: 13, color: c.success, marginTop: -4, marginBottom: 8 },
  history: { fontSize: 12, lineHeight: 18, color: c.textTertiary, marginTop: 4 },
  small: { fontSize: 12, lineHeight: 18, color: c.textTertiary, marginTop: 10 },
});

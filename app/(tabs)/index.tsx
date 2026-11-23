/**
 * Score dashboard: the number, what moves it, and where to act next.
 */

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { isSupabaseConfigured } from "@/config/supabase";
import { getScoreColor, theme } from "@/config/theme";
import { Button, Card, GradeBadge, LinkText, Loading, Notice, PageHeader, ScoreNumber, Screen, SectionTitle } from "@/components/ui";
import { foodTitle } from "@/components/food";
import { FactorList, ScoreTrend } from "@/components/score";
import { SharePanel } from "@/components/ShareCard";
import { useActivePet, useFoodRating, useFoods, usePetScore, useRecordSnapshot, useSnapshots } from "@/hooks/useData";
import { buildShareCard } from "@/lib/share";
import { useAuthStore } from "@/stores";
import { getBreed } from "@/shared/constants/breeds";
import { ageYears } from "@/shared/nutrition/energy";
import { SCORE_DISCLAIMER } from "@/shared/score/evidence";
import { upsidePoints } from "@/shared/score/longevity";

const c = theme.colors;

export default function Dashboard() {
  const router = useRouter();
  const guest = useAuthStore((st) => st.status) !== "account";
  const { pet } = useActivePet();
  const { score, diet, isLoading } = usePetScore(pet);
  const { byId } = useFoods();
  const { data: snapshots } = useSnapshots(pet?.id);
  useRecordSnapshot(pet, score);
  const [sharing, setSharing] = useState(false);

  const food = pet?.primaryFoodId ? byId.get(pet.primaryFoodId) : undefined;
  const rating = useFoodRating(food, pet);

  if (!pet) return null;
  if (isLoading || !score) return <Loading />;

  const color = getScoreColor(score.score);
  const age = ageYears(pet.dateOfBirth);
  const best = score.breakdown
    .filter((b) => b.improvable && b.suggestion)
    .sort((a, b) => upsidePoints(b) - upsidePoints(a))[0];
  const breed = getBreed(pet.species, pet.breed);

  return (
    <Screen>
      <PageHeader
        title={pet.name}
        subtitle={`${pet.breed} · ${age < 1 ? `${Math.round(age * 12)} months` : `${age.toFixed(1)} years`} · ${pet.weightKg} kg`}
      />

      <Card style={{ overflow: "hidden", alignItems: "center", paddingVertical: 28 }}>
        <LinearGradient colors={[`${color}22`, "transparent"]} style={StyleSheet.absoluteFill} />
        <Text style={s.kicker}>LONGEVITY SCORE</Text>
        <ScoreNumber score={score.score} />
        <Text style={s.outOf}>out of 999</Text>
        {score.dataCompleteness < 1 ? (
          <Text style={s.completeness}>
            Based on {Math.round(score.dataCompleteness * 100)}% real data. Factors marked “No data yet” are neutral placeholders.
          </Text>
        ) : null}
        <View style={s.heroActions}>
          <Button small title={sharing ? "Hide share card" : "Share Score"} variant="secondary" onPress={() => setSharing(!sharing)} />
          <Button small title="How it works" variant="ghost" onPress={() => router.push("/science")} />
        </View>
      </Card>

      {sharing ? (
        <Card style={{ marginTop: 14 }}>
          <SharePanel card={buildShareCard(pet, score, rating?.fit?.grade)} />
        </Card>
      ) : null}

      {best ? (
        <Card style={{ marginTop: 14, borderColor: `${c.success}55` }}>
          <Text style={s.nextKicker}>BIGGEST OPPORTUNITY · {best.label.toUpperCase()}</Text>
          <Text style={s.nextText}>{best.suggestion}</Text>
          <View style={s.nextRow}>
            <Text style={s.nextPoints}>Up to +{upsidePoints(best)} points</Text>
            {best.actionRoute ? <Button small title="Do this" variant="accent" onPress={() => router.push(best.actionRoute as any)} /> : null}
          </View>
        </Card>
      ) : null}

      <SectionTitle action="All foods" onAction={() => router.push("/(tabs)/shop")}>
        What {pet.name} eats
      </SectionTitle>
      {food && rating ? (
        <Card onPress={() => router.push(`/food/${food.id}` as any)} style={s.foodCard} label={`${foodTitle(food)} rating`}>
          <GradeBadge grade={rating.fit?.grade ?? rating.grade} score={rating.fit?.score ?? rating.score} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={s.foodName}>{foodTitle(food)}</Text>
            <Text style={s.foodMeta}>
              Food quality is {Math.round(55 * 0.25)}% of the whole Score.{" "}
              {diet ? `Target ${diet.dailyCalorieTarget} kcal a day · ${diet.daysLoggedLast7}/7 days logged.` : ""}
            </Text>
          </View>
        </Card>
      ) : (
        <Card>
          <Text style={s.foodName}>No food on record</Text>
          <Text style={s.foodMeta}>
            Nutrition is a quarter of the Score and it is running on a placeholder. Pick {pet.name}'s food or type in its label.
          </Text>
          <View style={s.heroActions}>
            <Button small title="Choose a food" variant="accent" onPress={() => router.push("/(tabs)/shop")} />
            <Button small title="Enter a label" variant="secondary" onPress={() => router.push("/food/new")} />
          </View>
        </Card>
      )}

      <SectionTitle>What drives the Score</SectionTitle>
      <Card>
        <Text style={s.foodMeta}>Open a factor for the calculation and the research behind it.</Text>
        <View style={{ marginTop: 8 }}>
          <FactorList breakdown={score.breakdown} />
        </View>
      </Card>

      <SectionTitle>Trend</SectionTitle>
      <Card>
        <ScoreTrend snapshots={snapshots ?? []} />
      </Card>

      {breed.nutritionNotes.length > 0 ? (
        <>
          <SectionTitle>Worth knowing about {breed.name}s</SectionTitle>
          {breed.nutritionNotes.map((n) => (
            <Notice key={n} level="info">
              {n}
            </Notice>
          ))}
        </>
      ) : null}

      {guest ? (
        <Card style={{ marginTop: 24 }}>
          <Text style={s.foodName}>Saved in this browser only</Text>
          <Text style={s.foodMeta}>
            {isSupabaseConfigured
              ? `Create a free account to keep ${pet.name}'s profile and history, and to use it on another device.`
              : `Clearing your browser data will remove ${pet.name}'s profile.`}
          </Text>
          {isSupabaseConfigured ? (
            <Button small title="Create free account" onPress={() => router.push("/(auth)/login")} style={{ marginTop: 12, alignSelf: "flex-start" }} />
          ) : null}
        </Card>
      ) : null}

      <Text style={s.disclaimer}>
        {SCORE_DISCLAIMER} <LinkText onPress={() => router.push("/science")} style={{ fontSize: 12 }}>Method and sources</LinkText>
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  kicker: { fontSize: 12, fontWeight: "700", letterSpacing: 1.6, color: c.textSecondary, marginBottom: 6 },
  outOf: { fontSize: 13, color: c.textTertiary, marginTop: 2 },
  completeness: { fontSize: 13, lineHeight: 19, color: c.textSecondary, textAlign: "center", maxWidth: 420, marginTop: 12 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  nextKicker: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: c.success },
  nextText: { fontSize: 16, lineHeight: 23, fontWeight: "600", color: c.textPrimary, marginTop: 6 },
  nextRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  nextPoints: { fontSize: 14, fontWeight: "700", color: c.success },
  foodCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  foodName: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  foodMeta: { fontSize: 14, lineHeight: 21, color: c.textSecondary, marginTop: 4 },
  disclaimer: { fontSize: 12, lineHeight: 18, color: c.textTertiary, marginTop: 28 },
});

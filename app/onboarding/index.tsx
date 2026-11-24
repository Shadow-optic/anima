/**
 * Onboarding: five short steps to a first Longevity Score.
 *
 * Works without an account. The Score is computed in the browser, the pet is
 * saved through the repo (this browser for guests, the account otherwise),
 * and the reveal offers the share card straight away.
 */

import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { isSupabaseConfigured } from "@/config/supabase";
import { theme } from "@/config/theme";
import { Button, Card, Field, LinkText, Notice, ScoreNumber, Screen, Segmented } from "@/components/ui";
import { FoodRow } from "@/components/food";
import { FactorList } from "@/components/score";
import { SharePanel } from "@/components/ShareCard";
import { useCreatePet, useFoods } from "@/hooks/useData";
import { buildShareCard } from "@/lib/share";
import { useAuthStore } from "@/stores";
import { breedsFor } from "@/shared/constants/breeds";
import { rateFood } from "@/shared/food/rating";
import { ageYearsToDob } from "@/shared/nutrition/energy";
import { SCORE_DISCLAIMER } from "@/shared/score/evidence";
import { computeLongevityScore, petContext, summariseDiet } from "@/shared/score/longevity";
import type { LongevityScore, NewPet, Pet, Sex, Species } from "@/shared/types";

const c = theme.colors;
type Step = "species" | "breed" | "basics" | "lifestyle" | "reveal";
const STEPS: Step[] = ["species", "breed", "basics", "lifestyle"];

export const BCS_TEXT: Record<number, string> = {
  1: "Emaciated. Ribs, spine and hip bones stand out from a distance.",
  2: "Very thin. Ribs and spine easily seen, no body fat you can feel.",
  3: "Thin. Ribs easily felt and may be visible; obvious waist.",
  4: "Lean (ideal). Ribs easily felt with minimal fat; clear waist from above.",
  5: "Ideal. Ribs felt without excess fat; waist visible behind the ribs.",
  6: "Slightly overweight. Ribs felt through a slight excess of fat; waist just visible.",
  7: "Overweight. Ribs hard to feel under fat; waist absent or barely visible.",
  8: "Obese. Ribs felt only with firm pressure; no waist; belly may sag.",
  9: "Severely obese. Heavy fat over chest, spine and tail base; belly distended.",
};

const ACTIVITY = [
  { value: 15, label: "Under 20 min" },
  { value: 30, label: "About 30 min" },
  { value: 60, label: "About an hour" },
  { value: 90, label: "90 min" },
  { value: 120, label: "2 hours or more" },
];

export default function Onboarding() {
  const router = useRouter();
  const createPet = useCreatePet();
  const { foods, byId } = useFoods();
  const guest = useAuthStore((s) => s.status) !== "account";

  const [step, setStep] = useState<Step>("species");
  const [species, setSpecies] = useState<Species | null>(null);
  const [breed, setBreed] = useState("");
  const [breedQuery, setBreedQuery] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"kg" | "lb">("lb");
  const [sex, setSex] = useState<Sex | null>(null);
  const [neutered, setNeutered] = useState(true);
  const [bcs, setBcs] = useState(5);
  const [activity, setActivity] = useState<number | null>(null);
  const [foodId, setFoodId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pet: Pet; score: LongevityScore } | null>(null);
  const [sharing, setSharing] = useState(false);

  const ageNum = parseFloat(age.replace(",", "."));
  const weightNum = parseFloat(weight.replace(",", "."));
  const weightKg = unit === "lb" ? weightNum / 2.2046 : weightNum;

  const draft: NewPet | null = useMemo(() => {
    if (!species || !breed || !Number.isFinite(ageNum) || !Number.isFinite(weightKg)) return null;
    return {
      name: name.trim(),
      species,
      breed,
      dateOfBirth: ageYearsToDob(ageNum),
      sex: sex ?? "FEMALE",
      neutered,
      weightKg: Math.round(weightKg * 10) / 10,
      bodyCondition: bcs,
      activityMinutesPerDay: activity,
      primaryFoodId: foodId,
      calorieFactor: 1,
      planReviewedAt: null,
    };
  }, [species, breed, name, ageNum, weightKg, sex, neutered, bcs, activity, foodId]);

  const foodChoices = useMemo(() => {
    if (!species || !draft) return [];
    const ctx = petContext(draft);
    return foods
      .filter((f) => f.category === "COMPLETE" && (f.species === species || f.species === "BOTH"))
      .map((food) => ({ food, rating: rateFood(food, ctx) }));
  }, [foods, species, draft]);

  const validateBasics = (): boolean => {
    if (!name.trim()) return fail("Add your pet's name.");
    if (!Number.isFinite(ageNum) || ageNum < 0.1 || ageNum > 35) return fail("Enter an age in years, for example 3 or 0.5.");
    if (!Number.isFinite(weightKg) || weightKg < 0.3 || weightKg > 120) return fail("Enter a weight.");
    if (!sex) return fail("Choose a sex.");
    setError(null);
    return true;
  };
  const fail = (m: string) => {
    setError(m);
    return false;
  };

  const finish = async () => {
    if (!draft) return;
    setError(null);
    try {
      const pet = await createPet.mutateAsync(draft);
      const score = computeLongevityScore({ pet, diet: summariseDiet(pet, [], byId) });
      setResult({ pet, score });
      setStep("reveal");
    } catch (e: any) {
      setError(e?.message ?? "Could not save. Try again.");
    }
  };

  const back = () => {
    const i = STEPS.indexOf(step);
    setError(null);
    if (i > 0) setStep(STEPS[i - 1]);
    else if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  if (step === "reveal" && result) {
    const { pet, score } = result;
    const food = pet.primaryFoodId ? byId.get(pet.primaryFoodId) : undefined;
    const grade = food ? rateFood(food, petContext(pet)).fit?.grade : undefined;
    return (
      <Screen width={640}>
        <Text style={s.kicker}>{pet.name}'s Longevity Score</Text>
        <View style={{ marginVertical: 12 }}>
          <ScoreNumber score={score.score} size={104} />
        </View>
        <Text style={s.revealNote}>
          A starting point from breed, age, body condition{food ? ", food" : ""} and activity.{" "}
          {Math.round(score.dataCompleteness * 100)}% of it rests on data you gave; the rest is neutral until you add meals
          and care records.
        </Text>

        <View style={s.revealActions}>
          <Button title="Go to dashboard" variant="accent" onPress={() => router.replace("/(tabs)")} />
          <Button title={sharing ? "Hide share card" : "Share this Score"} variant="secondary" onPress={() => setSharing(!sharing)} />
        </View>

        {sharing ? (
          <Card style={{ marginTop: 16 }}>
            <SharePanel card={buildShareCard(pet, score, grade)} />
          </Card>
        ) : null}

        {guest && isSupabaseConfigured ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={s.cardTitle}>Keep this Score</Text>
            <Text style={s.cardBody}>
              Right now {pet.name}'s profile lives only in this browser. A free account saves it and its history.
            </Text>
            <Button title="Create free account" onPress={() => router.push("/(auth)/login")} style={{ marginTop: 12 }} />
          </Card>
        ) : null}

        <Card style={{ marginTop: 16 }}>
          <Text style={s.cardTitle}>What is driving the Score</Text>
          <Text style={s.cardBody}>Open any factor to see how it is calculated and the research behind it.</Text>
          <View style={{ marginTop: 8 }}>
            <FactorList breakdown={score.breakdown} />
          </View>
        </Card>
        <Text style={s.disclaimer}>{SCORE_DISCLAIMER}</Text>
      </Screen>
    );
  }

  const index = STEPS.indexOf(step);
  return (
    <Screen width={560}>
      <View style={s.top}>
        <LinkText onPress={back}>← Back</LinkText>
        <Text style={s.stepCount}>
          Step {index + 1} of {STEPS.length}
        </Text>
      </View>
      <View style={s.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: STEPS.length, now: index + 1 }}>
        <View style={[s.progressFill, { width: `${((index + 1) / STEPS.length) * 100}%` }]} />
      </View>

      {step === "species" ? (
        <View>
          <Text accessibilityRole="header" style={s.title}>
            Who are we scoring?
          </Text>
          <View style={s.speciesRow}>
            {(["DOG", "CAT"] as const).map((sp) => (
              <Pressable
                key={sp}
                accessibilityRole="button"
                onPress={() => {
                  setSpecies(sp);
                  setBreed("");
                  setFoodId(null);
                  setStep("breed");
                }}
                style={({ hovered, focused }: any) => [s.speciesCard, (hovered || focused || species === sp) && s.speciesCardOn]}
              >
                <Text style={s.speciesEmoji}>{sp === "DOG" ? "🐕" : "🐈"}</Text>
                <Text style={s.speciesLabel}>{sp === "DOG" ? "Dog" : "Cat"}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {step === "breed" && species ? (
        <View>
          <Text accessibilityRole="header" style={s.title}>
            What breed?
          </Text>
          <Text style={s.sub}>Breed sets the life-expectancy baseline. Choose Mixed Breed if unsure.</Text>
          <Field label="Search breeds" value={breedQuery} onChangeText={setBreedQuery} placeholder="Start typing" autoCapitalize="words" />
          <ScrollView style={s.breedList}>
            {breedsFor(species)
              .filter((b) => b.name.toLowerCase().includes(breedQuery.trim().toLowerCase()))
              .map((b) => (
                <Pressable
                  key={b.name}
                  accessibilityRole="button"
                  onPress={() => {
                    setBreed(b.name);
                    setStep("basics");
                  }}
                  style={({ hovered, focused }: any) => [s.breedItem, (hovered || focused || breed === b.name) && s.breedItemOn]}
                >
                  <Text style={s.breedName}>{b.name}</Text>
                  <Text style={s.breedMeta}>about {b.lifespanYears.toFixed(1)} yrs</Text>
                </Pressable>
              ))}
          </ScrollView>
          <Text style={s.hint}>Breed not listed? Choose Mixed Breed for now. More breeds are being added.</Text>
        </View>
      ) : null}

      {step === "basics" ? (
        <View>
          <Text accessibilityRole="header" style={s.title}>
            About {name.trim() || "your pet"}
          </Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Luna" maxLength={40} autoCapitalize="words" />
          <Field label="Age in years" value={age} onChangeText={setAge} placeholder="3" inputMode="decimal" hint="Use a decimal for young pets: 0.5 is six months." />
          <View style={s.inline}>
            <View style={{ flex: 1 }}>
              <Field label={`Weight (${unit})`} value={weight} onChangeText={setWeight} placeholder={unit === "lb" ? "55" : "25"} inputMode="decimal" />
            </View>
            <View style={{ width: 130 }}>
              <Segmented label="Unit" value={unit} onChange={setUnit} options={[{ value: "lb", label: "lb" }, { value: "kg", label: "kg" }]} />
            </View>
          </View>
          <Segmented label="Sex" value={sex} onChange={setSex} options={[{ value: "FEMALE", label: "Female" }, { value: "MALE", label: "Male" }]} />
          <Segmented label="Spayed or neutered" value={neutered} onChange={setNeutered} options={[{ value: true, label: "Yes" }, { value: false, label: "No" }]} />
          <Segmented
            label="Body condition (1–9)"
            value={bcs}
            onChange={setBcs}
            options={[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ value: n, label: String(n) }))}
          />
          <Notice level={bcs >= 4 && bcs <= 5 ? "good" : "info"}>{BCS_TEXT[bcs]}</Notice>
          <Text style={s.hint}>Run your hands along the ribs and look down from above. Your vet can confirm the score.</Text>
          {error ? <Notice level="warning">{error}</Notice> : null}
          <Button title="Continue" onPress={() => validateBasics() && setStep("lifestyle")} style={{ marginTop: 12 }} />
        </View>
      ) : null}

      {step === "lifestyle" ? (
        <View>
          <Text accessibilityRole="header" style={s.title}>
            Food and exercise
          </Text>
          <Segmented label={`Active minutes on a typical day (walks, play, running)`} value={activity} onChange={setActivity} options={ACTIVITY} wrap />

          <Text style={s.fieldLabel}>What does {name.trim() || "your pet"} eat most days?</Text>
          <Text style={s.hint}>
            Nutrition is the largest part of the Score. If yours is not listed, skip this and type in its label
            afterwards.
          </Text>
          <View style={{ marginTop: 10 }}>
            {foodChoices.map(({ food, rating }) => (
              <FoodRow
                key={food.id}
                food={food}
                rating={rating}
                showFit
                onPress={() => setFoodId(foodId === food.id ? null : food.id)}
                right={<Text style={[s.pick, foodId === food.id && { color: c.success }]}>{foodId === food.id ? "✓ Selected" : "Select"}</Text>}
              />
            ))}
          </View>
          {error ? <Notice level="warning">{error}</Notice> : null}
          <Button
            title={foodId ? "See the Score" : "Skip food and see the Score"}
            variant="accent"
            loading={createPet.isPending}
            onPress={finish}
            style={{ marginTop: 12 }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  stepCount: { fontSize: 13, color: c.textTertiary },
  progress: { height: 4, borderRadius: 2, backgroundColor: c.surfaceBorder, overflow: "hidden", marginBottom: 28 },
  progressFill: { height: "100%", backgroundColor: c.success },
  title: { fontSize: 28, fontWeight: "800", color: c.textPrimary, marginBottom: 8, letterSpacing: -0.3 },
  sub: { fontSize: 15, lineHeight: 22, color: c.textSecondary, marginBottom: 20 },
  hint: { fontSize: 13, lineHeight: 19, color: c.textTertiary, marginTop: 4 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginTop: 8, marginBottom: 2 },
  speciesRow: { flexDirection: "row", gap: 16, marginTop: 16 },
  speciesCard: { flex: 1, alignItems: "center", paddingVertical: 36, borderRadius: 20, borderWidth: 2, borderColor: c.surfaceBorder, backgroundColor: c.surface },
  speciesCardOn: { borderColor: c.success, backgroundColor: `${c.success}14` },
  speciesEmoji: { fontSize: 56 },
  speciesLabel: { fontSize: 17, fontWeight: "700", color: c.textPrimary, marginTop: 10 },
  breedList: { maxHeight: 420, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 12 },
  breedItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: c.surfaceBorder },
  breedItemOn: { backgroundColor: c.surfaceHover },
  breedName: { fontSize: 15, fontWeight: "600", color: c.textPrimary },
  breedMeta: { fontSize: 12, color: c.textTertiary },
  inline: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  pick: { fontSize: 13, fontWeight: "700", color: c.textSecondary },
  kicker: { fontSize: 15, fontWeight: "600", color: c.textSecondary, textAlign: "center", marginTop: 16 },
  revealNote: { fontSize: 15, lineHeight: 23, color: c.textSecondary, textAlign: "center", maxWidth: 480, alignSelf: "center" },
  revealActions: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 20 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  cardBody: { fontSize: 14, lineHeight: 21, color: c.textSecondary, marginTop: 4 },
  disclaimer: { fontSize: 12, lineHeight: 18, color: c.textTertiary, marginTop: 20, textAlign: "center" },
});

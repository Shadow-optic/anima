/**
 * ANIMA Onboarding — Pet Profile Creation Wizard
 * 
 * Multi-step flow that collects pet data and reveals
 * their first Longevity Score at the end.
 * 
 * Steps: Species → Breed → Basics → Conditions → Diet → Score Reveal
 */

import {useState} from "react";
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,} from "react-native";
import {useRouter} from "expo-router";
import * as Haptics from "expo-haptics";
import {getScoreColor, getScoreLabel, theme} from "@/config/theme";
import {useCreatePet} from "@/hooks/useApi";

type Step = "species" | "breed" | "basics" | "conditions" | "computing" | "reveal";

const COMMON_DOG_BREEDS = [
  "Labrador Retriever", "Golden Retriever", "German Shepherd", "French Bulldog",
  "Bulldog", "Poodle", "Beagle", "Rottweiler", "Dachshund", "Siberian Husky",
  "Boxer", "Great Dane", "Doberman", "Australian Shepherd", "Cavalier King Charles Spaniel",
  "Shih Tzu", "Yorkshire Terrier", "Chihuahua", "Pomeranian", "Mixed Breed",
];

const COMMON_CAT_BREEDS = [
  "Domestic Shorthair", "Domestic Longhair", "Siamese", "Persian", "Maine Coon",
  "Ragdoll", "Bengal", "Abyssinian", "British Shorthair", "Scottish Fold",
  "Sphynx", "Birman", "Russian Blue", "Mixed Breed",
];

export default function OnboardingScreen() {
  const router = useRouter();
  const createPet = useCreatePet();

  const [step, setStep] = useState<Step>("species");
  const [form, setForm] = useState({
    species: "" as "DOG" | "CAT" | "",
    breed: "",
    name: "",
    dateOfBirth: "",
    sex: "" as "MALE" | "FEMALE" | "",
    neutered: false,
    weightKg: "",
    bodyCondition: 5,
  });
  const [score, setScore] = useState<number | null>(null);

  const updateForm = (updates: Partial<typeof form>) => setForm({ ...form, ...updates });

  const handleCreatePet = async () => {
    if (!form.species || !form.breed || !form.name || !form.weightKg) return;

    setStep("computing");

    try {
      const result = await createPet.mutateAsync({
        name: form.name,
        species: form.species as "DOG" | "CAT",
        breed: form.breed,
        dateOfBirth: form.dateOfBirth || new Date(Date.now() - 3 * 365 * 24 * 3600000).toISOString(),
        sex: (form.sex as "MALE" | "FEMALE") || "MALE",
        neutered: form.neutered,
        weightKg: parseFloat(form.weightKg),
        bodyCondition: form.bodyCondition,
      });

      setScore(result.currentScore?.score || 500);

      setTimeout(() => {
        setStep("reveal");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 2500);
    } catch (error: any) {
      setStep("conditions"); // Go back to retry
    }
  };

  const renderStep = () => {
    switch (step) {
      case "species":
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>What kind of pet?</Text>
            <Text style={s.stepSubtitle}>ANIMA supports dogs and cats</Text>
            <View style={s.choiceRow}>
              {[
                { value: "DOG", emoji: "🐕", label: "Dog" },
                { value: "CAT", emoji: "🐈", label: "Cat" },
              ].map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[s.choiceCard, form.species === opt.value && s.choiceCardActive]}
                  onPress={() => {
                    updateForm({ species: opt.value as any });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTimeout(() => setStep("breed"), 200);
                  }}
                >
                  <Text style={s.choiceEmoji}>{opt.emoji}</Text>
                  <Text style={s.choiceLabel}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case "breed":
        const breeds = form.species === "DOG" ? COMMON_DOG_BREEDS : COMMON_CAT_BREEDS;
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>What breed?</Text>
            <Text style={s.stepSubtitle}>This helps us calculate breed-specific health risks</Text>
            <ScrollView style={s.breedList} showsVerticalScrollIndicator={false}>
              {breeds.map((breed) => (
                <Pressable
                  key={breed}
                  style={[s.breedItem, form.breed === breed && s.breedItemActive]}
                  onPress={() => {
                    updateForm({ breed });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTimeout(() => setStep("basics"), 200);
                  }}
                >
                  <Text style={[s.breedText, form.breed === breed && s.breedTextActive]}>{breed}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );

      case "basics":
        return (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.stepContent}>
            <Text style={s.stepTitle}>Tell us about {form.name || "your pet"}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.fieldLabel}>Name</Text>
              <TextInput style={s.input} value={form.name} onChangeText={(v) => updateForm({ name: v })} placeholder="Luna" placeholderTextColor={theme.colors.textTertiary} />

              <Text style={s.fieldLabel}>Age (years)</Text>
              <TextInput style={s.input} value={form.dateOfBirth} onChangeText={(v) => updateForm({ dateOfBirth: v })} placeholder="3" placeholderTextColor={theme.colors.textTertiary} keyboardType="numeric" />

              <Text style={s.fieldLabel}>Weight (kg)</Text>
              <TextInput style={s.input} value={form.weightKg} onChangeText={(v) => updateForm({ weightKg: v })} placeholder="25" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" />

              <Text style={s.fieldLabel}>Sex</Text>
              <View style={s.choiceRowSmall}>
                {[{ v: "MALE", l: "Male" }, { v: "FEMALE", l: "Female" }].map((opt) => (
                  <Pressable key={opt.v} style={[s.choiceSmall, form.sex === opt.v && s.choiceSmallActive]} onPress={() => updateForm({ sex: opt.v as any })}>
                    <Text style={[s.choiceSmallText, form.sex === opt.v && { color: theme.colors.textPrimary }]}>{opt.l}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.fieldLabel}>Spayed/Neutered?</Text>
              <View style={s.choiceRowSmall}>
                {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map((opt) => (
                  <Pressable key={String(opt.v)} style={[s.choiceSmall, form.neutered === opt.v && s.choiceSmallActive]} onPress={() => updateForm({ neutered: opt.v })}>
                    <Text style={[s.choiceSmallText, form.neutered === opt.v && { color: theme.colors.textPrimary }]}>{opt.l}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.fieldLabel}>Body Condition (1–9 scale)</Text>
              <View style={s.bcsRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <Pressable key={n} style={[s.bcsBtn, form.bodyCondition === n && s.bcsBtnActive]} onPress={() => updateForm({ bodyCondition: n })}>
                    <Text style={[s.bcsBtnText, form.bodyCondition === n && { color: theme.colors.textPrimary }]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.bcsHint}>4–5 is ideal. 1 = very thin, 9 = obese.</Text>

              <Pressable style={[s.nextBtn, (!form.name || !form.weightKg) && s.nextBtnDisabled]} onPress={() => setStep("conditions")} disabled={!form.name || !form.weightKg}>
                <Text style={s.nextBtnText}>Continue</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        );

      case "conditions":
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Ready to meet {form.name}'s Score?</Text>
            <Text style={s.stepSubtitle}>
              We'll compute {form.name}'s first Longevity Score based on breed, age, weight, and body condition. 
              The Score gets smarter over time as you log meals and add data.
            </Text>
            <View style={s.summaryCard}>
              <Text style={s.summaryLine}>{form.species === "DOG" ? "🐕" : "🐈"} {form.name}</Text>
              <Text style={s.summaryLine}>{form.breed}</Text>
              <Text style={s.summaryLine}>{form.weightKg} kg · BCS {form.bodyCondition}/9</Text>
              <Text style={s.summaryLine}>{form.sex === "MALE" ? "Male" : "Female"} · {form.neutered ? "Neutered" : "Intact"}</Text>
            </View>
            <Pressable style={s.revealBtn} onPress={handleCreatePet}>
              <Text style={s.revealBtnText}>Compute Longevity Score</Text>
            </Pressable>
          </View>
        );

      case "computing":
        return (
          <View style={[s.stepContent, { justifyContent: "center", alignItems: "center" }]}>
            <Text style={{ fontSize: 56, marginBottom: 24 }}>🧬</Text>
            <Text style={s.computingTitle}>Computing Score...</Text>
            <Text style={s.computingSub}>Analyzing breed genetics, body condition, age-adjusted health, and more.</Text>
          </View>
        );

      case "reveal":
        const scoreColor = score ? getScoreColor(score) : theme.colors.textPrimary;
        const scoreLabel = score ? getScoreLabel(score) : "—";
        return (
          <View style={[s.stepContent, { justifyContent: "center", alignItems: "center" }]}>
            <Text style={s.revealSubtext}>{form.name}'s Longevity Score™</Text>
            <Text style={[s.revealScore, { color: scoreColor }]}>{score}</Text>
            <Text style={[s.revealLabel, { color: scoreColor }]}>{scoreLabel}</Text>
            <Text style={s.revealExplain}>
              This is {form.name}'s starting point. Log meals, add vet records, and scan BioCards to make the Score smarter and more personalized.
            </Text>
            <Pressable style={s.startBtn} onPress={() => router.replace("/(tabs)")}>
              <Text style={s.startBtnText}>Start {form.name}'s Journey</Text>
            </Pressable>
          </View>
        );
    }
  };

  // Progress indicator
  const steps: Step[] = ["species", "breed", "basics", "conditions"];
  const currentIndex = steps.indexOf(step);
  const progress = step === "computing" || step === "reveal" ? 1 : (currentIndex + 1) / steps.length;

  return (
    <View style={s.container}>
      {step !== "computing" && step !== "reveal" && (
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}

      {step !== "species" && step !== "computing" && step !== "reveal" && (
        <Pressable style={s.backBtn} onPress={() => {
          const idx = steps.indexOf(step);
          if (idx > 0) setStep(steps[idx - 1]);
        }}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>
      )}

      {renderStep()}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 60 },
  progressBar: { height: 3, backgroundColor: theme.colors.surfaceBorder, marginHorizontal: 20, borderRadius: 1.5, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.colors.success, borderRadius: 1.5 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { fontSize: 14, color: theme.colors.textSecondary },

  stepContent: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  stepTitle: { fontSize: 24, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 6 },
  stepSubtitle: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 24 },

  choiceRow: { flexDirection: "row", gap: 16 },
  choiceCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 2, borderColor: theme.colors.surfaceBorder, padding: 32, alignItems: "center" },
  choiceCardActive: { borderColor: theme.colors.success, backgroundColor: `${theme.colors.success}10` },
  choiceEmoji: { fontSize: 56, marginBottom: 12 },
  choiceLabel: { fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary },

  breedList: { flex: 1 },
  breedItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceBorder },
  breedItemActive: { backgroundColor: `${theme.colors.success}10` },
  breedText: { fontSize: 15, color: theme.colors.textSecondary },
  breedTextActive: { color: theme.colors.textPrimary, fontWeight: "600" },

  fieldLabel: { fontSize: 12, fontWeight: "600", color: theme.colors.textTertiary, marginTop: 16, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.surfaceBorder, borderRadius: 12, padding: 14, fontSize: 15, color: theme.colors.textPrimary },

  choiceRowSmall: { flexDirection: "row", gap: 8 },
  choiceSmall: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.surfaceBorder, alignItems: "center" },
  choiceSmallActive: { borderColor: theme.colors.success, backgroundColor: `${theme.colors.success}10` },
  choiceSmallText: { fontSize: 14, fontWeight: "500", color: theme.colors.textTertiary },

  bcsRow: { flexDirection: "row", gap: 4 },
  bcsBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.surfaceBorder, alignItems: "center" },
  bcsBtnActive: { borderColor: theme.colors.success, backgroundColor: `${theme.colors.success}10` },
  bcsBtnText: { fontSize: 14, fontWeight: "600", color: theme.colors.textTertiary },
  bcsHint: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 6 },

  nextBtn: { backgroundColor: theme.colors.textPrimary, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 24, marginBottom: 40 },
  nextBtnDisabled: { opacity: 0.3 },
  nextBtnText: { fontSize: 15, fontWeight: "600", color: theme.colors.background },

  summaryCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, gap: 6, marginBottom: 24 },
  summaryLine: { fontSize: 14, color: theme.colors.textSecondary },

  revealBtn: { backgroundColor: theme.colors.success, borderRadius: 14, paddingVertical: 18, alignItems: "center" },
  revealBtnText: { fontSize: 16, fontWeight: "700", color: "#000" },

  computingTitle: { fontSize: 22, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 8 },
  computingSub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center", maxWidth: 280, lineHeight: 20 },

  revealSubtext: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16 },
  revealScore: { fontSize: 96, fontWeight: "700", lineHeight: 100 },
  revealLabel: { fontSize: 20, fontWeight: "600", marginTop: 4, marginBottom: 24 },
  revealExplain: { fontSize: 14, color: theme.colors.textSecondary, textAlign: "center", maxWidth: 300, lineHeight: 22, marginBottom: 32 },
  startBtn: { backgroundColor: theme.colors.textPrimary, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 18 },
  startBtnText: { fontSize: 16, fontWeight: "700", color: theme.colors.background },
});

/**
 * Landing page. Visitors with a pet already go straight to their dashboard.
 */

import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { isSupabaseConfigured } from "@/config/supabase";
import { theme } from "@/config/theme";
import { Button, Card, GradeBadge, LinkText, Loading, Screen } from "@/components/ui";
import { ShareCardView } from "@/components/ShareCard";
import { usePets } from "@/hooks/useData";
import { useAuthStore } from "@/stores";
import { FACTOR_LABELS, FACTOR_WEIGHTS } from "@/shared/score/longevity";
import type { FactorKey } from "@/shared/types";

const c = theme.colors;

const EXAMPLE = {
  v: 1 as const,
  name: "Luna",
  species: "DOG" as const,
  breed: "Labrador Retriever",
  score: 742,
  factors: [84, 100, 72, 76, 55, 81],
  foodGrade: "A",
  day: "Example",
};

export default function Landing() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const status = useAuthStore((s) => s.status);
  const { data: pets, isPending } = usePets();

  if (status === "loading" || isPending) return <Loading />;
  if (pets && pets.length > 0) return <Redirect href="/(tabs)" />;

  return (
    <Screen width={1040}>
      <View style={s.nav}>
        <Text style={s.logo}>ANIMA</Text>
        <View style={s.navLinks}>
          <LinkText onPress={() => router.push("/science")}>The science</LinkText>
          {isSupabaseConfigured ? <LinkText onPress={() => router.push("/(auth)/login")}>Sign in</LinkText> : null}
        </View>
      </View>

      <View style={[s.hero, wide && s.heroWide]}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={[s.h1, wide && { fontSize: 52, lineHeight: 58 }]}>
            More good years with your pet starts with what is in the bowl.
          </Text>
          <Text style={s.lead}>
            ANIMA gives your dog or cat a Longevity Score built on published veterinary research, and rates the food you feed
            from its label. Free, in two minutes, no account needed.
          </Text>
          <View style={s.ctaRow}>
            <Button title="Get your pet's Score" variant="accent" onPress={() => router.push("/onboarding")} />
            <Button title="Rate a food" variant="secondary" onPress={() => router.push("/food/new")} />
          </View>
          <Text style={s.small}>Every factor links to its sources. See how it works before you start.</Text>
        </View>
        <View style={[{ flex: 1 }, !wide && { marginTop: 32 }]}>
          <ShareCardView card={EXAMPLE} />
        </View>
      </View>

      <Text accessibilityRole="header" style={s.h2}>
        What goes into the Score
      </Text>
      <View style={s.grid}>
        {(Object.keys(FACTOR_WEIGHTS) as FactorKey[]).map((key) => (
          <Card key={key} style={{ ...s.gridCard, flexBasis: wide ? "30%" : "100%" }}>
            <Text style={s.weight}>{Math.round(FACTOR_WEIGHTS[key] * 100)}%</Text>
            <Text style={s.cardTitle}>{FACTOR_LABELS[key]}</Text>
            <Text style={s.cardBody}>{BLURB[key]}</Text>
          </Card>
        ))}
      </View>

      <Text accessibilityRole="header" style={s.h2}>
        Food ratings you can check yourself
      </Text>
      <View style={[s.hero, wide && s.heroWide, { marginTop: 0 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.lead}>
            Nutrition is the largest part of the Score, so every food gets a grade from A to E. The grade comes from the label:
            whether the food is complete and balanced, its nutrients with the water removed, a few well-supported ingredient
            signals, how open the maker is, and its recall record.
          </Text>
          <Text style={[s.lead, { marginTop: 12 }]}>
            No brand can pay for a better grade. Type in the label of any food and see exactly where its points come from.
          </Text>
        </View>
        <View style={{ flex: 1, gap: 10, marginTop: wide ? 0 : 20 }}>
          {[
            ["A", "Feeding-trial tested, named meats, open maker"],
            ["C", "Meets minimums, little known about the maker"],
            ["E", "Added colourings and sugar, recalls on record"],
          ].map(([g, t]) => (
            <Card key={g} style={s.gradeRow}>
              <GradeBadge grade={g} size={40} />
              <Text style={s.cardBody}>{t}</Text>
            </Card>
          ))}
        </View>
      </View>

      <Card style={{ marginTop: 40, alignItems: "center", padding: 32 }}>
        <Text style={[s.h2, { marginTop: 0, textAlign: "center" }]}>Two minutes to a first Score</Text>
        <Text style={[s.lead, { textAlign: "center", maxWidth: 520 }]}>
          Breed, age, weight, body condition and what you feed. The Score sharpens as you log meals and care.
        </Text>
        <Button title="Start" variant="accent" onPress={() => router.push("/onboarding")} style={{ marginTop: 20, minWidth: 180 }} />
      </Card>

      <Text style={s.footer}>
        ANIMA is a wellness tool, not a veterinary service. The Score does not predict lifespan or diagnose illness.{" "}
        <LinkText onPress={() => router.push("/science")}>Method and sources</LinkText>
      </Text>
    </Screen>
  );
}

const BLURB: Record<FactorKey, string> = {
  nutritionQuality: "The rated quality of the main food, calories against target, and treats kept in check.",
  bodyCondition: "The 9-point body condition scale vets use. Lean dogs live longer.",
  genetic: "Published life expectancy for the breed, from studies of hundreds of thousands of pets.",
  ageHealth: "How far through the breed's typical lifespan your pet is.",
  preventiveCare: "Check-ups, vaccines, dental care and parasite prevention kept up to date.",
  activityLevel: "Daily active minutes against guidance for the breed type.",
};

const s = StyleSheet.create({
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  navLinks: { flexDirection: "row", gap: 20 },
  logo: { fontSize: 18, fontWeight: "800", letterSpacing: 4, color: c.textPrimary },
  hero: { marginTop: 24 },
  heroWide: { flexDirection: "row", alignItems: "center", gap: 48 },
  h1: { fontSize: 36, lineHeight: 42, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.8 },
  h2: { fontSize: 26, fontWeight: "800", color: c.textPrimary, marginTop: 64, marginBottom: 16, letterSpacing: -0.3 },
  lead: { fontSize: 17, lineHeight: 27, color: c.textSecondary, marginTop: 16 },
  ctaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 28 },
  small: { fontSize: 13, color: c.textTertiary, marginTop: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  gridCard: { flexGrow: 1 },
  weight: { fontSize: 28, fontWeight: "800", color: c.success },
  cardTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary, marginTop: 4 },
  cardBody: { flex: 1, fontSize: 14, lineHeight: 21, color: c.textSecondary, marginTop: 4 },
  gradeRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  footer: { fontSize: 13, lineHeight: 20, color: c.textTertiary, marginTop: 40, textAlign: "center" },
});

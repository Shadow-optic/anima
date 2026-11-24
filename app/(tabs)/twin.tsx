/**
 * Digital Twin tab — the pet's health topology rendered live.
 */

import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { PageHeader, Screen, SectionTitle, Card } from "@/components/ui";
import { TwinRenderer } from "@/components/TwinRenderer";
import { useActivePet, usePetScore } from "@/hooks/useData";
import { FACTOR_LABELS, FACTOR_WEIGHTS } from "@/shared/score/longevity";
import { getScoreColor, theme } from "@/config/theme";
import type { FactorKey } from "@/shared/types";

const c = theme.colors;

const FACTOR_COLORS: Record<FactorKey, string> = {
  nutritionQuality: "#10B981",
  bodyCondition: "#60A5FA",
  genetic: "#8B5CF6",
  ageHealth: "#F59E0B",
  preventiveCare: "#3B82F6",
  activityLevel: "#EC4899",
};

function FactorRow({ factor, score, weight }: { factor: FactorKey; score: number; weight: number }) {
  const pct = Math.round(score * 100);
  const color = FACTOR_COLORS[factor];
  return (
    <View style={st.factorRow}>
      <View style={[st.factorDot, { backgroundColor: color }]} />
      <Text style={st.factorLabel}>{FACTOR_LABELS[factor]}</Text>
      <View style={st.factorBarTrack}>
        <View style={[st.factorBar, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[st.factorValue, { color }]}>{pct}</Text>
    </View>
  );
}

export default function TwinScreen() {
  const { width } = useWindowDimensions();
  const { pet } = useActivePet();
  const { score: longevity } = usePetScore(pet);

  if (!pet || !longevity) {
    return (
      <Screen>
        <PageHeader title="Digital Twin" subtitle="Loading..." />
      </Screen>
    );
  }

  const { factors, score, label } = longevity;
  const twinSize = Math.min(width - 48, 380);

  return (
    <Screen>
      <PageHeader
        title="Digital Twin"
        subtitle={`${pet.name}'s health topology`}
      />

      <View style={st.twinWrap}>
        <TwinRenderer factors={factors} score={score} size={twinSize} />
      </View>

      <View style={st.scoreBadge}>
        <Text style={[st.scoreNum, { color: getScoreColor(score) }]}>{score}</Text>
        <Text style={st.scoreLabel}>{label}</Text>
      </View>

      <Text style={st.explainer}>
        Each health factor warps the field. Peaks glow where{" "}
        {pet.name} is thriving; wells appear where there's room to
        improve. Particles flow towards healthy regions.
      </Text>

      <SectionTitle>Health Factors</SectionTitle>
      <Card>
        {(Object.keys(FACTOR_WEIGHTS) as FactorKey[]).map((key) => (
          <FactorRow
            key={key}
            factor={key}
            score={factors[key]}
            weight={FACTOR_WEIGHTS[key]}
          />
        ))}
      </Card>

      <View style={{ height: 32 }} />
    </Screen>
  );
}

const st = StyleSheet.create({
  twinWrap: {
    alignItems: "center",
    marginVertical: 24,
  },
  scoreBadge: {
    alignItems: "center",
    marginBottom: 16,
  },
  scoreNum: {
    fontSize: 36,
    fontWeight: "800",
  },
  scoreLabel: {
    fontSize: 14,
    color: c.textSecondary,
    fontWeight: "600",
    marginTop: 2,
  },
  explainer: {
    fontSize: 13,
    color: c.textTertiary,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  factorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  factorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  factorLabel: {
    width: 100,
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: "500",
  },
  factorBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: c.surface,
    borderRadius: 3,
    overflow: "hidden",
  },
  factorBar: {
    height: 6,
    borderRadius: 3,
  },
  factorValue: {
    width: 32,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
});

/**
 * ANIMA Web Portal
 *
 * A responsive portal screen for desktop-class workflows.
 * Works on web and mobile, but optimized for browser width.
 */

import {useMemo} from "react";
import {ScrollView, StyleSheet, Text, useWindowDimensions, View} from "react-native";
import {getScoreColor, theme} from "@/config/theme";
import {useBehavioralInsights, useCareTimeline, useEnvironmentRisks, usePets} from "@/hooks/useApi";
import {usePetStore} from "@/stores";

export default function PortalScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;
  const { data: pets = [] } = usePets();
  const { activePetId } = usePetStore();

  const selectedPetId = activePetId || pets[0]?.id || "";
  const { data: behavior = [] } = useBehavioralInsights(selectedPetId);
  const { data: env } = useEnvironmentRisks(selectedPetId);
  const { data: care = [] } = useCareTimeline(selectedPetId);

  const scoreStats = useMemo(() => {
    if (pets.length === 0) return { avg: 0, best: 0, atRisk: 0 };
    const scores = pets.map((p) => p.currentScore?.score || 0);
    const avg = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
    const best = Math.max(...scores);
    const atRisk = scores.filter((value) => value < 600).length;
    return { avg, best, atRisk };
  }, [pets]);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>ANIMA Web Portal</Text>
      <Text style={s.subtitle}>Command center for longevity operations</Text>

      <View style={[s.metricRow, isWide && s.metricRowWide]}>
        <MetricCard label="Average Score" value={String(scoreStats.avg)} accent={getScoreColor(scoreStats.avg)} />
        <MetricCard label="Best Score" value={String(scoreStats.best)} accent={theme.colors.success} />
        <MetricCard label="Pets At Risk" value={String(scoreStats.atRisk)} accent={theme.colors.warning} />
        <MetricCard label="Environmental Risk" value={(env?.overallRiskLevel || "low").toUpperCase()} accent={theme.colors.environment} />
      </View>

      <View style={[s.mainGrid, isWide && s.mainGridWide]}>
        <View style={s.panel}>
          <Text style={s.panelTitle}>Pet Fleet</Text>
          {pets.length === 0 && <Text style={s.emptyText}>No pets available yet.</Text>}
          {pets.map((pet) => {
            const score = pet.currentScore?.score || 0;
            return (
              <View key={pet.id} style={s.petRow}>
                <View>
                  <Text style={s.petName}>{pet.name}</Text>
                  <Text style={s.petMeta}>{pet.breed} · {pet.species}</Text>
                </View>
                <Text style={[s.petScore, { color: getScoreColor(score) }]}>{score}</Text>
              </View>
            );
          })}
        </View>

        <View style={s.panel}>
          <Text style={s.panelTitle}>Priority Insights</Text>
          {behavior.length === 0 && <Text style={s.emptyText}>Insights will appear after data collection.</Text>}
          {behavior.slice(0, 4).map((insight: any, idx: number) => (
            <View key={`${insight.signal}-${idx}`} style={s.insightCard}>
              <Text style={s.insightSignal}>{insight.signal}</Text>
              <Text style={s.insightDetail}>{insight.recommendation}</Text>
            </View>
          ))}
        </View>

        <View style={s.panel}>
          <Text style={s.panelTitle}>Care Timeline</Text>
          {care.length === 0 && <Text style={s.emptyText}>No care events scheduled.</Text>}
          {care.slice(0, 6).map((item: any, idx: number) => (
            <View key={`${item.title}-${idx}`} style={s.timelineRow}>
              <View style={[s.timelineDot, {
                backgroundColor:
                  item.priority === "overdue"
                    ? theme.colors.danger
                    : item.priority === "due_soon"
                      ? theme.colors.warning
                      : theme.colors.info,
              }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.timelineTitle}>{item.title}</Text>
                <Text style={s.timelineMeta}>{item.dueDate || "Scheduled"} · {item.priority || "upcoming"}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={[s.metricCard, { borderColor: `${accent}66` }]}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  title: { fontSize: 30, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 8 },
  metricRow: { gap: 10 },
  metricRowWide: { flexDirection: "row", flexWrap: "wrap" },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    minWidth: 180,
    flexGrow: 1,
  },
  metricLabel: { fontSize: 12, color: theme.colors.textTertiary, textTransform: "uppercase", letterSpacing: 1 },
  metricValue: { marginTop: 8, fontSize: 28, fontWeight: "700" },
  mainGrid: { gap: 12 },
  mainGridWide: { flexDirection: "row", alignItems: "flex-start" },
  panel: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 16,
    gap: 10,
    minWidth: 280,
  },
  panelTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary },
  petRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  petName: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  petMeta: { marginTop: 2, fontSize: 12, color: theme.colors.textTertiary },
  petScore: { fontSize: 20, fontWeight: "700" },
  insightCard: {
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  insightSignal: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 4 },
  insightDetail: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineTitle: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary },
  timelineMeta: { marginTop: 2, fontSize: 11, color: theme.colors.textTertiary },
  emptyText: { fontSize: 12, color: theme.colors.textTertiary },
});

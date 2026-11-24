/**
 * ANIMA Health Tab
 * 
 * The intelligence layer: biomarker trends, environmental risks,
 * behavioral insights, voice monitor, care timeline.
 * 
 * This is where the "ambient intelligence" features live.
 */

import {useState} from "react";
import {Pressable, ScrollView, StyleSheet, Switch, Text, View} from "react-native";
import {theme} from "@/config/theme";
import {usePetStore, useUIStore} from "@/stores";
import {
    useBehavioralInsights,
    useBiomarkers,
    useCareTimeline,
    useEnvironmentRisks,
    useFoodAlerts,
} from "@/hooks/useApi";

type HealthView = "biomarkers" | "environment" | "behavior" | "voice" | "care";

export default function HealthScreen() {
  const { activePet, activePetId } = usePetStore();
  const { voiceMonitorActive, setVoiceMonitor } = useUIStore();
  const [activeView, setActiveView] = useState<HealthView>("biomarkers");

  const { data: biomarkers } = useBiomarkers(activePetId || "");
  const { data: envRisks } = useEnvironmentRisks(activePetId || "");
  const { data: behavioral } = useBehavioralInsights(activePetId || "");
  const { data: care } = useCareTimeline(activePetId || "");
  const { data: foodAlerts } = useFoodAlerts(activePetId || "");

  if (!activePet) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Add a pet to view health data</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Health Intelligence</Text>
      <Text style={styles.subtitle}>{activePet.name}'s ambient monitoring</Text>

      {/* Section tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {([
          { key: "biomarkers", label: "Biomarkers", icon: "🧬" },
          { key: "environment", label: "Environment", icon: "🌍" },
          { key: "behavior", label: "Behavior", icon: "🔍" },
          { key: "voice", label: "Voice", icon: "🎤" },
          { key: "care", label: "Care", icon: "📋" },
        ] as const).map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeView === tab.key && styles.tabActive]}
            onPress={() => setActiveView(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeView === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Biomarkers View ── */}
      {activeView === "biomarkers" && (
        <View>
          {biomarkers?.trends && biomarkers.trends.length > 0 ? (
            biomarkers.trends.map((trend: any, i: number) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.biomarkerName}>{trend.name}</Text>
                    <Text style={styles.biomarkerRef}>Ref: {trend.dataPoints[0]?.unit || ""}</Text>
                  </View>
                  <View style={styles.biomarkerValue}>
                    <Text style={[styles.biomarkerNumber, {
                      color: theme.colors.success,
                    }]}>
                      {trend.dataPoints[trend.dataPoints.length - 1]?.value || "—"}
                    </Text>
                    <Text style={styles.biomarkerTrend}>
                      {trend.trend === "stable" ? "→ Stable" : trend.trend === "rising" ? "↑ Rising" : "↓ Falling"}
                    </Text>
                  </View>
                </View>

                {/* Mini chart */}
                <View style={styles.miniChart}>
                  {trend.dataPoints.map((pt: any, j: number) => (
                    <View key={j} style={styles.miniChartBar}>
                      <View style={[styles.miniChartFill, {
                        height: `${Math.max(15, Math.min(100, (pt.value / 50) * 100))}%`,
                        backgroundColor: j === trend.dataPoints.length - 1
                          ? theme.colors.success
                          : `${theme.colors.success}40`,
                      }]} />
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionIcon}>⬡</Text>
              <Text style={styles.emptySectionTitle}>No biomarker data yet</Text>
              <Text style={styles.emptySectionText}>
                Scan a BioCard or add vet lab results to start tracking molecular health.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Environment View ── */}
      {activeView === "environment" && (
        <View>
          <View style={styles.envOverview}>
            <Text style={styles.envLabel}>Overall Risk Level</Text>
            <Text style={[styles.envLevel, {
              color: envRisks?.overallRiskLevel === "high" ? theme.colors.danger
                : envRisks?.overallRiskLevel === "elevated" ? theme.colors.warning
                : theme.colors.success,
            }]}>
              {(envRisks?.overallRiskLevel || "low").toUpperCase()}
            </Text>
          </View>

          {envRisks?.risks?.map((risk: any, i: number) => (
            <View key={i} style={[styles.card, {
              borderColor: risk.level === "high" ? `${theme.colors.danger}33`
                : risk.level === "elevated" ? `${theme.colors.warning}33`
                : theme.colors.surfaceBorder,
            }]}>
              <Text style={styles.riskTitle}>{risk.title}</Text>
              <View style={styles.riskBar}>
                <View style={[styles.riskBarFill, {
                  width: `${risk.score}%`,
                  backgroundColor: risk.level === "high" ? theme.colors.danger
                    : risk.level === "elevated" ? theme.colors.warning
                    : theme.colors.info,
                }]} />
              </View>
              <Text style={styles.riskDetail}>{risk.detail}</Text>
            </View>
          )) || (
            <Text style={styles.emptyText}>Environmental data loading...</Text>
          )}

          {envRisks?.actionItems?.map((action: string, i: number) => (
            <View key={i} style={styles.actionItem}>
              <Text style={styles.actionItemIcon}>💡</Text>
              <Text style={styles.actionItemText}>{action}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Behavior View ── */}
      {activeView === "behavior" && (
        <View>
          {behavioral && behavioral.length > 0 ? (
            behavioral.map((insight: any, i: number) => (
              <View key={i} style={[styles.card, {
                borderColor: insight.healthRelevance === "high" ? `${theme.colors.warning}33` : theme.colors.surfaceBorder,
              }]}>
                <View style={styles.insightHeader}>
                  <View style={[styles.relevanceBadge, {
                    backgroundColor: insight.healthRelevance === "high" ? `${theme.colors.warning}20` : `${theme.colors.info}20`,
                  }]}>
                    <Text style={[styles.relevanceText, {
                      color: insight.healthRelevance === "high" ? theme.colors.warning : theme.colors.info,
                    }]}>
                      {insight.healthRelevance.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.confidenceText}>{Math.round(insight.confidence * 100)}%</Text>
                </View>
                <Text style={styles.insightSignal}>{insight.signal}</Text>
                <Text style={styles.insightDetail}>{insight.recommendation}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionIcon}>🔍</Text>
              <Text style={styles.emptySectionTitle}>Building your patterns</Text>
              <Text style={styles.emptySectionText}>
                Log meals and weights for 7+ days to unlock behavioral insights.
              </Text>
            </View>
          )}

          {/* Food alerts */}
          {foodAlerts && foodAlerts.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionLabel}>Food Alerts</Text>
              {foodAlerts.map((alert: any, i: number) => (
                <View key={i} style={[styles.card, {
                  borderColor: alert.severity === "critical" ? `${theme.colors.danger}33` : theme.colors.surfaceBorder,
                }]}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertDetail}>{alert.detail}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── Voice Monitor View ── */}
      {activeView === "voice" && (
        <View>
          <View style={styles.voiceToggle}>
            <View>
              <Text style={styles.voiceToggleTitle}>Background Listening</Text>
              <Text style={styles.voiceToggleSubtitle}>Monitors while app is open</Text>
            </View>
            <Switch
              value={voiceMonitorActive}
              onValueChange={setVoiceMonitor}
              trackColor={{ false: theme.colors.surfaceHover, true: `${theme.colors.success}40` }}
              thumbColor={voiceMonitorActive ? theme.colors.success : theme.colors.textTertiary}
            />
          </View>

          {voiceMonitorActive && (
            <View style={styles.listeningIndicator}>
              {Array.from({ length: 12 }).map((_, i) => (
                <View key={i} style={[styles.listeningBar, {
                  height: 8 + Math.random() * 16,
                  opacity: 0.5 + Math.random() * 0.5,
                }]} />
              ))}
            </View>
          )}

          <View style={styles.voiceStats}>
            {[
              { label: "Resting RR", value: "18", unit: "breaths/min", status: "Normal" },
              { label: "Coughs Today", value: "0", unit: "", status: "Clear" },
              { label: "Monitored", value: "22m", unit: "today", status: "" },
            ].map((stat, i) => (
              <View key={i} style={styles.voiceStatCard}>
                <Text style={styles.voiceStatValue}>{stat.value}</Text>
                <Text style={styles.voiceStatLabel}>{stat.label}</Text>
                {stat.status && (
                  <View style={[styles.voiceStatBadge, { backgroundColor: `${theme.colors.success}20` }]}>
                    <Text style={[styles.voiceStatBadgeText, { color: theme.colors.success }]}>{stat.status}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={styles.privacyNote}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={styles.privacyText}>
              Audio never leaves your device. Only health signals (cough count, respiratory rate) are recorded.
            </Text>
          </View>
        </View>
      )}

      {/* ── Care Timeline View ── */}
      {activeView === "care" && (
        <View>
          {care && care.length > 0 ? (
            care.map((item: any, i: number) => {
              const dotColor =
                item.priority === "overdue" ? theme.colors.danger :
                item.priority === "due_soon" ? theme.colors.warning :
                theme.colors.info;

              return (
                <View key={i} style={styles.careItem}>
                  <View style={styles.careTimeline}>
                    <View style={[styles.careDot, { backgroundColor: dotColor }]} />
                    {i < care.length - 1 && <View style={styles.careLine} />}
                  </View>
                  <View style={[styles.card, { flex: 1, borderColor: `${dotColor}33` }]}>
                    <View style={styles.careHeader}>
                      <Text style={styles.careTitle}>{item.title}</Text>
                      <View style={[styles.careBadge, { backgroundColor: `${dotColor}20` }]}>
                        <Text style={[styles.careBadgeText, { color: dotColor }]}>
                          {item.priority === "overdue"
                            ? `${Math.abs(item.daysUntilDue)}d overdue`
                            : `${item.daysUntilDue}d`}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.careDetail}>{item.detail}</Text>
                    <Pressable style={[styles.careAction, { borderColor: `${dotColor}44` }]}>
                      <Text style={[styles.careActionText, { color: dotColor }]}>
                        {item.priority === "overdue" ? "Schedule Now" : "Set Reminder"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionIcon}>📋</Text>
              <Text style={styles.emptySectionTitle}>Care timeline building</Text>
              <Text style={styles.emptySectionText}>
                Add vet records and breed info to generate your personalized care schedule.
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.textPrimary },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, marginBottom: 16 },

  tabs: { gap: 6, marginBottom: 20, paddingVertical: 2 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 12, fontWeight: "500", color: theme.colors.textTertiary },
  tabLabelActive: { color: theme.colors.textPrimary },

  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.surfaceBorder, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },

  // Biomarkers
  biomarkerName: { fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary },
  biomarkerRef: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  biomarkerValue: { alignItems: "flex-end" },
  biomarkerNumber: { fontSize: 24, fontWeight: "700" },
  biomarkerTrend: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 2 },
  miniChart: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 32, marginTop: 12 },
  miniChartBar: { flex: 1, height: "100%", justifyContent: "flex-end" },
  miniChartFill: { borderRadius: 2, minHeight: 4 },

  // Environment
  envOverview: { alignItems: "center", paddingVertical: 20, marginBottom: 16 },
  envLabel: { fontSize: 12, color: theme.colors.textTertiary, marginBottom: 4 },
  envLevel: { fontSize: 28, fontWeight: "700" },
  riskTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 8 },
  riskBar: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 8 },
  riskBarFill: { height: "100%", borderRadius: 2 },
  riskDetail: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  actionItem: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, marginTop: 8 },
  actionItemIcon: { fontSize: 14 },
  actionItemText: { fontSize: 12, color: theme.colors.textSecondary, flex: 1, lineHeight: 18 },

  // Behavior
  insightHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  relevanceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  relevanceText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  confidenceText: { fontSize: 11, color: theme.colors.textTertiary },
  insightSignal: { fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 4 },
  insightDetail: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 10 },
  alertTitle: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 4 },
  alertDetail: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },

  // Voice
  voiceToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 16, borderWidth: 1, borderColor: theme.colors.surfaceBorder, marginBottom: 16 },
  voiceToggleTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  voiceToggleSubtitle: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  listeningIndicator: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 3, paddingVertical: 24, marginBottom: 16 },
  listeningBar: { width: 3, backgroundColor: theme.colors.success, borderRadius: 2 },
  voiceStats: { flexDirection: "row", gap: 10, marginBottom: 16 },
  voiceStatCard: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.surfaceBorder, padding: 14, alignItems: "center" },
  voiceStatValue: { fontSize: 24, fontWeight: "700", color: theme.colors.textPrimary },
  voiceStatLabel: { fontSize: 10, color: theme.colors.textTertiary, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.3 },
  voiceStatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, marginTop: 6 },
  voiceStatBadgeText: { fontSize: 10, fontWeight: "600" },
  privacyNote: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 14, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 10 },
  privacyIcon: { fontSize: 14, marginTop: 1 },
  privacyText: { fontSize: 11, color: theme.colors.textTertiary, flex: 1, lineHeight: 16 },

  // Care
  careItem: { flexDirection: "row", gap: 12, marginBottom: 4 },
  careTimeline: { alignItems: "center", width: 20 },
  careDot: { width: 10, height: 10, borderRadius: 5, marginTop: 16 },
  careLine: { width: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  careHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  careTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, flex: 1 },
  careBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  careBadgeText: { fontSize: 10, fontWeight: "600" },
  careDetail: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 10, lineHeight: 18 },
  careAction: { borderWidth: 1, borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  careActionText: { fontSize: 11, fontWeight: "600" },

  // Empty states
  empty: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary },
  emptySection: { alignItems: "center", paddingVertical: 40 },
  emptySectionIcon: { fontSize: 40, marginBottom: 12 },
  emptySectionTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 6 },
  emptySectionText: { fontSize: 13, color: theme.colors.textTertiary, textAlign: "center", maxWidth: 280, lineHeight: 20 },
});

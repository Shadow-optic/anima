/**
 * ANIMA Dashboard — The Home Screen
 * 
 * What the user sees every time they open the app.
 * The Score is the hero. Everything else serves the Score.
 * 
 * Layout:
 *   Score (big number, animated)
 *   Quick Insights Row (photo vitals, voice, env risk)
 *   Active Alerts (environmental, food, behavioral)
 *   Upcoming Care
 *   Recent Activity Feed
 */

import {useCallback, useEffect, useRef, useState} from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {useRouter} from "expo-router";
import {LinearGradient} from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {getScoreColor, getScoreLabel, theme} from "../config/theme";
import {usePetStore} from "../stores";
import {useBehavioralInsights, useCareTimeline, useEnvironmentRisks, usePets, useScore,} from "../hooks/useApi";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function DashboardScreen() {
  const router = useRouter();
  const { activePet, activePetId, setActivePet } = usePetStore();
  const [refreshing, setRefreshing] = useState(false);

  // Data hooks
  const { data: pets, refetch: refetchPets } = usePets();
  const { data: score, refetch: refetchScore } = useScore(activePetId || "");
  const { data: envRisks } = useEnvironmentRisks(activePetId || "");
  const { data: careTimeline } = useCareTimeline(activePetId || "");
  const { data: behavioral } = useBehavioralInsights(activePetId || "");

  // Set first pet as active if none selected
  useEffect(() => {
    if (!activePet && pets && pets.length > 0) {
      const first = pets[0];
      setActivePet(first, first.currentScore);
    }
  }, [pets, activePet]);

  // Score animation
  const scoreAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (score?.score) {
      scoreAnim.setValue(0);
      Animated.timing(scoreAnim, {
        toValue: score.score,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [score?.score]);

  const displayScore = scoreAnim.interpolate({
    inputRange: [0, 999],
    outputRange: [0, 999],
  });

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPets(), refetchScore()]);
    setRefreshing(false);
  }, []);

  const scoreColor = score ? getScoreColor(score.score) : theme.colors.textTertiary;
  const scoreLabel = score ? getScoreLabel(score.score) : "—";

  if (!activePet) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>🐾</Text>
        <Text style={styles.emptyTitle}>Welcome to ANIMA</Text>
        <Text style={styles.emptySubtitle}>Add your first pet to get started</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/onboarding")}
        >
          <Text style={styles.primaryButtonText}>Add Pet</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.textTertiary}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appLabel}>ANIMA</Text>
          <Text style={styles.petName}>{activePet.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.twinStatus}>Twin synced</Text>
          <View style={styles.twinDot} />
        </View>
      </View>

      {/* ── Longevity Score Hero ── */}
      <Pressable
        style={styles.scoreCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/pet/${activePet.id}`);
        }}
      >
        <LinearGradient
          colors={[`${scoreColor}15`, "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <Text style={styles.scoreLabel}>Longevity Score™</Text>

        <AnimatedScoreDisplay value={score?.score || 0} color={scoreColor} />

        <Text style={[styles.scoreLabelText, { color: scoreColor }]}>
          {scoreLabel}
        </Text>

        {score && (
          <Text style={styles.scoreSubtext}>
            Top {score.percentile || "—"}% of {activePet.breed}s
          </Text>
        )}

        {/* Factor bars */}
        {score?.breakdown && (
          <View style={styles.factorGrid}>
            {score.breakdown.slice(0, 6).map((factor: any) => (
              <View key={factor.factor} style={styles.factorItem}>
                <View style={styles.factorHeader}>
                  <Text style={styles.factorName}>{factor.label}</Text>
                  <Text style={styles.factorScore}>{factor.score}</Text>
                </View>
                <View style={styles.factorBar}>
                  <View
                    style={[
                      styles.factorBarFill,
                      {
                        width: `${factor.score}%`,
                        backgroundColor: factor.score >= 70
                          ? theme.colors.success
                          : factor.score >= 40
                          ? theme.colors.warning
                          : theme.colors.danger,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </Pressable>

      {/* ── Quick Insights Row ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.insightsRow}
      >
        <InsightCard
          icon="📸"
          title="Photo Vitals"
          value="7"
          unit="analyzed this week"
          color={theme.colors.photoVitals}
          onPress={() => router.push(`/pet/${activePet.id}?tab=photoVitals`)}
        />
        <InsightCard
          icon="🎤"
          title="Voice Monitor"
          value="18"
          unit="breaths/min"
          badge="Normal"
          color={theme.colors.voice}
          onPress={() => router.push(`/pet/${activePet.id}?tab=voice`)}
        />
        <InsightCard
          icon="🌡️"
          title="Environment"
          value={envRisks?.overallRiskLevel || "low"}
          unit="risk level"
          color={theme.colors.environment}
          onPress={() => router.push(`/pet/${activePet.id}?tab=environment`)}
        />
      </ScrollView>

      {/* ── Active Alerts ── */}
      {behavioral && behavioral.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          {behavioral.slice(0, 2).map((insight: any, i: number) => (
            <Pressable
              key={i}
              style={[styles.alertCard, {
                borderColor: insight.healthRelevance === "high"
                  ? `${theme.colors.warning}33`
                  : theme.colors.surfaceBorder,
              }]}
            >
              <View style={styles.alertBadge}>
                <Text style={[styles.alertBadgeText, {
                  color: insight.healthRelevance === "high"
                    ? theme.colors.warning
                    : theme.colors.info,
                }]}>
                  {insight.healthRelevance.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.alertTitle}>{insight.signal}</Text>
              <Text style={styles.alertDetail}>{insight.recommendation}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Upcoming Care ── */}
      {careTimeline && careTimeline.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Care</Text>
          {careTimeline.slice(0, 3).map((item: any, i: number) => (
            <View key={i} style={styles.careItem}>
              <View style={[styles.careDot, {
                backgroundColor:
                  item.priority === "overdue" ? theme.colors.danger :
                  item.priority === "due_soon" ? theme.colors.warning :
                  theme.colors.info,
              }]} />
              <View style={styles.careContent}>
                <Text style={styles.careTitle}>{item.title}</Text>
                <Text style={styles.careDetail}>{item.detail}</Text>
              </View>
              <View style={[styles.careBadge, {
                backgroundColor:
                  item.priority === "overdue" ? `${theme.colors.danger}20` :
                  item.priority === "due_soon" ? `${theme.colors.warning}20` :
                  `${theme.colors.info}20`,
              }]}>
                <Text style={[styles.careBadgeText, {
                  color:
                    item.priority === "overdue" ? theme.colors.danger :
                    item.priority === "due_soon" ? theme.colors.warning :
                    theme.colors.info,
                }]}>
                  {item.priority === "overdue"
                    ? `${Math.abs(item.daysUntilDue)}d overdue`
                    : `${item.daysUntilDue}d`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Quick Actions ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: "🍖", label: "Log Meal", route: "/nutrition" },
            { icon: "⚖️", label: "Weight", route: `/pet/${activePet.id}` },
            { icon: "📷", label: "Photo Vitals", route: `/pet/${activePet.id}?tab=photoVitals` },
            { icon: "⬡", label: "BioCard Scan", route: "/(tabs)/scan" },
          ].map((action) => (
            <Pressable
              key={action.label}
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(action.route as any);
              }}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Bottom spacer */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function AnimatedScoreDisplay({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = value;
    const duration = 1500;
    const start = Date.now();
    const startVal = display;

    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    animate();
  }, [value]);

  return (
    <Text style={[styles.scoreNumber, { color }]}>
      {display}
    </Text>
  );
}

function InsightCard({
  icon, title, value, unit, badge, color, onPress,
}: {
  icon: string;
  title: string;
  value: string;
  unit: string;
  badge?: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.insightCard} onPress={onPress}>
      <Text style={styles.insightIcon}>{icon}</Text>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={[styles.insightValue, { color }]}>{value}</Text>
      <Text style={styles.insightUnit}>{unit}</Text>
      {badge && (
        <View style={[styles.insightBadge, { backgroundColor: `${color}20` }]}>
          <Text style={[styles.insightBadgeText, { color }]}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  appLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: theme.colors.textTertiary,
  },
  petName: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  twinStatus: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  twinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },

  // Score card
  scoreCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 72,
    fontWeight: "700",
    lineHeight: 80,
  },
  scoreLabelText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  scoreSubtext: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 4,
  },
  factorGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 24,
  },
  factorItem: {
    width: (SCREEN_WIDTH - 80) / 2 - 4,
    paddingVertical: 4,
  },
  factorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  factorName: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  factorScore: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  factorBar: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: `${theme.colors.textTertiary}33`,
    overflow: "hidden",
  },
  factorBarFill: {
    height: "100%",
    borderRadius: 1.5,
  },

  // Insights row
  insightsRow: {
    paddingVertical: 4,
    gap: 10,
    marginBottom: 16,
  },
  insightCard: {
    width: 140,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 14,
  },
  insightIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontWeight: "500",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  insightValue: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  insightUnit: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  insightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  insightBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },

  // Alerts
  alertCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  alertBadge: {
    marginBottom: 8,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  alertDetail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  // Care timeline
  careItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
    gap: 10,
  },
  careDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  careContent: {
    flex: 1,
  },
  careTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  careDetail: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  careBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  careBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // Actions
  actionsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: theme.colors.buttonPrimary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: theme.radius.full,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.buttonPrimaryText,
  },
});

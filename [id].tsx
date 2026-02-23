/**
 * ANIMA Pet Detail Screen
 * Deep dive into a single pet's Digital Twin
 * Accessible via /pet/[id] route
 */

import {useCallback, useState} from "react";
import {Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from "react-native";
import {Stack, useLocalSearchParams, useRouter} from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import {getScoreColor, theme} from "./config/theme";
import {Badge, Button, Card, EmptyState, FactorBar, ScoreDisplay, SectionHeader} from "./components/ui";
import {
    useAnalyzePhoto,
    useBehavioralInsights,
    useBiomarkers,
    useCareTimeline,
    useEnvironmentRisks,
    usePet,
    useRecomputeScore,
    useScore,
    useScoreHistory,
} from "./hooks/useApi";

type Tab = "overview" | "photoVitals" | "environment" | "voice" | "biomarkers" | "care";

export default function PetDetailScreen() {
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>((initialTab as Tab) || "overview");
  const [refreshing, setRefreshing] = useState(false);

  const { data: pet, refetch: refetchPet } = usePet(id);
  const { data: score, refetch: refetchScore } = useScore(id);
  const { data: scoreHistory } = useScoreHistory(id);
  const { data: biomarkers } = useBiomarkers(id);
  const { data: envRisks } = useEnvironmentRisks(id);
  const { data: care } = useCareTimeline(id);
  const { data: behavioral } = useBehavioralInsights(id);
  const analyzePhoto = useAnalyzePhoto();
  const recomputeScore = useRecomputeScore();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPet(), refetchScore()]);
    setRefreshing(false);
  }, []);

  const handlePhotoVitals = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      analyzePhoto.mutate({ petId: id, imageBase64: result.assets[0].base64 });
    }
  };

  if (!pet) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    );
  }

  const scoreColor = score ? getScoreColor(score.score) : theme.colors.textTertiary;

  return (
    <>
      <Stack.Screen options={{
        headerShown: true,
        headerTitle: pet.name,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.textPrimary,
        headerShadowVisible: false,
      }} />

      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.textTertiary} />}
      >
        {/* Pet header */}
        <View style={s.petHeader}>
          <View style={s.petAvatar}>
            <Text style={{ fontSize: 44 }}>{pet.species === "DOG" ? "🐕" : "🐈"}</Text>
          </View>
          <View style={s.petInfo}>
            <Text style={s.petName}>{pet.name}</Text>
            <Text style={s.petBreed}>{pet.breed}</Text>
            <Text style={s.petMeta}>
              {pet.weightKg}kg · BCS {pet.bodyCondition}/9 · {pet.sex === "MALE" ? "M" : "F"} · {pet.neutered ? "Neutered" : "Intact"}
            </Text>
          </View>
        </View>

        {/* Score card */}
        {score && (
          <Card style={s.scoreCard} borderColor={`${scoreColor}22`}>
            <ScoreDisplay score={score.score} size="lg" />
            {score.percentile && (
              <Text style={s.percentile}>Top {score.percentile}% of {pet.breed}s</Text>
            )}
            <Pressable
              style={s.recomputeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                recomputeScore.mutate(id);
              }}
            >
              <Text style={s.recomputeText}>
                {recomputeScore.isPending ? "Computing..." : "↻ Recompute"}
              </Text>
            </Pressable>
          </Card>
        )}

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {([
            { key: "overview", label: "Overview" },
            { key: "photoVitals", label: "Photo Vitals" },
            { key: "biomarkers", label: "Biomarkers" },
            { key: "environment", label: "Environment" },
            { key: "care", label: "Care Plan" },
          ] as const).map((tab) => (
            <Pressable
              key={tab.key}
              style={[s.tab, activeTab === tab.key && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && score?.breakdown && (
          <View style={s.section}>
            <SectionHeader title="Score Breakdown" />
            {score.breakdown.map((factor: any) => (
              <FactorBar
                key={factor.factor}
                label={factor.label}
                score={factor.score}
              />
            ))}

            {/* Score history mini-chart */}
            {scoreHistory && scoreHistory.length > 1 && (
              <View style={{ marginTop: 24 }}>
                <SectionHeader title="Score Trend" />
                <View style={s.trendChart}>
                  {scoreHistory.slice(-12).map((entry: any, i: number) => {
                    const maxS = Math.max(...scoreHistory.map((e: any) => e.score));
                    const minS = Math.min(...scoreHistory.map((e: any) => e.score));
                    const range = maxS - minS || 1;
                    const pct = ((entry.score - minS) / range) * 100;
                    return (
                      <View key={i} style={s.trendBar}>
                        <View style={[s.trendBarFill, {
                          height: `${Math.max(10, pct)}%`,
                          backgroundColor: i === scoreHistory.length - 1
                            ? getScoreColor(entry.score)
                            : `${getScoreColor(entry.score)}50`,
                        }]} />
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Behavioral insights preview */}
            {behavioral && behavioral.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <SectionHeader title="Latest Insights" />
                {behavioral.slice(0, 2).map((insight: any, i: number) => (
                  <Card key={i} style={{ marginBottom: 8 }} borderColor={
                    insight.healthRelevance === "high" ? `${theme.colors.warning}33` : undefined
                  }>
                    <Text style={s.insightSignal}>{insight.signal}</Text>
                    <Text style={s.insightDetail}>{insight.recommendation}</Text>
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── PHOTO VITALS ── */}
        {activeTab === "photoVitals" && (
          <View style={s.section}>
            <SectionHeader title="Photo Vitals™" action="Analyze Photo" onAction={handlePhotoVitals} />
            <Text style={s.sectionDesc}>
              Every photo of {pet.name} is a health data point. Take or select a photo to extract visual health signals.
            </Text>

            <Button
              title={analyzePhoto.isPending ? "Analyzing..." : "📸 Analyze a Photo"}
              onPress={handlePhotoVitals}
              loading={analyzePhoto.isPending}
              style={{ marginVertical: 16 }}
            />

            {analyzePhoto.data && (
              <View style={{ gap: 10 }}>
                {analyzePhoto.data.bodyConditionScore && (
                  <Card>
                    <Text style={s.vitalLabel}>Body Condition Score</Text>
                    <Text style={s.vitalValue}>{analyzePhoto.data.bodyConditionScore}/9</Text>
                    <Text style={s.vitalConf}>Confidence: {Math.round(analyzePhoto.data.bcsConfidence * 100)}%</Text>
                  </Card>
                )}
                {analyzePhoto.data.coatQuality && (
                  <Card>
                    <Text style={s.vitalLabel}>Coat Quality</Text>
                    <Text style={s.vitalValue}>{analyzePhoto.data.coatQuality.overallScore}/100</Text>
                  </Card>
                )}
                {analyzePhoto.data.eyeHealth && (
                  <Card>
                    <Text style={s.vitalLabel}>Eye Clarity</Text>
                    <Text style={s.vitalValue}>{analyzePhoto.data.eyeHealth.clarity}%</Text>
                  </Card>
                )}
                {analyzePhoto.data.recommendations?.map((rec: string, i: number) => (
                  <Card key={i} borderColor={`${theme.colors.warning}33`}>
                    <Text style={s.insightDetail}>📌 {rec}</Text>
                  </Card>
                ))}
              </View>
            )}

            {!analyzePhoto.data && (
              <EmptyState
                icon="📸"
                title="No photos analyzed yet"
                subtitle="Take a photo of your pet to extract visual health signals — body condition, coat quality, eye health, and more."
              />
            )}
          </View>
        )}

        {/* ── BIOMARKERS ── */}
        {activeTab === "biomarkers" && (
          <View style={s.section}>
            <SectionHeader title="Biomarker Trends" />
            {biomarkers?.trends && biomarkers.trends.length > 0 ? (
              biomarkers.trends.map((trend: any, i: number) => (
                <Card key={i} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={s.bioName}>{trend.name}</Text>
                    <Badge
                      text={trend.status || "normal"}
                      color={trend.status === "critical" ? theme.colors.danger : theme.colors.success}
                    />
                  </View>
                  <Text style={[s.bioValue, {
                    color: trend.status === "critical" ? theme.colors.danger : theme.colors.success,
                  }]}>
                    {trend.dataPoints?.[trend.dataPoints.length - 1]?.value || "—"}
                  </Text>
                  <Text style={s.bioTrend}>
                    Trend: {trend.trend === "stable" ? "→ Stable" : trend.trend === "rising" ? "↑ Rising" : "↓ Falling"}
                  </Text>
                </Card>
              ))
            ) : (
              <EmptyState
                icon="⬡"
                title="No biomarker data"
                subtitle="Scan a BioCard or add vet lab results to start tracking molecular health."
                actionLabel="Scan BioCard"
                onAction={() => router.push("/(tabs)/scan")}
              />
            )}
          </View>
        )}

        {/* ── ENVIRONMENT ── */}
        {activeTab === "environment" && (
          <View style={s.section}>
            <SectionHeader title="Environmental Intelligence" />
            {envRisks?.risks?.map((risk: any, i: number) => (
              <Card key={i} style={{ marginBottom: 10 }} borderColor={
                risk.level === "high" ? `${theme.colors.danger}33` :
                risk.level === "elevated" ? `${theme.colors.warning}33` : undefined
              }>
                <Text style={s.riskTitle}>{risk.title}</Text>
                <View style={s.riskBar}>
                  <View style={[s.riskFill, {
                    width: `${risk.score}%`,
                    backgroundColor: risk.level === "high" ? theme.colors.danger :
                      risk.level === "elevated" ? theme.colors.warning : theme.colors.info,
                  }]} />
                </View>
                <Text style={s.riskDetail}>{risk.detail}</Text>
              </Card>
            )) || (
              <EmptyState icon="🌍" title="Loading environment data" subtitle="Grant location access for real-time risk assessment." />
            )}
          </View>
        )}

        {/* ── CARE PLAN ── */}
        {activeTab === "care" && (
          <View style={s.section}>
            <SectionHeader title="Predictive Care Timeline" />
            {care && care.length > 0 ? (
              care.map((item: any, i: number) => {
                const dotColor = item.priority === "overdue" ? theme.colors.danger :
                  item.priority === "due_soon" ? theme.colors.warning : theme.colors.info;
                return (
                  <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 6 }}>
                    <View style={{ alignItems: "center", width: 20 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor, marginTop: 14 }} />
                      {i < care.length - 1 && <View style={{ width: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.08)", marginTop: 4 }} />}
                    </View>
                    <Card style={{ flex: 1 }} borderColor={`${dotColor}33`}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Text style={s.careTitle}>{item.title}</Text>
                        <Badge
                          text={item.priority === "overdue" ? `${Math.abs(item.daysUntilDue)}d overdue` : `${item.daysUntilDue}d`}
                          color={dotColor}
                        />
                      </View>
                      <Text style={s.careDetail}>{item.detail}</Text>
                    </Card>
                  </View>
                );
              })
            ) : (
              <EmptyState icon="📋" title="Building care plan" subtitle="Add vet records and breed info to generate personalized care." />
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background },
  loadingText: { color: theme.colors.textTertiary },

  petHeader: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20, marginTop: 8 },
  petAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  petInfo: { flex: 1 },
  petName: { fontSize: 22, fontWeight: "700", color: theme.colors.textPrimary },
  petBreed: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  petMeta: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 4 },

  scoreCard: { alignItems: "center", padding: 28, marginBottom: 16 },
  percentile: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 8 },
  recomputeBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  recomputeText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "500" },

  tabs: { gap: 4, marginBottom: 20, paddingVertical: 2 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  tabText: { fontSize: 13, fontWeight: "500", color: theme.colors.textTertiary },
  tabTextActive: { color: theme.colors.textPrimary },

  section: {},
  sectionDesc: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 8 },

  trendChart: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 48 },
  trendBar: { flex: 1, height: "100%", justifyContent: "flex-end" },
  trendBarFill: { borderRadius: 2, minHeight: 4 },

  insightSignal: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 4 },
  insightDetail: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },

  vitalLabel: { fontSize: 12, color: theme.colors.textTertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  vitalValue: { fontSize: 28, fontWeight: "700", color: theme.colors.textPrimary, marginTop: 4 },
  vitalConf: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },

  bioName: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  bioValue: { fontSize: 24, fontWeight: "700", marginTop: 4 },
  bioTrend: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 4 },

  riskTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 8 },
  riskBar: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 8 },
  riskFill: { height: "100%", borderRadius: 2 },
  riskDetail: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },

  careTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, flex: 1 },
  careDetail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
});

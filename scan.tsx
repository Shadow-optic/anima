/**
 * ANIMA BioCard Scan Screen
 */

import {useEffect, useRef, useState} from "react";
import {ActivityIndicator, Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {CameraView, useCameraPermissions} from "expo-camera";
import * as Haptics from "expo-haptics";
import {getScoreColor, theme} from "../config/theme";
import {useAuthStore, usePetStore} from "../stores";
import {useScanBioCard} from "../hooks/useApi";

export default function ScanScreen() {
  const { activePet, activePetId } = usePetStore();
  const { tier } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<"ready" | "processing" | "results">("ready");
  const [results, setResults] = useState<any>(null);
  const cameraRef = useRef<any>(null);
  const scanBioCard = useScanBioCard();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  if (tier !== "PRO" && tier !== "VET") {
    return (
      <View style={s.gate}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>⬡</Text>
        <Text style={s.gateTitle}>BioCard Scanning</Text>
        <Text style={s.gateSub}>Scan diagnostic cartridges to measure biomarkers at home. Requires Pro tier.</Text>
        <Pressable style={s.upgradeBtn}><Text style={s.upgradeTxt}>Upgrade to Pro — $29.99/mo</Text></Pressable>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={s.gate}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>📷</Text>
        <Text style={s.gateTitle}>Camera Access Needed</Text>
        <Pressable style={s.upgradeBtn} onPress={requestPermission}><Text style={s.upgradeTxt}>Grant Access</Text></Pressable>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || !activePetId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("processing");
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, base64: true });
      const result = await scanBioCard.mutateAsync({ petId: activePetId, imageBase64: photo.base64!, cardVersion: "v1" });
      setResults(result);
      setPhase("results");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Scan Failed", e.message || "Try again with better lighting.");
      setPhase("ready");
    }
  };

  if (phase === "results" && results) {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={s.resultsTitle}>Scan Complete</Text>
        <View style={s.qualityRow}>
          <Text style={s.qualityLabel}>Scan Quality</Text>
          <Text style={s.qualityValue}>{Math.round(results.scanQuality * 100)}%</Text>
        </View>

        {results.updatedScore && (
          <View style={s.scoreCard}>
            <Text style={s.scoreLabel}>Updated Longevity Score</Text>
            <Text style={[s.scoreNum, { color: getScoreColor(results.updatedScore.score) }]}>
              {results.updatedScore.score}
            </Text>
          </View>
        )}

        <Text style={s.readingsLabel}>Biomarker Results</Text>
        {results.biomarkers?.readings?.map((r: any, i: number) => {
          const statusColor = r.status === "NORMAL" ? theme.colors.success : r.status === "CRITICAL" ? theme.colors.danger : theme.colors.warning;
          return (
            <View key={i} style={s.readingCard}>
              <View style={s.readingRow}>
                <Text style={s.readingName}>{r.name}</Text>
                <View style={[s.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                  <Text style={[s.statusText, { color: statusColor }]}>{r.status}</Text>
                </View>
              </View>
              <Text style={[s.readingValue, { color: statusColor }]}>{r.value} <Text style={s.readingUnit}>{r.unit}</Text></Text>
              {r.confidence && <Text style={s.confidence}>Confidence: {Math.round(r.confidence * 100)}%</Text>}
            </View>
          );
        })}

        {results.warnings?.length > 0 && (
          <View style={s.warningsCard}>
            {results.warnings.map((w: string, i: number) => (
              <Text key={i} style={s.warningText}>⚠️ {w}</Text>
            ))}
          </View>
        )}

        <Pressable style={s.scanAgainBtn} onPress={() => { setResults(null); setPhase("ready"); }}>
          <Text style={s.scanAgainText}>Scan Another BioCard</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={s.overlay}>
        <View style={s.topBar}>
          <Text style={s.topTitle}>Scan BioCard</Text>
          <Text style={s.topSub}>{activePet?.name || ""}</Text>
        </View>

        <View style={s.guideArea}>
          <Animated.View style={[s.guideFrame, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[s.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[s.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
            <View style={[s.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
            <View style={[s.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
          </Animated.View>
          <Text style={s.guideText}>
            {phase === "ready" ? "Align BioCard within frame" : "Analyzing..."}
          </Text>
        </View>

        <View style={s.bottomBar}>
          {phase === "processing" ? (
            <ActivityIndicator size="large" color={theme.colors.biocard} />
          ) : (
            <Pressable style={s.captureBtn} onPress={handleCapture}>
              <View style={s.captureBtnInner}><Text style={{ fontSize: 24, color: theme.colors.biocard }}>⬡</Text></View>
            </Pressable>
          )}
          <Text style={s.helpText}>Flat surface · Good lighting · Hold steady</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  gate: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background, padding: 40 },
  gateTitle: { fontSize: 22, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 8, textAlign: "center" },
  gateSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  upgradeBtn: { backgroundColor: theme.colors.biocard, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 100 },
  upgradeTxt: { fontSize: 14, fontWeight: "600", color: "#000" },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between" },
  topBar: { paddingTop: 60, paddingHorizontal: 24, backgroundColor: "rgba(0,0,0,0.5)" },
  topTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  topSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2, marginBottom: 12 },

  guideArea: { alignItems: "center" },
  guideFrame: { width: 300, height: 188, borderRadius: 12 },
  corner: { position: "absolute", width: 30, height: 30, borderColor: theme.colors.biocard, borderRadius: 2 },
  guideText: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 16, fontWeight: "500" },

  bottomBar: { alignItems: "center", paddingBottom: 40, backgroundColor: "rgba(0,0,0,0.5)", paddingTop: 20 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: theme.colors.biocard, alignItems: "center", justifyContent: "center" },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(6,182,212,0.15)", alignItems: "center", justifyContent: "center" },
  helpText: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 12 },

  // Results
  resultsTitle: { fontSize: 24, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 16 },
  qualityRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  qualityLabel: { fontSize: 13, color: theme.colors.textSecondary },
  qualityValue: { fontSize: 13, fontWeight: "600", color: theme.colors.success },
  scoreCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: theme.colors.surfaceBorder },
  scoreLabel: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 8 },
  scoreNum: { fontSize: 56, fontWeight: "700" },
  readingsLabel: { fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 12 },
  readingCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.surfaceBorder },
  readingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  readingName: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary },
  readingValue: { fontSize: 28, fontWeight: "700" },
  readingUnit: { fontSize: 14, fontWeight: "400" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  confidence: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 4 },
  warningsCard: { backgroundColor: `${theme.colors.warning}10`, borderRadius: 12, padding: 14, marginTop: 12 },
  warningText: { fontSize: 12, color: theme.colors.warning, lineHeight: 18, marginBottom: 4 },
  scanAgainBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.biocard, alignItems: "center" },
  scanAgainText: { fontSize: 14, fontWeight: "600", color: theme.colors.biocard },
});

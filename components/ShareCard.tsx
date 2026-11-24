/**
 * The shareable Score card, and the panel of ways to share it.
 */

import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getGradeColor, getScoreColor, getScoreLabel, theme } from "@/config/theme";
import { Bar, Button } from "@/components/ui";
import { FACTOR_LABELS } from "@/shared/score/longevity";
import { FACTOR_ORDER, type ShareCard } from "@/shared/share/card";
import { copyText, downloadBlob, nativeShare, renderShareImage, shareText, shareUrl } from "@/lib/share";

const c = theme.colors;

export function ShareCardView({ card }: { card: ShareCard }) {
  const color = getScoreColor(card.score);
  return (
    <View style={s.card}>
      <LinearGradient colors={[`${color}30`, "transparent"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} />
      <Text style={s.kicker}>ANIMA · LONGEVITY SCORE</Text>
      <Text style={s.name}>{card.name}</Text>
      <Text style={s.breed}>
        {card.breed} · {card.species === "DOG" ? "Dog" : "Cat"}
      </Text>
      <View style={s.scoreRow}>
        <Text style={[s.score, { color }]}>{card.score}</Text>
        <View>
          <Text style={[s.label, { color }]}>{getScoreLabel(card.score)}</Text>
          <Text style={s.outOf}>out of 999</Text>
        </View>
        {card.foodGrade ? (
          <View style={[s.food, { borderColor: getGradeColor(card.foodGrade) }]}>
            <Text style={[s.foodGrade, { color: getGradeColor(card.foodGrade) }]}>{card.foodGrade}</Text>
            <Text style={s.foodLabel}>Food</Text>
          </View>
        ) : null}
      </View>
      <View style={s.factors}>
        {FACTOR_ORDER.map((key, i) => (
          <View key={key} style={s.factor}>
            <View style={s.factorTop}>
              <Text style={s.factorName}>{FACTOR_LABELS[key]}</Text>
              <Text style={s.factorVal}>{card.factors[i]}</Text>
            </View>
            <Bar value={card.factors[i]} />
          </View>
        ))}
      </View>
      <Text style={s.date}>{card.day}</Text>
    </View>
  );
}

export function SharePanel({ card }: { card: ShareCard }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const web = Platform.OS === "web";
  const canNativeShare = web && typeof navigator !== "undefined" && !!(navigator as any).share;

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      setStatus(await fn());
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <ShareCardView card={card} />
      <View style={s.actions}>
        {canNativeShare ? (
          <Button
            title="Share"
            variant="accent"
            loading={busy}
            onPress={() =>
              run(async () => ((await nativeShare(card, await renderShareImage(card))) ? "Shared." : "Sharing was cancelled."))
            }
          />
        ) : null}
        <Button
          title="Copy link"
          variant={canNativeShare ? "secondary" : "accent"}
          onPress={() => run(async () => ((await copyText(shareUrl(card))) ? "Link copied." : "Could not copy. Select the link below instead."))}
        />
        {web ? (
          <Button
            title="Download image"
            variant="secondary"
            onPress={() =>
              run(async () => {
                const blob = await renderShareImage(card);
                if (!blob) return "Could not create the image in this browser.";
                downloadBlob(blob, `${card.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "pet"}-longevity-score.png`);
                return "Image downloaded.";
              })
            }
          />
        ) : null}
      </View>
      {status ? (
        <Text accessibilityLiveRegion="polite" style={s.status}>
          {status}
        </Text>
      ) : null}
      <Text selectable style={s.url}>
        {shareUrl(card)}
      </Text>
      <Text style={s.caption}>
        Anyone with the link sees this card: name, breed, Score and factor bars. Nothing else about you or your pet is shared.
      </Text>
      <Text style={s.caption}>Suggested caption: {shareText(card)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, borderColor: c.surfaceBorderHover, backgroundColor: "#0E0E14", padding: 24, overflow: "hidden" },
  kicker: { fontSize: 12, fontWeight: "700", letterSpacing: 1.6, color: c.textSecondary },
  name: { fontSize: 30, fontWeight: "800", color: c.textPrimary, marginTop: 14 },
  breed: { fontSize: 14, color: c.textSecondary, marginTop: 2 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 },
  score: { fontSize: 84, lineHeight: 92, fontWeight: "800", fontVariant: ["tabular-nums"] },
  label: { fontSize: 20, fontWeight: "700" },
  outOf: { fontSize: 13, color: c.textTertiary, marginTop: 2 },
  food: { marginLeft: "auto", alignItems: "center", borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  foodGrade: { fontSize: 24, fontWeight: "800" },
  foodLabel: { fontSize: 11, color: c.textSecondary },
  factors: { flexDirection: "row", flexWrap: "wrap", columnGap: 20, rowGap: 12, marginTop: 16 },
  factor: { flexBasis: "45%", flexGrow: 1 },
  factorTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  factorName: { fontSize: 12, color: c.textSecondary },
  factorVal: { fontSize: 12, fontWeight: "700", color: c.textPrimary },
  date: { fontSize: 11, color: c.textTertiary, marginTop: 16 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  status: { fontSize: 13, color: c.success, marginTop: 10 },
  url: { fontSize: 12, color: c.textTertiary, marginTop: 12 },
  caption: { fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 8 },
});

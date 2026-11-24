/**
 * Score components: the factor list with its evidence, and the trend line.
 */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@/config/theme";
import { Badge, Bar, Button, LinkText } from "@/components/ui";
import { FACTOR_EVIDENCE, referencesFor, STRENGTH_LABEL } from "@/shared/score/evidence";
import { upsidePoints } from "@/shared/score/longevity";
import type { ScoreBreakdown, ScoreSnapshot } from "@/shared/types";

const c = theme.colors;

/** Every factor, with a "why" panel that cites the research behind it. */
export function FactorList({ breakdown, interactive = true }: { breakdown: ScoreBreakdown[]; interactive?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const router = useRouter();
  return (
    <View>
      {breakdown.map((f) => {
        const evidence = FACTOR_EVIDENCE[f.factor];
        const isOpen = open === f.factor;
        const upside = upsidePoints(f);
        return (
          <View key={f.factor} style={s.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${f.label}, ${f.score} out of 100. ${isOpen ? "Hide" : "Show"} the evidence`}
              disabled={!interactive}
              onPress={() => setOpen(isOpen ? null : f.factor)}
              style={({ hovered, focused }: any) => [s.head, (hovered || focused) && interactive && s.headHover]}
            >
              <View style={s.headTop}>
                <Text style={s.name}>{f.label}</Text>
                <Text style={s.weight}>{Math.round(f.weight * 100)}% of Score</Text>
                <View style={{ flex: 1 }} />
                {f.estimated ? <Badge text="No data yet" color={c.warning} /> : <Text style={s.value}>{f.score}</Text>}
                {interactive ? <Text style={s.chevron}>{isOpen ? "−" : "+"}</Text> : null}
              </View>
              <Bar value={f.score} color={f.estimated ? c.textTertiary : undefined} />
              <Text style={s.detail}>{f.detail}</Text>
            </Pressable>

            {f.suggestion ? (
              <View style={s.suggest}>
                <Text style={s.suggestText}>
                  {f.suggestion}
                  {upside >= 5 ? <Text style={s.upside}>{`  Up to +${upside} points.`}</Text> : null}
                </Text>
                {interactive && f.actionRoute ? (
                  <Button small variant="secondary" title="Go" onPress={() => router.push(f.actionRoute as any)} />
                ) : null}
              </View>
            ) : null}

            {isOpen ? (
              <View style={s.evidence}>
                <Badge
                  text={STRENGTH_LABEL[evidence.strength]}
                  color={evidence.strength === "strong" ? c.success : evidence.strength === "moderate" ? c.info : c.warning}
                />
                <Text style={s.eHead}>What it measures</Text>
                <Text style={s.eBody}>{evidence.measures}</Text>
                <Text style={s.eHead}>How it is calculated</Text>
                <Text style={s.eBody}>{evidence.method}</Text>
                <Text style={s.eHead}>Why it counts</Text>
                <Text style={s.eBody}>{evidence.why}</Text>
                <Text style={s.eHead}>What it cannot tell you</Text>
                <Text style={s.eBody}>{evidence.limits}</Text>
                <Text style={s.eHead}>Sources</Text>
                {referencesFor(evidence.references).map((r) => (
                  <View key={r.id} style={s.ref}>
                    <Text style={s.refFinding}>{r.finding}</Text>
                    <LinkText href={r.url} style={s.refCite}>
                      {r.citation}
                    </LinkText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** A plain trend of daily Scores. Needs two days of history to draw. */
export function ScoreTrend({ snapshots }: { snapshots: ScoreSnapshot[] }) {
  const points = snapshots.slice(-30);
  if (points.length < 2) {
    return <Text style={s.trendEmpty}>The trend appears once there are two days of history.</Text>;
  }
  const values = points.map((p) => p.score);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 20);
  const change = values[values.length - 1] - values[0];
  return (
    <View>
      <View style={s.trendRow} accessibilityLabel={`Score moved from ${values[0]} to ${values[values.length - 1]} over ${points.length} days`}>
        {points.map((p) => (
          <View key={p.day} style={s.trendCol}>
            <View style={[s.trendBar, { height: 8 + ((p.score - min) / span) * 48 }]} />
          </View>
        ))}
      </View>
      <View style={s.trendLegend}>
        <Text style={s.trendText}>{points[0].day}</Text>
        <Text style={[s.trendText, { color: change >= 0 ? c.success : c.danger, fontWeight: "700" }]}>
          {change >= 0 ? "+" : ""}
          {change} over {points.length} days
        </Text>
        <Text style={s.trendText}>{points[points.length - 1].day}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { borderTopWidth: 1, borderTopColor: c.surfaceBorder, paddingVertical: 14 },
  head: { borderRadius: 8, padding: 4, margin: -4 },
  headHover: { backgroundColor: c.surfaceHover },
  headTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: "700", color: c.textPrimary },
  weight: { fontSize: 12, color: c.textTertiary },
  value: { fontSize: 15, fontWeight: "700", color: c.textPrimary, fontVariant: ["tabular-nums"] },
  chevron: { fontSize: 18, color: c.textSecondary, width: 18, textAlign: "center" },
  detail: { fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 8 },
  suggest: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: `${c.info}14` },
  suggestText: { flex: 1, fontSize: 13, lineHeight: 19, color: c.textPrimary },
  upside: { color: c.success, fontWeight: "700" },
  evidence: { marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: c.surfaceBorder },
  eHead: { fontSize: 12, fontWeight: "700", color: c.textTertiary, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 12, marginBottom: 4 },
  eBody: { fontSize: 14, lineHeight: 21, color: c.textPrimary },
  ref: { marginBottom: 10 },
  refFinding: { fontSize: 14, lineHeight: 21, color: c.textPrimary },
  refCite: { fontSize: 12, lineHeight: 17, fontWeight: "400", marginTop: 2 },
  trendEmpty: { fontSize: 13, color: c.textTertiary },
  trendRow: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 60 },
  trendCol: { flex: 1, justifyContent: "flex-end" },
  trendBar: { backgroundColor: c.info, borderRadius: 2, minWidth: 3 },
  trendLegend: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  trendText: { fontSize: 12, color: c.textTertiary },
});

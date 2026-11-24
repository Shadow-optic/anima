/**
 * Food components: a catalog row and the full rating breakdown.
 */

import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import { Badge, Bar, Card, GradeBadge, Notice } from "@/components/ui";
import { GRADE_MEANING, type FoodRating } from "@/shared/food/rating";
import type { FoodProduct } from "@/shared/types";

const c = theme.colors;

const FORMAT_LABEL: Record<string, string> = {
  KIBBLE: "Dry",
  WET: "Wet",
  FRESH: "Fresh",
  FREEZE_DRIED: "Freeze-dried",
  RAW: "Raw",
  TREAT: "Treat",
  TOPPER: "Topper",
};

export function foodTitle(food: FoodProduct): string {
  return food.isSample || !food.brand ? food.name : `${food.brand} ${food.name}`.trim();
}

export function FoodRow({
  food,
  rating,
  onPress,
  right,
  showFit,
}: {
  food: FoodProduct;
  rating: FoodRating;
  onPress?: () => void;
  right?: React.ReactNode;
  showFit?: boolean;
}) {
  const fit = showFit ? rating.fit : undefined;
  const grade = fit ? fit.grade : rating.grade;
  const score = fit ? fit.score : rating.score;
  return (
    <Card onPress={onPress} style={s.row} label={`${foodTitle(food)}, grade ${grade}`}>
      <GradeBadge grade={grade} score={score} />
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{foodTitle(food)}</Text>
        <Text style={s.meta}>
          {FORMAT_LABEL[food.format] ?? food.format} · {food.species === "BOTH" ? "Dogs & cats" : food.species === "DOG" ? "Dogs" : "Cats"} ·{" "}
          {Math.round(rating.kcalPerKg / 10)} kcal/100g
          {food.priceUsd && food.packageSizeKg ? ` · $${food.priceUsd} / ${food.packageSizeKg} kg` : ""}
        </Text>
        <View style={s.badges}>
          {food.isSample ? <Badge text="Sample product" /> : null}
          {food.ownerId ? <Badge text="Your label entry" color={c.info} /> : null}
          {fit && !fit.suitable ? <Badge text="Not suitable as main diet" color={c.danger} /> : null}
        </View>
      </View>
      {right}
    </Card>
  );
}

export function RatingBreakdown({ rating, petName }: { rating: FoodRating; petName?: string }) {
  const fit = rating.fit;
  return (
    <View>
      <View style={s.headline}>
        <GradeBadge grade={rating.grade} score={rating.score} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={s.headTitle}>
            Food Score {rating.score}/100 · {GRADE_MEANING[rating.grade]}
          </Text>
          <Text style={s.meta}>
            Based on {Math.round(rating.confidence * 100)}% known label data. Unknowns earn partial credit, never full marks.
          </Text>
        </View>
      </View>

      {fit && petName ? (
        <Card style={{ marginTop: 14 }}>
          <View style={s.headline}>
            <GradeBadge grade={fit.grade} score={fit.score} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={s.headTitle}>
                {fit.suitable ? `Fit for ${petName}: ${fit.score}/100` : `Not suitable as ${petName}'s main diet`}
              </Text>
              <Text style={s.meta}>The base score adjusted for {petName}'s species, life stage and body condition.</Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            {fit.reasons.map((r, i) => (
              <Notice key={i} level={r.level}>
                {r.text}
              </Notice>
            ))}
          </View>
        </Card>
      ) : null}

      {rating.flags.length > 0 ? (
        <View style={{ marginTop: 14 }}>
          {rating.flags.map((f, i) => (
            <Notice key={i} level={f.level}>
              {f.text}
            </Notice>
          ))}
        </View>
      ) : null}

      <Card style={{ marginTop: 14 }}>
        <Text style={s.cardTitle}>How the score adds up</Text>
        {rating.components.map((comp) => (
          <View key={comp.key} style={s.comp}>
            <View style={s.compTop}>
              <Text style={s.compName}>{comp.label}</Text>
              <Text style={s.compVal}>
                {Math.round(comp.earned)} / {comp.max}
              </Text>
            </View>
            <Bar value={(comp.earned / comp.max) * 100} />
            {comp.notes.map((n, i) => (
              <Text key={i} style={s.note}>
                {n}
              </Text>
            ))}
          </View>
        ))}
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Text style={s.cardTitle}>Nutrients on a dry-matter basis</Text>
        <Text style={s.meta}>Water removed, so wet and dry foods can be compared directly.</Text>
        <View style={s.dmGrid}>
          {[
            ["Protein", `${rating.dryMatter.proteinPct.toFixed(0)}%`],
            ["Fat", `${rating.dryMatter.fatPct.toFixed(0)}%`],
            ["Fibre", `${rating.dryMatter.fiberPct.toFixed(0)}%`],
            ["Carbs (est.)", `${rating.dryMatter.carbsPct.toFixed(0)}%`],
            ["Energy", `${Math.round(rating.kcalPerKg)} kcal/kg${rating.kcalIsEstimated ? " (est.)" : ""}`],
          ].map(([k, v]) => (
            <View key={k} style={s.dmCell}>
              <Text style={s.dmVal}>{v}</Text>
              <Text style={s.dmKey}>{k}</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10, padding: 14 },
  name: { fontSize: 15, fontWeight: "700", color: c.textPrimary },
  meta: { fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 3 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  headline: { flexDirection: "row", alignItems: "center", gap: 14 },
  headTitle: { fontSize: 17, fontWeight: "700", color: c.textPrimary },
  cardTitle: { fontSize: 15, fontWeight: "700", color: c.textPrimary, marginBottom: 4 },
  comp: { marginTop: 14 },
  compTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  compName: { fontSize: 14, fontWeight: "600", color: c.textPrimary },
  compVal: { fontSize: 14, fontWeight: "700", color: c.textPrimary, fontVariant: ["tabular-nums"] },
  note: { fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 6 },
  dmGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  dmCell: { minWidth: 96, flexGrow: 1, padding: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.04)" },
  dmVal: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  dmKey: { fontSize: 12, color: c.textTertiary, marginTop: 2 },
});

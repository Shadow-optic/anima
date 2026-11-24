/**
 * Rate any food from its label.
 *
 * The visitor copies the guaranteed analysis and ingredients off the bag and
 * gets the same rating the catalog foods get. Works without an account or a pet.
 */

import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@/config/theme";
import { Button, Card, Field, GradeBadge, LinkText, Notice, PageHeader, Screen, Segmented } from "@/components/ui";
import { useActivePet, useAddCustomFood } from "@/hooks/useData";
import { GRADE_MEANING, rateFood } from "@/shared/food/rating";
import type { AdequacyBasis, AdequacyLifeStage, FoodCategory, FoodFormat, FoodProduct, Species } from "@/shared/types";

const c = theme.colors;

function num(v: string): number | undefined {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

export default function NewFood() {
  const router = useRouter();
  const { pet } = useActivePet();
  const addFood = useAddCustomFood();

  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>(pet?.species ?? "DOG");
  const [category, setCategory] = useState<FoodCategory>("COMPLETE");
  const [format, setFormat] = useState<"KIBBLE" | "WET" | "FRESH">("KIBBLE");
  const [basis, setBasis] = useState<AdequacyBasis>("UNKNOWN");
  const [stage, setStage] = useState<AdequacyLifeStage>("UNKNOWN");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [moisture, setMoisture] = useState("");
  const [calcium, setCalcium] = useState("");
  const [phosphorus, setPhosphorus] = useState("");
  const [kcal, setKcal] = useState("");
  const [kcalPerTreat, setKcalPerTreat] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isTreat = category !== "COMPLETE";
  const defaultMoisture = format === "KIBBLE" ? 10 : format === "WET" ? 78 : 70;

  const draft = useMemo((): Omit<FoodProduct, "id"> | null => {
    const p = num(protein);
    const f = num(fat);
    if (p == null || f == null) return null;
    const m = num(moisture) ?? (isTreat ? 15 : defaultMoisture);
    const fi = num(fiber) ?? 3;
    if (p < 0 || f < 0 || fi < 0 || m < 0 || m > 95 || p + f + fi + m > 100) return null;
    const list = ingredients
      .split(/[,;\n]+/)
      .map((i) => i.trim())
      .filter(Boolean)
      .slice(0, 60);
    return {
      brand: brand.trim().slice(0, 60),
      name: name.trim().slice(0, 80) || "Unnamed food",
      species,
      category,
      format: (isTreat ? (category === "TREAT" ? "TREAT" : "TOPPER") : format) as FoodFormat,
      adequacyBasis: isTreat ? "NONE" : basis,
      adequacyLifeStage: isTreat ? "SUPPLEMENTAL" : basis === "NONE" ? "SUPPLEMENTAL" : stage,
      ga: {
        proteinMinPct: p,
        fatMinPct: f,
        fiberMaxPct: fi,
        moistureMaxPct: m,
        calciumPct: num(calcium),
        phosphorusPct: num(phosphorus),
      },
      kcalPerKg: num(kcal),
      kcalPerTreat: isTreat ? num(kcalPerTreat) : undefined,
      ingredients: list,
    };
  }, [brand, name, species, category, format, basis, stage, protein, fat, fiber, moisture, calcium, phosphorus, kcal, kcalPerTreat, ingredients, isTreat, defaultMoisture]);

  const preview = useMemo(() => (draft ? rateFood({ ...draft, id: "preview" }) : null), [draft]);

  const save = async () => {
    if (!name.trim()) return setError("Give the food a name so you can find it again.");
    if (!draft) return setError("Enter protein and fat from the guaranteed analysis. The percentages cannot add up to more than 100.");
    setError(null);
    try {
      const saved = await addFood.mutateAsync(draft);
      router.replace(`/food/${saved.id}` as any);
    } catch (e: any) {
      setError(e?.message ?? "Could not save. Try again.");
    }
  };

  return (
    <Screen width={640}>
      <LinkText onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={{ marginBottom: 16 }}>
        ← Back
      </LinkText>
      <PageHeader title="Rate a food by its label" subtitle="Copy the details from the bag or can. The grade updates as you type." />

      <Card>
        <Field label="Brand" value={brand} onChangeText={setBrand} maxLength={60} autoCapitalize="words" />
        <Field label="Product name" value={name} onChangeText={setName} maxLength={80} autoCapitalize="words" />
        <Segmented label="Made for" value={species} onChange={setSpecies} options={[{ value: "DOG", label: "Dogs" }, { value: "CAT", label: "Cats" }]} />
        <Segmented
          label="Type"
          value={category}
          onChange={setCategory}
          options={[{ value: "COMPLETE", label: "Main food" }, { value: "TREAT", label: "Treat" }, { value: "TOPPER", label: "Topper" }]}
        />
        {!isTreat ? (
          <Segmented
            label="Form"
            value={format}
            onChange={setFormat}
            options={[{ value: "KIBBLE", label: "Dry" }, { value: "WET", label: "Wet / canned" }, { value: "FRESH", label: "Fresh / refrigerated" }]}
            wrap
          />
        ) : null}
      </Card>

      {!isTreat ? (
        <Card style={{ marginTop: 14 }}>
          <Text style={s.cardTitle}>Nutritional adequacy statement</Text>
          <Text style={s.hint}>Small print, usually near the ingredients. It begins “[Product] is formulated to meet…” or “Animal feeding tests…”.</Text>
          <View style={{ height: 12 }} />
          <Segmented
            label="What does it say?"
            value={basis}
            onChange={setBasis}
            wrap
            options={[
              { value: "FEEDING_TRIAL", label: "Animal feeding tests" },
              { value: "FORMULATED", label: "Formulated to meet AAFCO profiles" },
              { value: "NONE", label: "Supplemental feeding only" },
              { value: "UNKNOWN", label: "Can't find it" },
            ]}
          />
          {basis === "FEEDING_TRIAL" || basis === "FORMULATED" ? (
            <Segmented
              label="For which life stage?"
              value={stage}
              onChange={setStage}
              wrap
              options={[
                { value: "MAINTENANCE", label: "Adult maintenance" },
                { value: "GROWTH", label: "Growth" },
                { value: "ALL_LIFE_STAGES", label: "All life stages" },
                { value: "UNKNOWN", label: "Not sure" },
              ]}
            />
          ) : null}
        </Card>
      ) : null}

      <Card style={{ marginTop: 14 }}>
        <Text style={s.cardTitle}>Guaranteed analysis</Text>
        <Text style={s.hint}>Percentages as printed. Leave blank what the label does not state.</Text>
        <View style={s.grid}>
          <View style={s.cell}><Field label="Crude protein min %" value={protein} onChangeText={setProtein} inputMode="decimal" /></View>
          <View style={s.cell}><Field label="Crude fat min %" value={fat} onChangeText={setFat} inputMode="decimal" /></View>
          <View style={s.cell}><Field label="Crude fibre max %" value={fiber} onChangeText={setFiber} inputMode="decimal" placeholder="3" /></View>
          <View style={s.cell}><Field label="Moisture max %" value={moisture} onChangeText={setMoisture} inputMode="decimal" placeholder={String(isTreat ? 15 : defaultMoisture)} /></View>
          {!isTreat ? (
            <>
              <View style={s.cell}><Field label="Calcium %" value={calcium} onChangeText={setCalcium} inputMode="decimal" /></View>
              <View style={s.cell}><Field label="Phosphorus %" value={phosphorus} onChangeText={setPhosphorus} inputMode="decimal" /></View>
            </>
          ) : (
            <View style={s.cell}><Field label="Calories per treat" value={kcalPerTreat} onChangeText={setKcalPerTreat} inputMode="decimal" /></View>
          )}
          <View style={s.cell}><Field label="Calories (kcal/kg)" value={kcal} onChangeText={setKcal} inputMode="decimal" hint="Estimated if blank." /></View>
        </View>
        <Field
          label="Ingredients"
          value={ingredients}
          onChangeText={setIngredients}
          multiline
          placeholder="Chicken, chicken meal, brown rice, …"
          hint="In label order, separated by commas."
          autoCapitalize="none"
        />
      </Card>

      {preview ? (
        <Card style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <GradeBadge grade={preview.grade} score={preview.score} size={60} />
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>
              Food Score {preview.score}/100 · {GRADE_MEANING[preview.grade]}
            </Text>
            <Text style={s.hint}>
              {Math.round(preview.confidence * 100)}% of the rating rests on what you entered. Maker and recall details are
              not known for label entries, so they earn partial credit. Save to see the full breakdown.
            </Text>
          </View>
        </Card>
      ) : null}

      {error ? (
        <View style={{ marginTop: 12 }}>
          <Notice level="warning">{error}</Notice>
        </View>
      ) : null}
      <Button title="Save and see full rating" variant="accent" onPress={save} loading={addFood.isPending} style={{ marginTop: 16 }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  cardTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  hint: { fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, marginTop: 14 },
  cell: { flexBasis: 150, flexGrow: 1 },
});

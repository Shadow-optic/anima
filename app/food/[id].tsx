/**
 * Food detail: the full rating, the fit for the active pet, and the label facts.
 */

import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { theme } from "@/config/theme";
import { Badge, Button, Card, EmptyState, LinkText, Notice, PageHeader, Screen, SectionTitle } from "@/components/ui";
import { RatingBreakdown, foodTitle } from "@/components/food";
import { useActivePet, useFoodRating, useFoods, usePetScore, useUpdatePet } from "@/hooks/useData";
import { dailyCostUsd, dailyPortionGrams } from "@/shared/food/rating";
import { BRAND_FACTS } from "@/shared/food/real";
import { FOOD_DISCLAIMER } from "@/shared/score/evidence";

const c = theme.colors;

const ADEQUACY: Record<string, string> = {
  FEEDING_TRIAL: "Complete and balanced, shown by AAFCO feeding trials",
  FORMULATED: "Complete and balanced, formulated to AAFCO nutrient profiles",
  NONE: "No adequacy statement: supplemental feeding only",
  UNKNOWN: "Adequacy statement not on record",
};
const STAGE: Record<string, string> = {
  GROWTH: "Growth (puppies or kittens)",
  MAINTENANCE: "Adult maintenance",
  ALL_LIFE_STAGES: "All life stages",
  SUPPLEMENTAL: "Supplemental",
  UNKNOWN: "Not stated",
};

export default function FoodDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { byId } = useFoods();
  const { pet } = useActivePet();
  const { diet } = usePetScore(pet);
  const updatePet = useUpdatePet();
  const food = typeof id === "string" ? byId.get(id) : undefined;
  const rating = useFoodRating(food, pet);

  const back = () => (router.canGoBack() ? router.back() : router.replace(pet ? "/(tabs)/shop" : "/"));

  if (!food || !rating) {
    return (
      <Screen>
        <EmptyState title="Food not found" body="It may have been entered in another browser or account." action="Back" onAction={back} />
      </Screen>
    );
  }

  const facts = food.source ? BRAND_FACTS[food.brand] : undefined;
  const isCurrent = pet?.primaryFoodId === food.id;
  const suitable = rating.fit ? rating.fit.suitable : true;
  const canBeMain = food.category === "COMPLETE";
  const target = diet?.dailyCalorieTarget ?? 0;
  const portion = pet && canBeMain && target ? dailyPortionGrams(food, target) : null;
  const cost = pet && canBeMain && target ? dailyCostUsd(food, target) : null;

  return (
    <Screen>
      <LinkText onPress={back} style={{ marginBottom: 16 }}>
        ← Back
      </LinkText>
      <PageHeader title={foodTitle(food)} subtitle={facts ? `Made by ${facts.company}` : undefined} />
      <View style={s.badges}>
        {food.isSample ? <Badge text="Sample product, not a real brand" /> : null}
        {food.ownerId ? <Badge text="Entered from a label by you" color={c.info} /> : null}
        {(food.tags ?? []).map((t) => (
          <Badge key={t} text={t} />
        ))}
      </View>

      {food.source ? (
        <Notice level="info">
          Label data read from the {food.source.type === "manufacturer" ? "maker's site" : "a retailer's listing"} on{" "}
          {food.source.retrievedAt}. Recipes change, so check it against your pack.{food.note ? ` ${food.note}` : ""}{" "}
          <LinkText href={food.source.url}>Source</LinkText>
        </Notice>
      ) : null}

      <RatingBreakdown rating={rating} petName={pet?.name} />

      {pet && canBeMain ? (
        <Card style={{ marginTop: 14 }}>
          <Text style={s.cardTitle}>Feeding {pet.name}</Text>
          {portion ? (
            <Text style={s.body}>
              About {portion} g a day to meet the {target} kcal target{cost != null ? `, roughly $${cost.toFixed(2)} a day` : ""}.
            </Text>
          ) : null}
          {isCurrent ? (
            <Notice level="good">This is {pet.name}'s current main food.</Notice>
          ) : (
            <>
              {!suitable ? <Notice level="warning">Marked not suitable as {pet.name}'s main diet. See the reasons above.</Notice> : null}
              <Button
                title={`Make this ${pet.name}'s main food`}
                variant={suitable ? "accent" : "secondary"}
                loading={updatePet.isPending}
                onPress={() => updatePet.mutate({ id: pet.id, patch: { primaryFoodId: food.id } })}
                style={{ marginTop: 12, alignSelf: "flex-start" }}
              />
            </>
          )}
          <Text style={s.hint}>Change foods gradually over about a week, mixing the new food in.</Text>
        </Card>
      ) : null}

      <Card style={{ marginTop: 14 }}>
        <Text style={s.cardTitle}>Buying</Text>
        <Text style={s.body}>
          {food.priceUsd && food.packageSizeKg ? `Listed at $${food.priceUsd} for ${food.packageSizeKg} kg. ` : ""}
          Ordering through ANIMA is not open yet.
        </Text>
      </Card>

      <SectionTitle>From the label</SectionTitle>
      <Card>
        <Row k="Adequacy statement" v={food.aafcoStatement ?? ADEQUACY[food.adequacyBasis]} />
        <Row k="Life stage" v={STAGE[food.adequacyLifeStage]} />
        <Row
          k="Guaranteed analysis"
          v={`Protein min ${food.ga.proteinMinPct}% · Fat min ${food.ga.fatMinPct}% · Fibre max ${food.ga.fiberMaxPct}% · Moisture max ${food.ga.moistureMaxPct}%`}
        />
        {food.ga.calciumPct != null && food.ga.phosphorusPct != null ? (
          <Row k="Minerals" v={`Calcium ${food.ga.calciumPct}% · Phosphorus ${food.ga.phosphorusPct}%`} />
        ) : null}
        <Row k="Ingredients" v={food.ingredients.length ? food.ingredients.join(", ") : "Not on record"} />
      </Card>

      {facts ? (
        <>
          <SectionTitle>Maker and recall record</SectionTitle>
          <Card>
            <Row k="Company" v={facts.company} />
            <Row
              k="Recalls found, last five years"
              v={
                facts.recalls?.length
                  ? facts.recalls.map((r) => `${r.date}: ${r.product}. ${r.reason}.`).join("\n")
                  : "None found on the FDA's public listings. Those listings are incomplete for part of the period, so this is scored as unknown, not as a clean record."
              }
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 12 }}>
              <LinkText href={facts.makerSource}>Maker information source</LinkText>
              {facts.recalls?.map((r) => (
                <LinkText key={r.url} href={r.url}>
                  FDA notice {r.date}
                </LinkText>
              ))}
            </View>
          </Card>
        </>
      ) : null}

      <Text style={s.disclaimer}>
        {FOOD_DISCLAIMER} <LinkText onPress={() => router.push("/science")} style={{ fontSize: 12 }}>How foods are scored</LinkText>
      </Text>
    </Screen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowKey}>{k}</Text>
      <Text style={s.rowVal}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 18, marginTop: -8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  body: { fontSize: 14, lineHeight: 21, color: c.textSecondary, marginTop: 6, marginBottom: 8 },
  hint: { fontSize: 13, color: c.textTertiary, marginTop: 12 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.surfaceBorder },
  rowKey: { fontSize: 12, fontWeight: "700", color: c.textTertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  rowVal: { fontSize: 14, lineHeight: 21, color: c.textPrimary, marginTop: 4 },
  disclaimer: { fontSize: 12, lineHeight: 18, color: c.textTertiary, marginTop: 24 },
});

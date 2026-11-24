/**
 * Shop: every food graded, ranked by how well it fits the active pet.
 * Buying is not open yet; this is the rated catalog of real products it will sell from.
 */

import { useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@/config/theme";
import { Button, Field, Notice, PageHeader, Screen, Segmented } from "@/components/ui";
import { FoodRow, foodTitle } from "@/components/food";
import { useActivePet, useFoods } from "@/hooks/useData";
import { rateFood } from "@/shared/food/rating";
import { petContext } from "@/shared/score/longevity";

const c = theme.colors;
type Filter = "ALL" | "COMPLETE" | "TREAT";

export default function Shop() {
  const router = useRouter();
  const { pet } = useActivePet();
  const { foods } = useFoods();
  const [filter, setFilter] = useState<Filter>("COMPLETE");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    if (!pet) return [];
    const ctx = petContext(pet);
    const q = query.trim().toLowerCase();
    return foods
      .filter((f) => f.species === pet.species || f.species === "BOTH")
      .filter((f) => filter === "ALL" || (filter === "COMPLETE" ? f.category === "COMPLETE" : f.category !== "COMPLETE"))
      .filter((f) => !q || `${f.brand} ${f.name} ${(f.tags ?? []).join(" ")}`.toLowerCase().includes(q))
      .map((food) => ({ food, rating: rateFood(food, ctx) }))
      .sort((a, b) => (b.rating.fit?.score ?? 0) - (a.rating.fit?.score ?? 0) || foodTitle(a.food).localeCompare(foodTitle(b.food)));
  }, [foods, pet, filter, query]);

  if (!pet) return null;

  return (
    <Screen>
      <PageHeader
        title="Shop"
        subtitle={`Every food graded A to E from its label, ranked by fit for ${pet.name}.`}
        right={<Button small title="Rate a label" variant="secondary" onPress={() => router.push("/food/new")} />}
      />
      <Notice level="info">
        Ordering is not open yet. Grades come from each product's label, read from the maker's site on the date shown on
        its page. Recipes change, so check the figures against your own bag. Can't find yours? Rate its label.
      </Notice>
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "COMPLETE", label: "Food" },
          { value: "TREAT", label: "Treats & toppers" },
          { value: "ALL", label: "All" },
        ]}
      />
      <Field label="Search" value={query} onChangeText={setQuery} placeholder="Salmon, puppy, weight…" autoCapitalize="none" />
      {rows.length === 0 ? <Text style={s.empty}>Nothing matches.</Text> : null}
      {rows.map(({ food, rating }) => (
        <FoodRow
          key={food.id}
          food={food}
          rating={rating}
          showFit
          onPress={() => router.push(`/food/${food.id}` as any)}
          right={pet.primaryFoodId === food.id ? <Text style={s.current}>Current food</Text> : undefined}
        />
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  empty: { fontSize: 14, color: c.textTertiary, marginTop: 8 },
  current: { fontSize: 12, fontWeight: "700", color: c.success },
});

/**
 * Care: preventive care records, body condition and activity.
 * These feed 40% of the Score between them.
 */

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/config/theme";
import { Badge, Button, Card, Field, LinkText, Loading, Notice, PageHeader, Screen, SectionTitle, Segmented, confirmAction } from "@/components/ui";
import { useActivePet, useAddCare, useCare, useDeleteCare, useUpdatePet } from "@/hooks/useData";
import { summariseCare, petContext } from "@/shared/score/longevity";
import type { CareKind } from "@/shared/types";
import { BCS_TEXT } from "../onboarding";

const c = theme.colors;

const KINDS: Array<{ kind: CareKind; title: string; every: string; months: number }> = [
  { kind: "WELLNESS_EXAM", title: "Vet check-up", every: "Every 12 months, every 6 for seniors", months: 12 },
  { kind: "DENTAL", title: "Dental care", every: "A dental check or cleaning every 12 months", months: 12 },
  { kind: "VACCINATION", title: "Vaccination", every: "Core boosters at least every 3 years; follow your vet's schedule", months: 36 },
  { kind: "PARASITE_PREVENTION", title: "Parasite prevention", every: "Flea, tick and worm cover, usually monthly to quarterly", months: 3 },
];

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function ago(months: number): string {
  if (months < 1) return "this month";
  if (months < 24) return `${Math.round(months)} month${Math.round(months) === 1 ? "" : "s"} ago`;
  return `${(months / 12).toFixed(1)} years ago`;
}

export default function Care() {
  const { pet } = useActivePet();
  const { data: events } = useCare(pet?.id);
  const addCare = useAddCare();
  const deleteCare = useDeleteCare();
  const updatePet = useUpdatePet();
  const [dates, setDates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  if (!pet) return null;
  if (!events) return <Loading />;

  const summary = summariseCare(events);
  const senior = petContext(pet).stage === "SENIOR";

  const record = (kind: CareKind) => {
    const date = (dates[kind] ?? isoToday()).trim();
    const t = new Date(date).getTime();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(t) || t > Date.now() + 86400000) {
      setError("Enter a date as YYYY-MM-DD, not in the future.");
      return;
    }
    setError(null);
    addCare.mutate({ petId: pet.id, kind, date });
  };

  const saveWeight = () => {
    const kg = parseFloat(weight.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 0.3 || kg > 120) {
      setSaved("Enter a weight in kg.");
      return;
    }
    updatePet.mutate({ id: pet.id, patch: { weightKg: Math.round(kg * 10) / 10 } }, { onSuccess: () => { setSaved("Weight updated."); setWeight(""); } });
  };

  return (
    <Screen>
      <PageHeader title="Care" subtitle={`Preventive care, body condition and activity for ${pet.name}.`} />

      <SectionTitle>Preventive care</SectionTitle>
      {!summary.anyRecorded ? (
        <Notice level="info">Nothing recorded yet, so this part of the Score is a placeholder. Add the dates you know.</Notice>
      ) : null}
      {error ? <Notice level="warning">{error}</Notice> : null}
      {KINDS.map(({ kind, title, every, months }) => {
        const since = summary.monthsSince[kind];
        const window = kind === "WELLNESS_EXAM" && senior ? 6 : months;
        const due = since == null || since > window;
        return (
          <Card key={kind} style={{ marginBottom: 10 }}>
            <View style={s.careTop}>
              <Text style={s.careTitle}>{title}</Text>
              {since == null ? <Badge text="Not recorded" color={c.warning} /> : due ? <Badge text="Due" color={c.danger} /> : <Badge text="Up to date" color={c.success} />}
            </View>
            <Text style={s.meta}>
              {every}.{since != null ? ` Last: ${ago(since)}.` : ""}
            </Text>
            <View style={s.recordRow}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Date done"
                  value={dates[kind] ?? isoToday()}
                  onChangeText={(v) => setDates({ ...dates, [kind]: v })}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
              </View>
              <Button title="Record" variant="secondary" onPress={() => record(kind)} loading={addCare.isPending} style={{ marginTop: 22 }} />
            </View>
          </Card>
        );
      })}

      <SectionTitle>Body condition</SectionTitle>
      <Card>
        <Segmented
          label="Body condition score (1–9)"
          value={pet.bodyCondition}
          onChange={(v) => updatePet.mutate({ id: pet.id, patch: { bodyCondition: v } })}
          options={[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ value: n, label: String(n) }))}
        />
        <Notice level={pet.bodyCondition >= 4 && pet.bodyCondition <= 5 ? "good" : "info"}>{BCS_TEXT[pet.bodyCondition]}</Notice>
        <View style={s.recordRow}>
          <View style={{ flex: 1 }}>
            <Field label={`Weight in kg (now ${pet.weightKg})`} value={weight} onChangeText={setWeight} inputMode="decimal" placeholder={String(pet.weightKg)} />
          </View>
          <Button title="Update" variant="secondary" onPress={saveWeight} loading={updatePet.isPending} style={{ marginTop: 22 }} />
        </View>
        {saved ? <Text accessibilityLiveRegion="polite" style={s.meta}>{saved}</Text> : null}
      </Card>

      <SectionTitle>Activity</SectionTitle>
      <Card>
        <Segmented
          label="Active minutes on a typical day"
          value={pet.activityMinutesPerDay}
          onChange={(v) => updatePet.mutate({ id: pet.id, patch: { activityMinutesPerDay: v } })}
          wrap
          options={[
            { value: 15, label: "Under 20 min" },
            { value: 30, label: "About 30 min" },
            { value: 60, label: "About an hour" },
            { value: 90, label: "90 min" },
            { value: 120, label: "2 hours or more" },
          ]}
        />
        <Text style={s.meta}>Walks, play and running all count. Build up gradually and check with your vet for older pets or those with joint or breathing problems.</Text>
      </Card>

      <SectionTitle>History</SectionTitle>
      {events.length === 0 ? <Text style={s.meta}>No care recorded yet.</Text> : null}
      {events.map((e) => (
        <Card key={e.id} style={s.history}>
          <View style={{ flex: 1 }}>
            <Text style={s.careTitle}>{KINDS.find((k) => k.kind === e.kind)?.title ?? e.kind}</Text>
            <Text style={s.meta}>{e.date}</Text>
          </View>
          <LinkText onPress={() => confirmAction("Remove this record?", () => deleteCare.mutate(e))}>Remove</LinkText>
        </Card>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  careTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  careTitle: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  meta: { fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: 6 },
  recordRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginTop: 12 },
  history: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8, padding: 14 },
});

/**
 * Method and sources: how both scores are built, with every citation.
 */

import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@/config/theme";
import { Badge, Card, LinkText, PageHeader, Screen, SectionTitle } from "@/components/ui";
import {
  AUTOPILOT_METHOD,
  FACTOR_EVIDENCE,
  FOOD_DISCLAIMER,
  FOOD_SCORE_METHOD,
  REFERENCES,
  referencesFor,
  SCORE_DISCLAIMER,
  STRENGTH_LABEL,
} from "@/shared/score/evidence";
import { ALGORITHM_VERSION, FACTOR_WEIGHTS } from "@/shared/score/longevity";
import type { FactorKey } from "@/shared/types";

const c = theme.colors;

export default function Science() {
  const router = useRouter();
  return (
    <Screen>
      <LinkText onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={{ marginBottom: 16 }}>
        ← Back
      </LinkText>
      <PageHeader
        title="Method and sources"
        subtitle="How the Longevity Score and the Food Score are calculated, the research each part rests on, and what neither can tell you."
      />

      <Card>
        <Text style={s.h}>What the Longevity Score is</Text>
        <Text style={s.p}>{SCORE_DISCLAIMER}</Text>
        <Text style={s.p}>
          It is a weighted sum of six factors, each scored 0 to 100, scaled to 0–999. Factors with no data are held at a
          neutral 50 and labelled, so the Score never rewards or punishes a blank. The weights are ANIMA's judgement of how
          strong and how actionable the evidence is; they are not fitted to outcome data yet. Engine version {ALGORITHM_VERSION}.
        </Text>
      </Card>

      <SectionTitle>The six factors</SectionTitle>
      {(Object.keys(FACTOR_WEIGHTS) as FactorKey[]).map((key) => {
        const e = FACTOR_EVIDENCE[key];
        return (
          <Card key={key} style={{ marginBottom: 12 }}>
            <View style={s.top}>
              <Text style={s.h}>
                {e.title} · {Math.round(FACTOR_WEIGHTS[key] * 100)}%
              </Text>
              <Badge
                text={STRENGTH_LABEL[e.strength]}
                color={e.strength === "strong" ? c.success : e.strength === "moderate" ? c.info : c.warning}
              />
            </View>
            <Text style={s.p}>{e.measures}</Text>
            <Text style={s.label}>Calculation</Text>
            <Text style={s.p}>{e.method}</Text>
            <Text style={s.label}>Why it counts</Text>
            <Text style={s.p}>{e.why}</Text>
            <Text style={s.label}>Limits</Text>
            <Text style={s.p}>{e.limits}</Text>
            <Text style={s.label}>Sources</Text>
            {referencesFor(e.references).map((r) => (
              <View key={r.id} style={s.ref}>
                <Text style={s.p}>{r.finding}</Text>
                <LinkText href={r.url} style={s.cite}>
                  {r.citation}
                </LinkText>
              </View>
            ))}
          </Card>
        );
      })}

      <SectionTitle>The Food Score</SectionTitle>
      <Card style={{ marginBottom: 12 }}>
        <Text style={s.p}>
          Every food is graded from data printed on its label or published by its maker. Grades: A 85 and above, B 70–84, C
          55–69, D 40–54, E below 40. No brand can pay to change a grade. Each product page links to the page its label
          data was read from and the date; where a maker does not publish a value, the page says what was assumed. A
          grade reflects the label as read on that date, and a low confidence figure means much of it rests on unknowns.
        </Text>
        <Text style={s.p}>{FOOD_DISCLAIMER}</Text>
      </Card>
      {FOOD_SCORE_METHOD.map((m) => (
        <Card key={m.title} style={{ marginBottom: 12 }}>
          <Text style={s.h}>{m.title}</Text>
          <Text style={s.p}>{m.body}</Text>
          {referencesFor(m.references).map((r) => (
            <LinkText key={r.id} href={r.url} style={s.cite}>
              {r.citation}
            </LinkText>
          ))}
        </Card>
      ))}

      <SectionTitle>Portion Autopilot</SectionTitle>
      {AUTOPILOT_METHOD.map((m) => (
        <Card key={m.title} style={{ marginBottom: 12 }}>
          <Text style={s.h}>{m.title}</Text>
          <Text style={s.p}>{m.body}</Text>
          {referencesFor(m.references).map((r) => (
            <LinkText key={r.id} href={r.url} style={s.cite}>
              {r.citation}
            </LinkText>
          ))}
        </Card>
      ))}

      <SectionTitle>What is not scored, and why</SectionTitle>
      <Card>
        <Text style={s.p}>
          Fresh versus dry, raw feeding and grain-free are not scored as better or worse in themselves: no study has shown
          that a food format changes lifespan. {REFERENCES.fdaDcm.finding}
        </Text>
        <LinkText href={REFERENCES.fdaDcm.url} style={s.cite}>{REFERENCES.fdaDcm.citation}</LinkText>
        <Text style={s.p}>Feeding frequency is not scored. {REFERENCES.bray2022.finding}</Text>
        <LinkText href={REFERENCES.bray2022.url} style={s.cite}>{REFERENCES.bray2022.citation}</LinkText>
        <Text style={s.p}>
          Neutering is not scored. {REFERENCES.hoffman2013.finding} The right choice and timing differ by breed and sex, so
          it is a decision for you and your vet.
        </Text>
        <LinkText href={REFERENCES.hoffman2013.url} style={s.cite}>{REFERENCES.hoffman2013.citation}</LinkText>
      </Card>

      <SectionTitle>All references</SectionTitle>
      <Card>
        {Object.values(REFERENCES).map((r) => (
          <View key={r.id} style={s.ref}>
            <LinkText href={r.url} style={s.cite}>
              {r.citation}
            </LinkText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },
  h: { fontSize: 17, fontWeight: "700", color: c.textPrimary },
  p: { fontSize: 15, lineHeight: 23, color: c.textPrimary, marginTop: 8 },
  label: { fontSize: 12, fontWeight: "700", color: c.textTertiary, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 16 },
  ref: { marginBottom: 8 },
  cite: { fontSize: 13, lineHeight: 19, fontWeight: "400", marginTop: 4 },
});

/**
 * Public share page. The card is read from the link itself; nothing is fetched.
 */

import { StyleSheet, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { theme } from "@/config/theme";
import { Button, Card, EmptyState, LinkText, Screen } from "@/components/ui";
import { ShareCardView } from "@/components/ShareCard";
import { decodeShareCard } from "@/shared/share/card";

const c = theme.colors;

export default function SharePage() {
  const router = useRouter();
  const { d } = useLocalSearchParams<{ d?: string }>();
  const card = decodeShareCard(typeof d === "string" ? d : null);

  if (!card) {
    return (
      <Screen width={560}>
        <EmptyState
          title="This share link is not valid"
          body="It may have been cut short when it was copied."
          action="Get your own pet's Score"
          onAction={() => router.replace("/onboarding")}
        />
      </Screen>
    );
  }

  return (
    <Screen width={560}>
      <Text style={s.logo}>ANIMA</Text>
      <ShareCardView card={card} />
      <Text style={s.note}>
        Shared by {card.name}'s owner. The Longevity Score is a wellness index built on published veterinary research, not a
        prediction of lifespan. <LinkText onPress={() => router.push("/science")}>How it works</LinkText>
      </Text>
      <Card style={{ marginTop: 24, alignItems: "center", padding: 28 }}>
        <Text style={s.cta}>What would your {card.species === "DOG" ? "dog" : "cat"} score?</Text>
        <Text style={s.ctaSub}>Free, two minutes, no account needed.</Text>
        <Button title="Get your pet's Score" variant="accent" onPress={() => router.push("/onboarding")} style={{ marginTop: 16 }} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  logo: { fontSize: 18, fontWeight: "800", letterSpacing: 4, color: c.textPrimary, marginBottom: 24 },
  note: { fontSize: 13, lineHeight: 20, color: c.textSecondary, marginTop: 14 },
  cta: { fontSize: 22, fontWeight: "800", color: c.textPrimary, textAlign: "center" },
  ctaSub: { fontSize: 14, color: c.textSecondary, marginTop: 6 },
});

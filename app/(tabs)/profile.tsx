/**
 * Profile: account, pets, and where the data lives.
 */

import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "@/config/supabase";
import { theme } from "@/config/theme";
import { Badge, Button, Card, LinkText, PageHeader, Screen, SectionTitle, confirmAction } from "@/components/ui";
import { useActivePet, useDeletePet } from "@/hooks/useData";
import { useAuthStore, usePetStore } from "@/stores";

const c = theme.colors;

export default function Profile() {
  const router = useRouter();
  const qc = useQueryClient();
  const { status, email } = useAuthStore();
  const { pet: active, pets } = useActivePet();
  const setActivePetId = usePetStore((st) => st.setActivePetId);
  const deletePet = useDeletePet();
  const signedIn = status === "account";

  const signOut = async () => {
    await supabase?.auth.signOut();
    setActivePetId(null);
    qc.clear();
    router.replace("/");
  };

  return (
    <Screen>
      <PageHeader title="Profile" />

      <Card>
        {signedIn ? (
          <>
            <Text style={s.title}>{email}</Text>
            <Text style={s.meta}>Your pets and their history are saved to your account.</Text>
            <Button small title="Sign out" variant="secondary" onPress={signOut} style={s.btn} />
          </>
        ) : (
          <>
            <Text style={s.title}>Guest</Text>
            <Text style={s.meta}>
              Everything is saved in this browser only.
              {isSupabaseConfigured ? " Create a free account to keep it and use it on other devices." : ""}
            </Text>
            {isSupabaseConfigured ? <Button small title="Create account or sign in" variant="accent" onPress={() => router.push("/(auth)/login")} style={s.btn} /> : null}
          </>
        )}
      </Card>

      <SectionTitle action="Add a pet" onAction={() => router.push("/onboarding")}>
        Your pets
      </SectionTitle>
      {pets.map((p) => (
        <Card key={p.id} style={s.pet}>
          <Text style={s.emoji}>{p.species === "DOG" ? "🐕" : "🐈"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{p.name}</Text>
            <Text style={s.meta}>{p.breed}</Text>
          </View>
          {active?.id === p.id ? <Badge text="Viewing" color={c.success} /> : <Button small title="View" variant="secondary" onPress={() => setActivePetId(p.id)} />}
          <LinkText
            onPress={() =>
              confirmAction(`Delete ${p.name} and all of their records? This cannot be undone.`, () => deletePet.mutate(p.id))
            }
          >
            Delete
          </LinkText>
        </Card>
      ))}

      <SectionTitle>About</SectionTitle>
      <Card>
        <Text style={s.meta}>
          The Longevity Score and Food Score are built on published veterinary research. Every factor shows its sources and
          its limits.
        </Text>
        <Button small title="Method and sources" variant="secondary" onPress={() => router.push("/science")} style={s.btn} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "700", color: c.textPrimary },
  meta: { fontSize: 14, lineHeight: 21, color: c.textSecondary, marginTop: 4 },
  btn: { marginTop: 14, alignSelf: "flex-start" },
  pet: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10, padding: 14 },
  emoji: { fontSize: 28 },
});

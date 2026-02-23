/**
 * ANIMA Profile Tab
 * User settings, pet management, subscription
 */

import {Alert, Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {useRouter} from "expo-router";
import {theme} from "../config/theme";
import {useAuthStore, usePetStore} from "../stores";
import {usePets} from "../hooks/useApi";
import {supabase} from "../config/api";

export default function ProfileScreen() {
  const router = useRouter();
  const { email, name, tier, clearUser } = useAuthStore();
  const { activePet, setActivePet } = usePetStore();
  const { data: pets } = usePets();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          clearUser();
        },
      },
    ]);
  };

  const tierLabels: Record<string, string> = {
    FREE: "Free",
    PREMIUM: "Premium · $9.99/mo",
    PRO: "Pro + BioCard · $29.99/mo",
    VET: "Veterinary Practice",
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Profile</Text>

      {/* User info */}
      <View style={s.card}>
        <Text style={s.userName}>{name || email || "ANIMA User"}</Text>
        <Text style={s.userEmail}>{email}</Text>
        <View style={s.tierBadge}>
          <Text style={s.tierText}>{tierLabels[tier] || tier}</Text>
        </View>
      </View>

      {/* Pet switcher */}
      <Text style={s.sectionTitle}>Your Pets</Text>
      {pets?.map((pet: any) => (
        <Pressable
          key={pet.id}
          style={[s.petCard, activePet?.id === pet.id && s.petCardActive]}
          onPress={() => setActivePet(pet, pet.currentScore)}
        >
          <View style={s.petAvatar}>
            <Text style={{ fontSize: 28 }}>{pet.species === "DOG" ? "🐕" : "🐈"}</Text>
          </View>
          <View style={s.petInfo}>
            <Text style={s.petName}>{pet.name}</Text>
            <Text style={s.petBreed}>{pet.breed} · {pet.species === "DOG" ? "Dog" : "Cat"}</Text>
          </View>
          {pet.currentScore && (
            <Text style={s.petScore}>{pet.currentScore.score}</Text>
          )}
          {activePet?.id === pet.id && <View style={s.activeDot} />}
        </Pressable>
      ))}

      <Pressable style={s.addPetBtn} onPress={() => router.push("/onboarding")}>
        <Text style={s.addPetText}>+ Add Another Pet</Text>
      </Pressable>

      {/* Settings */}
      <Text style={s.sectionTitle}>Settings</Text>
      {[
        { label: "Notifications", icon: "🔔" },
        { label: "Units (kg/lb)", icon: "📐" },
        { label: "Connected Wearables", icon: "⌚" },
        { label: "Export Health Data", icon: "📤" },
        { label: "Privacy & Data", icon: "🔒" },
        { label: "Help & Support", icon: "❓" },
      ].map((item, i) => (
        <Pressable key={i} style={s.settingsItem}>
          <Text style={s.settingsIcon}>{item.icon}</Text>
          <Text style={s.settingsLabel}>{item.label}</Text>
          <Text style={s.settingsChevron}>›</Text>
        </Pressable>
      ))}

      {/* Upgrade CTA (for non-Pro users) */}
      {tier === "FREE" && (
        <Pressable style={s.upgradeCard}>
          <Text style={s.upgradeTitle}>Unlock Full Potential</Text>
          <Text style={s.upgradeSub}>Premium: unlimited plans, no ads, export · $9.99/mo</Text>
          <Text style={s.upgradeSub}>Pro: + BioCard scans, Digital Twin, predictive alerts · $29.99/mo</Text>
        </Pressable>
      )}

      <Pressable style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Sign Out</Text>
      </Pressable>

      <Text style={s.version}>ANIMA v1.0.0 · Built with 🧬</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: "700", color: theme.colors.textPrimary, marginBottom: 16 },

  card: { backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.surfaceBorder, padding: 20, marginBottom: 24 },
  userName: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary },
  userEmail: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  tierBadge: { marginTop: 10, backgroundColor: `${theme.colors.accent}20`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, alignSelf: "flex-start" },
  tierText: { fontSize: 11, fontWeight: "600", color: theme.colors.accent },

  sectionTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 10, marginTop: 8 },

  petCard: { flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.surfaceBorder, padding: 14, marginBottom: 6 },
  petCardActive: { borderColor: `${theme.colors.success}44` },
  petAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  petInfo: { flex: 1 },
  petName: { fontSize: 15, fontWeight: "600", color: theme.colors.textPrimary },
  petBreed: { fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 },
  petScore: { fontSize: 20, fontWeight: "700", color: theme.colors.success, marginRight: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success },

  addPetBtn: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.surfaceBorderHover, alignItems: "center", marginBottom: 24, borderStyle: "dashed" },
  addPetText: { fontSize: 13, fontWeight: "600", color: theme.colors.textSecondary },

  settingsItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceBorder },
  settingsIcon: { fontSize: 18, width: 32 },
  settingsLabel: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },
  settingsChevron: { fontSize: 18, color: theme.colors.textTertiary },

  upgradeCard: { marginTop: 24, backgroundColor: `${theme.colors.accent}10`, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: `${theme.colors.accent}33` },
  upgradeTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.accent, marginBottom: 6 },
  upgradeSub: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18, marginBottom: 2 },

  logoutBtn: { marginTop: 32, paddingVertical: 14, borderRadius: 12, backgroundColor: `${theme.colors.danger}10`, alignItems: "center" },
  logoutText: { fontSize: 14, fontWeight: "600", color: theme.colors.danger },

  version: { textAlign: "center", fontSize: 11, color: theme.colors.textTertiary, marginTop: 24 },
});

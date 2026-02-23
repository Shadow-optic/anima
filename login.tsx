/**
 * ANIMA Auth Screens
 * Login / Signup with Supabase Auth
 */

import {useState} from "react";
import {Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View} from "react-native";
import {Stack, useRouter} from "expo-router";
import {supabase} from "../config/api";
import {theme} from "../config/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter email and password.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        Alert.alert("Check Your Email", "We sent a confirmation link. Verify to continue.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Auth state listener in _layout.tsx handles navigation
      }
    } catch (error: any) {
      Alert.alert("Auth Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={s.inner}>
          {/* Logo area */}
          <View style={s.logoArea}>
            <Text style={s.logoMark}>🧬</Text>
            <Text style={s.logoText}>ANIMA</Text>
            <Text style={s.tagline}>Pet Longevity Intelligence</Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            {isSignUp && (
              <TextInput
                style={s.input}
                placeholder="Your name"
                placeholderTextColor={theme.colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={theme.colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor={theme.colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={isSignUp ? "newPassword" : "password"}
            />

            <Pressable
              style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={s.primaryBtnText}>
                {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
              </Text>
            </Pressable>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or continue with</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Social auth */}
            <View style={s.socialRow}>
              {Platform.OS === "ios" && (
                <Pressable style={s.socialBtn} onPress={() => handleSocialAuth("apple")}>
                  <Text style={s.socialBtnText}>Apple</Text>
                </Pressable>
              )}
              <Pressable style={s.socialBtn} onPress={() => handleSocialAuth("google")}>
                <Text style={s.socialBtnText}>Google</Text>
              </Pressable>
            </View>

            {/* Toggle */}
            <Pressable style={s.toggleBtn} onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={s.toggleText}>
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <Text style={s.toggleLink}>{isSignUp ? "Sign In" : "Sign Up"}</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },

  logoArea: { alignItems: "center", marginBottom: 48 },
  logoMark: { fontSize: 48, marginBottom: 8 },
  logoText: { fontSize: 32, fontWeight: "700", color: theme.colors.textPrimary, letterSpacing: 4 },
  tagline: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 4, letterSpacing: 0.5 },

  form: { gap: 12 },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.surfaceBorder,
    borderRadius: 12, padding: 16,
    fontSize: 15, color: theme.colors.textPrimary,
  },

  primaryBtn: { backgroundColor: theme.colors.textPrimary, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: theme.colors.background },

  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.surfaceBorder },
  dividerText: { fontSize: 12, color: theme.colors.textTertiary },

  socialRow: { flexDirection: "row", gap: 10 },
  socialBtn: { flex: 1, borderWidth: 1, borderColor: theme.colors.surfaceBorder, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  socialBtnText: { fontSize: 14, fontWeight: "500", color: theme.colors.textSecondary },

  toggleBtn: { alignItems: "center", marginTop: 8 },
  toggleText: { fontSize: 13, color: theme.colors.textTertiary },
  toggleLink: { color: theme.colors.textPrimary, fontWeight: "600" },
});

/**
 * Sign in / create account (Supabase email + password).
 */

import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { isSupabaseConfigured, supabase } from "@/config/supabase";
import { theme } from "@/config/theme";
import { Button, Card, Field, LinkText, Notice, Screen } from "@/components/ui";
import { useAuthStore } from "@/stores";

const c = theme.colors;

export default function LoginScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (status === "account") router.replace("/");
  }, [status]);

  if (!isSupabaseConfigured || !supabase) {
    return (
      <Screen width={440}>
        <Text style={s.logo}>ANIMA</Text>
        <Notice level="info">
          Accounts are not switched on for this site yet. Everything you do is saved in this browser, so you can carry on
          without one.
        </Notice>
        <Button title="Continue" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  const submit = async () => {
    setError(null);
    setInfo(null);
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Use a password of at least 8 characters.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase!.auth.signUp({
          email: address,
          password,
          options: { emailRedirectTo: Platform.OS === "web" ? window.location.origin : undefined },
        });
        if (error) throw error;
        if (!data.session) setInfo("Check your inbox and confirm your email to finish creating the account.");
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email: address, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError(null);
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError("Enter your email address first.");
    const { error } = await supabase!.auth.resetPasswordForEmail(address, {
      redirectTo: Platform.OS === "web" ? window.location.origin : undefined,
    });
    if (error) setError(error.message);
    else setInfo("If that address has an account, a reset link is on its way.");
  };

  return (
    <Screen width={440}>
      <Text style={s.logo}>ANIMA</Text>
      <Text accessibilityRole="header" style={s.title}>
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </Text>
      <Text style={s.sub}>
        {mode === "signup"
          ? "Save your pet's Score and history, and pick up on any device. Anything you have already entered comes with you."
          : "Sign in to see your pets and their history."}
      </Text>

      <Card style={{ marginTop: 20 }}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          hint={mode === "signup" ? "At least 8 characters." : undefined}
          onSubmitEditing={submit}
        />
        {error ? <Notice level="warning">{error}</Notice> : null}
        {info ? <Notice level="good">{info}</Notice> : null}
        <Button title={mode === "signup" ? "Create account" : "Sign in"} onPress={submit} loading={busy} variant="accent" />
        {mode === "signin" ? (
          <View style={{ alignItems: "center", marginTop: 14 }}>
            <LinkText onPress={reset}>Forgot password?</LinkText>
          </View>
        ) : null}
      </Card>

      <View style={s.switch}>
        <Text style={s.sub}>{mode === "signup" ? "Already have an account?" : "New here?"}</Text>
        <LinkText onPress={() => setMode(mode === "signup" ? "signin" : "signup")}>
          {mode === "signup" ? "Sign in" : "Create an account"}
        </LinkText>
      </View>
      <View style={{ alignItems: "center", marginTop: 16 }}>
        <LinkText onPress={() => router.replace("/")}>Continue without an account</LinkText>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  logo: { fontSize: 18, fontWeight: "800", letterSpacing: 4, color: c.textPrimary, marginBottom: 32, marginTop: 24 },
  title: { fontSize: 28, fontWeight: "800", color: c.textPrimary },
  sub: { fontSize: 15, lineHeight: 22, color: c.textSecondary, marginTop: 6 },
  switch: { flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "baseline", marginTop: 20 },
});

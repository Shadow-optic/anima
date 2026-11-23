/**
 * ANIMA UI primitives. Web-first: content sits in a centred column and every
 * control is a real button or input with a visible focus state.
 */

import { type ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { getBarColor, getGradeColor, getScoreColor, getScoreLabel, theme } from "@/config/theme";

const c = theme.colors;

// ── Layout ────────────────────────────────────

export function Screen({
  children,
  width = 760,
  scroll = true,
}: {
  children: ReactNode;
  width?: number;
  scroll?: boolean;
}) {
  const inner = <View style={[styles.column, { maxWidth: width }]}>{children}</View>;
  if (!scroll) return <View style={styles.screen}>{inner}</View>;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      {inner}
    </ScrollView>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={styles.pageTitle}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {children}
      </Text>
      {action && onAction ? <LinkText onPress={onAction}>{action}</LinkText> : null}
    </View>
  );
}

export function Card({ children, style, onPress, label }: { children: ReactNode; style?: ViewStyle; onPress?: () => void; label?: string }) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ hovered, focused }: any) => [styles.card, (hovered || focused) && styles.cardHover, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Text ──────────────────────────────────────

export function Body({ children, style, dim }: { children: ReactNode; style?: TextStyle; dim?: boolean }) {
  return <Text style={[styles.body, dim && { color: c.textTertiary }, style]}>{children}</Text>;
}

export function LinkText({ children, onPress, href, style }: { children: ReactNode; onPress?: () => void; href?: string; style?: TextStyle }) {
  return (
    <Text
      accessibilityRole="link"
      onPress={onPress ?? (href ? () => openUrl(href) : undefined)}
      style={[styles.link, style]}
    >
      {children}
    </Text>
  );
}

export function openUrl(url: string) {
  if (!/^https:\/\//.test(url)) return;
  if (Platform.OS === "web") window.open(url, "_blank", "noopener,noreferrer");
  else void Linking.openURL(url);
}

// ── Controls ──────────────────────────────────

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
}) {
  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.buttonPrimary, fg: c.buttonPrimaryText, border: c.buttonPrimary },
    accent: { bg: c.success, fg: "#04140E", border: c.success },
    secondary: { bg: c.buttonSecondary, fg: c.textPrimary, border: c.surfaceBorder },
    ghost: { bg: "transparent", fg: c.textSecondary, border: "transparent" },
    danger: { bg: c.buttonDanger, fg: c.buttonDangerText, border: `${c.danger}55` },
  };
  const p = palette[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ hovered, pressed, focused }: any) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: p.bg, borderColor: p.border },
        (hovered || focused) && !off && { opacity: 0.88 },
        pressed && { opacity: 0.75 },
        off && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={p.fg} /> : <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: p.fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, hint, error, ...input }: { label: string; hint?: string; error?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textTertiary}
        {...input}
        style={[styles.input, input.multiline && { minHeight: 96, textAlignVertical: "top" }, error ? { borderColor: c.danger } : null, input.style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
  wrap,
}: {
  label?: string;
  options: Array<{ value: T; label: string }>;
  value: T | null;
  onChange: (v: T) => void;
  wrap?: boolean;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View accessibilityRole="radiogroup" style={[styles.segRow, wrap && { flexWrap: "wrap" }]}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(o.value)}
              style={({ hovered, focused }: any) => [styles.seg, !wrap && { flex: 1 }, on && styles.segOn, (hovered || focused) && !on && styles.cardHover]}
            >
              <Text style={[styles.segText, on && { color: c.textPrimary }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Status ────────────────────────────────────

export function Badge({ text, color = c.textSecondary }: { text: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function GradeBadge({ grade, score, size = 44 }: { grade: string; score?: number; size?: number }) {
  const color = getGradeColor(grade);
  return (
    <View
      accessibilityLabel={`Food Score grade ${grade}${score != null ? `, ${score} out of 100` : ""}`}
      style={[styles.grade, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: `${color}22`, borderColor: color }]}
    >
      <Text style={{ color, fontWeight: "800", fontSize: size * 0.45, lineHeight: size * 0.5 }}>{grade}</Text>
      {score != null && size >= 44 ? <Text style={{ color, fontSize: size * 0.2, fontWeight: "600" }}>{score}</Text> : null}
    </View>
  );
}

const NOTICE: Record<string, string> = { good: c.success, info: c.info, caution: c.warning, warning: c.danger };
const NOTICE_MARK: Record<string, string> = { good: "✓", info: "i", caution: "!", warning: "✕" };

export function Notice({ level = "info", children }: { level?: "good" | "info" | "caution" | "warning"; children: ReactNode }) {
  const color = NOTICE[level];
  return (
    <View style={[styles.notice, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
      <Text style={[styles.noticeMark, { color }]}>{NOTICE_MARK[level]}</Text>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export function Bar({ value, color }: { value: number; color?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${v}%`, backgroundColor: color ?? getBarColor(v) }]} />
    </View>
  );
}

export function ScoreNumber({ score, size = 88 }: { score: number; size?: number }) {
  const [shown, setShown] = useState(score);
  useEffect(() => {
    const from = shown;
    if (from === score) return;
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min((Date.now() - start) / 700, 1);
      setShown(Math.round(from + (score - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);
  const color = getScoreColor(score);
  return (
    <View accessibilityLabel={`Longevity Score ${score} out of 999, ${getScoreLabel(score)}`} style={{ alignItems: "center" }}>
      <Text style={{ fontSize: size, lineHeight: size * 1.05, fontWeight: "800", color, fontVariant: ["tabular-nums"] }}>{shown}</Text>
      <Text style={{ fontSize: Math.max(14, size * 0.2), fontWeight: "700", color }}>{getScoreLabel(score)}</Text>
    </View>
  );
}

export function EmptyState({ title, body, action, onAction }: { title: string; body?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ marginTop: 16 }} /> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={c.textSecondary} />
    </View>
  );
}

/** Confirm a destructive action. Uses the browser dialog on web. */
export function confirmAction(message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(message)) onConfirm();
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Alert } = require("react-native");
  Alert.alert("Are you sure?", message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm },
  ]);
}

const focusRing = Platform.OS === "web" ? ({ outlineColor: c.info, outlineOffset: 2 } as any) : {};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  screenContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 64, alignItems: "center" },
  column: { width: "100%", alignSelf: "center" },

  pageHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 15, color: c.textSecondary, marginTop: 4, lineHeight: 22 },

  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: c.textPrimary },

  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder, borderRadius: 16, padding: 18, ...focusRing },
  cardHover: { borderColor: c.surfaceBorderHover, backgroundColor: c.surfaceHover },

  body: { fontSize: 15, lineHeight: 23, color: c.textSecondary },
  link: { fontSize: 14, fontWeight: "600", color: "#7FB0FF", textDecorationLine: "underline" },

  button: { minHeight: 48, paddingHorizontal: 22, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", ...focusRing },
  buttonSmall: { minHeight: 36, paddingHorizontal: 14, borderRadius: 10 },
  buttonText: { fontSize: 15, fontWeight: "700" },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: c.textSecondary, marginBottom: 6 },
  fieldHint: { fontSize: 12, color: c.textTertiary, marginTop: 6, lineHeight: 17 },
  fieldError: { fontSize: 12, color: c.danger, marginTop: 6 },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorderHover, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: c.textPrimary, ...focusRing },

  segRow: { flexDirection: "row", gap: 8 },
  seg: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: c.surfaceBorder, alignItems: "center", justifyContent: "center", ...focusRing },
  segOn: { borderColor: c.success, backgroundColor: `${c.success}1A` },
  segText: { fontSize: 14, fontWeight: "600", color: c.textSecondary },

  badge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  grade: { borderWidth: 1.5, alignItems: "center", justifyContent: "center" },

  notice: { flexDirection: "row", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  noticeMark: { fontSize: 14, fontWeight: "800", width: 14, textAlign: "center", lineHeight: 21 },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 21, color: c.textPrimary },

  barTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },

  empty: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: c.textPrimary, textAlign: "center" },
  emptyBody: { fontSize: 14, lineHeight: 21, color: c.textSecondary, textAlign: "center", marginTop: 6, maxWidth: 380 },
});

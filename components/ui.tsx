/**
 * ANIMA Reusable Components
 * Design system primitives used across all screens
 */

import {ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle} from "react-native";
import {getScoreColor, getScoreLabel, theme} from "@/config/theme";
import {useEffect, useState} from "react";

// ─────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────
export function Card({
  children, style, borderColor, onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  borderColor?: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      style={[cardStyles.base, borderColor ? { borderColor } : null, style]}
      onPress={onPress}
    >
      {children}
    </Wrapper>
  );
}

const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 16,
  },
});

// ─────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────
export function Badge({
  text, color, size = "sm",
}: {
  text: string;
  color: string;
  size?: "sm" | "md";
}) {
  return (
    <View style={[
      badgeStyles.base,
      { backgroundColor: `${color}20` },
      size === "md" && badgeStyles.md,
    ]}>
      <Text style={[
        badgeStyles.text,
        { color },
        size === "md" && badgeStyles.textMd,
      ]}>
        {text}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  base: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, alignSelf: "flex-start" },
  md: { paddingHorizontal: 12, paddingVertical: 5 },
  text: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  textMd: { fontSize: 12 },
});

// ─────────────────────────────────────────────
// ScoreDisplay — Animated big score number
// ─────────────────────────────────────────────
export function ScoreDisplay({
  score, size = "lg", showLabel = true,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  useEffect(() => {
    const duration = size === "lg" ? 1500 : 800;
    const start = Date.now();
    const startVal = display;
    const animate = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (score - startVal) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [score]);

  const sizes = {
    sm: { number: 28, label: 10 },
    md: { number: 48, label: 12 },
    lg: { number: 72, label: 14 },
  };

  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: sizes[size].number, fontWeight: "700", color, lineHeight: sizes[size].number * 1.1 }}>
        {display}
      </Text>
      {showLabel && (
        <Text style={{ fontSize: sizes[size].label, fontWeight: "600", color, marginTop: 2 }}>
          {label}
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// FactorBar — Score factor visualization
// ─────────────────────────────────────────────
export function FactorBar({
  label, score, color, maxScore = 100,
}: {
  label: string;
  score: number;
  color?: string;
  maxScore?: number;
}) {
  const barColor = color || (
    score >= 70 ? theme.colors.success :
    score >= 40 ? theme.colors.warning :
    theme.colors.danger
  );

  return (
    <View style={factorStyles.container}>
      <View style={factorStyles.header}>
        <Text style={factorStyles.label}>{label}</Text>
        <Text style={factorStyles.score}>{score}</Text>
      </View>
      <View style={factorStyles.track}>
        <View style={[factorStyles.fill, { width: `${(score / maxScore) * 100}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const factorStyles = StyleSheet.create({
  container: { paddingVertical: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 11, color: theme.colors.textTertiary },
  score: { fontSize: 11, fontWeight: "600", color: theme.colors.textSecondary },
  track: { height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 1.5 },
});

// ─────────────────────────────────────────────
// RiskLevel — Colored risk indicator
// ─────────────────────────────────────────────
export function RiskLevel({
  level, score, label,
}: {
  level: "low" | "moderate" | "elevated" | "high";
  score: number;
  label?: string;
}) {
  const colorMap = {
    low: theme.colors.success,
    moderate: theme.colors.warning,
    elevated: "#F97316",
    high: theme.colors.danger,
  };
  const color = colorMap[level];

  return (
    <View style={riskStyles.container}>
      {label && <Text style={riskStyles.label}>{label}</Text>}
      <View style={riskStyles.track}>
        <View style={[riskStyles.fill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <Badge text={level} color={color} />
    </View>
  );
}

const riskStyles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: theme.colors.textPrimary },
  track: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
});

// ─────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────
export function Button({
  title, onPress, variant = "primary", loading = false, disabled = false, style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const variants = {
    primary: { bg: theme.colors.buttonPrimary, text: theme.colors.buttonPrimaryText },
    secondary: { bg: theme.colors.buttonSecondary, text: theme.colors.buttonSecondaryText },
    danger: { bg: theme.colors.buttonDanger, text: theme.colors.buttonDangerText },
    ghost: { bg: "transparent", text: theme.colors.textSecondary },
  };
  const v = variants[variant];

  return (
    <Pressable
      style={[btnStyles.base, { backgroundColor: v.bg }, (disabled || loading) && btnStyles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <Text style={[btnStyles.text, { color: v.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const btnStyles = StyleSheet.create({
  base: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.4 },
  text: { fontSize: 15, fontWeight: "600" },
});

// ─────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────
export function SectionHeader({
  title, action, onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={shStyles.container}>
      <Text style={shStyles.title}>{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction}>
          <Text style={shStyles.action}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const shStyles = StyleSheet.create({
  container: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary },
  action: { fontSize: 13, fontWeight: "500", color: theme.colors.info },
});

// ─────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────
export function EmptyState({
  icon, title, subtitle, actionLabel, onAction,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{icon}</Text>
      <Text style={emptyStyles.title}>{title}</Text>
      {subtitle && <Text style={emptyStyles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: 16 }} />
      )}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 48 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: theme.colors.textTertiary, textAlign: "center", maxWidth: 280, lineHeight: 20 },
});

// ─────────────────────────────────────────────
// ListeningIndicator (voice monitor animation)
// ─────────────────────────────────────────────
export function ListeningIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <View style={listenStyles.container}>
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={i} style={[listenStyles.bar, { height: 8 + Math.random() * 20 }]} />
      ))}
    </View>
  );
}

const listenStyles = StyleSheet.create({
  container: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 3, paddingVertical: 24 },
  bar: { width: 3, backgroundColor: theme.colors.success, borderRadius: 2, opacity: 0.7 },
});

// ─────────────────────────────────────────────
// TimelineDot (for care timeline)
// ─────────────────────────────────────────────
export function TimelineDot({
  color, isLast = false,
}: {
  color: string;
  isLast?: boolean;
}) {
  return (
    <View style={dotStyles.container}>
      <View style={[dotStyles.dot, { backgroundColor: color }]} />
      {!isLast && <View style={dotStyles.line} />}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  container: { alignItems: "center", width: 20 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.08)", marginTop: 4 },
});

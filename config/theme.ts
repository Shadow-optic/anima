/**
 * ANIMA Design System
 * 
 * Every token is deliberate. The brand is clinical precision
 * meets warmth — veterinary science wrapped in love.
 * 
 * Philosophy: Dark by default (premium feel, reduces eye strain
 * during late-night pet worry sessions). Light mode available.
 */

export const theme = {
  colors: {
    // Core palette
    background: "#0A0A0F",
    surface: "rgba(255,255,255,0.03)",
    surfaceHover: "rgba(255,255,255,0.06)",
    surfaceBorder: "rgba(255,255,255,0.06)",
    surfaceBorderHover: "rgba(255,255,255,0.12)",

    // Text hierarchy
    textPrimary: "#E8E6E3",
    textSecondary: "#888888",
    textTertiary: "#555555",
    textInverse: "#0A0A0F",

    // Score colors (the emotional spectrum of pet health)
    scoreExceptional: "#10B981",
    scoreExcellent: "#34D399",
    scoreGood: "#60A5FA",
    scoreFair: "#FBBF24",
    scoreAtRisk: "#F97316",
    scoreCritical: "#EF4444",

    // Semantic
    success: "#10B981",
    warning: "#FBBF24",
    danger: "#EF4444",
    info: "#3B82F6",
    accent: "#8B5CF6",       // Purple — premium/genetic features
    biocard: "#06B6D4",      // Cyan — BioCard features

    // Feature-specific
    photoVitals: "#EC4899",   // Pink
    environment: "#22C55E",   // Green
    behavioral: "#F59E0B",    // Amber
    voice: "#8B5CF6",         // Purple
    nutrition: "#10B981",     // Emerald
    care: "#3B82F6",          // Blue

    // Interaction
    buttonPrimary: "#E8E6E3",
    buttonPrimaryText: "#0A0A0F",
    buttonSecondary: "rgba(255,255,255,0.08)",
    buttonSecondaryText: "#E8E6E3",
    buttonDanger: "#EF444420",
    buttonDangerText: "#EF4444",

    // Overlay
    overlay: "rgba(0,0,0,0.6)",
    bottomSheet: "#141419",
  },

  // Typography
  fonts: {
    body: "DM Sans",
    mono: "JetBrains Mono",
    display: "DM Sans",
  },

  fontSizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 20,
    xl: 24,
    "2xl": 32,
    "3xl": 48,
    "4xl": 64,
    score: 72,       // The Big Number
  },

  fontWeights: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  // Spacing (4px base grid)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    "2xl": 32,
    "3xl": 48,
    "4xl": 64,
  },

  // Border radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  // Shadows (subtle, used sparingly)
  shadows: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    glow: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    }),
  },
} as const;

// Score color lookup
export function getScoreColor(score: number): string {
  if (score >= 900) return theme.colors.scoreExceptional;
  if (score >= 750) return theme.colors.scoreExcellent;
  if (score >= 600) return theme.colors.scoreGood;
  if (score >= 400) return theme.colors.scoreFair;
  if (score >= 200) return theme.colors.scoreAtRisk;
  return theme.colors.scoreCritical;
}

export function getScoreLabel(score: number): string {
  if (score >= 900) return "Exceptional";
  if (score >= 750) return "Excellent";
  if (score >= 600) return "Good";
  if (score >= 400) return "Fair";
  if (score >= 200) return "At Risk";
  return "Critical";
}

export type Theme = typeof theme;

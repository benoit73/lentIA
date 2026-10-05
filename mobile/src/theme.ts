import type { TextStyle, ViewStyle } from "react-native";

// Palette du dashboard web (web/tailwind.config.js, clé `theme`), plus les
// teintes Tailwind utilisées pour les états (emerald, amber, red, slate...).
export const colors = {
  bg: "#B8BFD6",
  card: "#ECEEF5",
  cardLight: "#F5F6FA",
  accent: "#8E94F2",
  accentSoft: "rgba(142, 148, 242, 0.12)",
  greenSoft: "#4EBA88",
  textPrimary: "#1E202B",
  textSecondary: "#6F7285",
  textMuted: "#9B9EB2",
  white: "#FFFFFF",
  whiteGlass: "rgba(255, 255, 255, 0.6)",
  whitePill: "rgba(255, 255, 255, 0.88)",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  emerald100: "#D1FAE5",
  emerald500: "#10B981",
  emerald600: "#059669",
  emerald700: "#047857",
  amber50: "#FFFBEB",
  amber100: "#FEF3C7",
  amber300: "#FCD34D",
  amber500: "#F59E0B",
  amber600: "#D97706",
  amber700: "#B45309",
  red100: "#FEE2E2",
  red500: "#EF4444",
  red600: "#DC2626",
  red700: "#B91C1C",
  blue100: "#DBEAFE",
  blue600: "#2563EB",
} as const;

// Plus Jakarta Sans, chargée dans app/_layout.tsx : en React Native une
// graisse = une police, d'où un nom par graisse.
export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

export type FontWeight = keyof typeof fonts;

export const radius = {
  xl: 12,
  "2xl": 16,
  "3xl": 30,
  full: 999,
} as const;

// Équivalent de l'ombre `shadow-soft-card` du web.
export const softCardShadow: ViewStyle = {
  shadowColor: "#4E5673",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 4,
};

export const tabularNums: TextStyle = { fontVariant: ["tabular-nums"] };

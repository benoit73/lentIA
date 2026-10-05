/** Briques d'interface partagées : texte (police par graisse), carte, pilule
 * et groupe de boutons segmentés — l'équivalent des classes Tailwind
 * récurrentes du dashboard web (`bg-theme-card rounded-3xl`, `glass-pill`...). */

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { colors, fonts, radius, softCardShadow, type FontWeight } from "../theme";

interface TProps extends TextProps {
  weight?: FontWeight;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function T({ weight = "regular", size = 14, color = colors.textPrimary, style, ...rest }: TProps) {
  return <Text {...rest} style={[{ fontFamily: fonts[weight], fontSize: size, color }, style]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Titre de section en capitales (« Vue d'ensemble », « Historique »...). */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <T weight="bold" size={13} color={colors.textSecondary} style={styles.sectionTitle}>
      {children}
    </T>
  );
}

export function Pill({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "muted" }) {
  return (
    <View style={[styles.pill, { backgroundColor: tone === "accent" ? colors.accentSoft : "rgba(255,255,255,0.7)" }]}>
      <T weight="bold" size={12} color={tone === "accent" ? colors.accent : colors.textSecondary} numberOfLines={1}>
        {children}
      </T>
    </View>
  );
}

export interface SegmentOption<K extends string> {
  key: K;
  label: string;
}

/** Groupe de boutons dans une pilule blanche (préréglages de plage, filtres...). */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  small,
}: {
  options: SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
  small?: boolean;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.segment, small && styles.segmentSmall, active && styles.segmentActive]}
          >
            <T weight="bold" size={12} color={active ? colors.textPrimary : colors.textSecondary}>
              {option.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LinkText({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <T weight="bold" size={12} color={colors.accent}>
        {children}
      </T>
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.primary, disabled && { opacity: 0.5 }]}>
      <T weight="bold" size={12} color={colors.white}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius["3xl"],
    padding: 20,
    ...softCardShadow,
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pill: {
    flexShrink: 0,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  segmented: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignSelf: "flex-start",
    gap: 4,
    padding: 4,
    borderRadius: 22,
    backgroundColor: colors.whitePill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  segmentSmall: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  segmentActive: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  primary: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
  },
});

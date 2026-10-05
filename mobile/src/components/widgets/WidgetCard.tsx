import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, softCardShadow } from "../../theme";
import { T } from "../ui";

export { Pill as WidgetPill } from "../ui";

interface Props {
  title: string;
  subtitle?: string;
  /** Badge aligné à droite du titre (ex. « 4,1 L restants »). */
  pill?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Décale l'apparition du widget pour que la liste se remplisse en cascade. */
  delayMs?: number;
}

export function WidgetCard({ title, subtitle, pill, children, style, delayMs = 0 }: Props) {
  // Équivalent de l'animation CSS `widget-in` du web : fondu + légère montée.
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 460,
      delay: delayMs,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [progress, delayMs]);

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T weight="bold" size={18}>
            {title}
          </T>
          {subtitle && (
            <T size={12} color={colors.textSecondary} style={{ marginTop: 2 }}>
              {subtitle}
            </T>
          )}
        </View>
        {pill}
      </View>
      {children}
    </Animated.View>
  );
}

/** Halo qui « respire » sous un actionneur actif (animation `soft-pulse` du web). */
export function SoftPulse({ style, children }: { style: StyleProp<ViewStyle>; children?: ReactNode }) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.85] }),
          transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius["3xl"],
    padding: 20,
    ...softCardShadow,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
});

import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../theme";

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function ToggleSwitch({ checked, onChange, disabled, label }: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      hitSlop={8}
      style={[
        styles.track,
        { backgroundColor: checked ? colors.greenSoft : colors.slate300, justifyContent: checked ? "flex-end" : "flex-start" },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.knob} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 24,
    borderRadius: 12,
    padding: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  knob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

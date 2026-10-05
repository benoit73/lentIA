import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors, fonts } from "../../theme";
import { pickTime } from "../pickers";
import { T } from "../ui";

/** Champ numérique avec libellé (équivalent des <input type="number"> du web). */
export function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <T weight="semibold" size={12} color={colors.textSecondary}>
        {label}
      </T>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        style={styles.input}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

/** Heure "HH:MM" éditée via le sélecteur d'heure natif. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <T weight="semibold" size={12} color={colors.textSecondary}>
        {label}
      </T>
      <Pressable
        onPress={async () => {
          const picked = await pickTime(value);
          if (picked) onChange(picked);
        }}
        style={[styles.input, { minWidth: 76 }]}
      >
        <T size={14}>{value}</T>
      </Pressable>
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return (
    <T weight="semibold" size={12} color={colors.textSecondary}>
      {children}
    </T>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
});

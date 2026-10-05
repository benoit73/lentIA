import { StyleSheet, View } from "react-native";
import { colors } from "../theme";
import { CameraIcon } from "./widgets/icons";
import { Card, T } from "./ui";

export function CameraPanel() {
  return (
    <Card>
      <T weight="bold" size={18}>
        Caméra
      </T>
      <T size={12} color={colors.textSecondary} style={{ marginTop: 2 }}>
        Retour caméra du bac — pas encore de caméra branchée.
      </T>
      <View style={styles.placeholder}>
        <CameraIcon color={colors.textMuted} />
        <T weight="semibold" size={12} color={colors.textMuted}>
          Aucune photo pour l'instant
        </T>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    marginTop: 16,
    minHeight: 220,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.slate300,
    backgroundColor: colors.whiteGlass,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

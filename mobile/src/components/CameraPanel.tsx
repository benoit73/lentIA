import { View } from "react-native";
import { router } from "expo-router";
import { useCameraStream } from "../hooks/useCameraStream";
import { colors } from "../theme";
import { CameraView } from "./CameraView";
import { Card, LinkText, T } from "./ui";

export function CameraPanel() {
  const stream = useCameraStream();

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <T weight="bold" size={18}>
          Caméra
        </T>
        <LinkText onPress={() => router.navigate("/camera")}>Plein écran →</LinkText>
      </View>
      <T size={12} color={colors.textSecondary} style={{ marginTop: 2 }}>
        Retour caméra du bac, en direct.
      </T>
      <CameraView stream={stream} style={{ marginTop: 16 }} />
    </Card>
  );
}

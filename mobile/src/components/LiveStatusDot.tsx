import { View } from "react-native";
import { colors } from "../theme";
import { T } from "./ui";

export function LiveStatusDot({ online }: { online: boolean }) {
  const color = online ? colors.emerald600 : colors.red500;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: online ? colors.emerald500 : colors.red500 }} />
      <T weight="bold" size={10} color={color} style={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
        {online ? "En ligne" : "Hors ligne"}
      </T>
    </View>
  );
}

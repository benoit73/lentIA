import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { formatTime } from "../format";
import type { CameraStream } from "../hooks/useCameraStream";
import { colors } from "../theme";
import { T } from "./ui";
import { CameraIcon } from "./widgets/icons";

/** Image temps réel de la caméra, avec badge en ligne/hors ligne. Placeholder
 * tant qu'aucune image n'a été reçue. */
export function CameraView({ stream, style }: { stream: CameraStream; style?: StyleProp<ViewStyle> }) {
  const { frame, online, fps } = stream;

  if (!frame) {
    return (
      <View style={[styles.box, styles.placeholder, style]}>
        <CameraIcon color={colors.textMuted} />
        <T weight="semibold" size={12} color={colors.textMuted}>
          En attente d'une image du Pico…
        </T>
      </View>
    );
  }

  return (
    <View style={[styles.box, styles.live, style]}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${frame.jpeg}` }}
        style={[StyleSheet.absoluteFill, { opacity: online ? 1 : 0.5 }]}
        resizeMode="contain"
        // Android fait un fondu de 300 ms à chaque changement de source :
        // à 4 images/s le flux clignoterait.
        fadeDuration={0}
        accessibilityLabel="Caméra du bac de lentilles"
      />
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: online ? colors.red600 : "rgba(255,255,255,0.9)" }]}>
          <View style={[styles.dot, { backgroundColor: online ? colors.white : colors.textMuted }]} />
          <T weight="bold" size={10} color={online ? colors.white : colors.textSecondary} style={styles.upper}>
            {online ? "En direct" : "Hors ligne"}
          </T>
        </View>
        {online && (
          <View style={[styles.badge, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
            <T weight="bold" size={10} color={colors.white}>
              {fps.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} img/s
            </T>
          </View>
        )}
      </View>
      {!online && (
        <View style={[styles.badge, styles.lastSeen]}>
          <T weight="semibold" size={10} color={colors.textSecondary}>
            Dernière image à {formatTime(frame.received_at)}
          </T>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: "100%", aspectRatio: 4 / 3, borderRadius: 16, overflow: "hidden" },
  placeholder: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.slate300,
    backgroundColor: colors.whiteGlass,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  live: { backgroundColor: "#0F172A" },
  badges: { position: "absolute", top: 12, left: 12, flexDirection: "row", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  upper: { textTransform: "uppercase", letterSpacing: 0.5 },
  lastSeen: { position: "absolute", bottom: 12, left: 12, backgroundColor: "rgba(255,255,255,0.9)" },
});

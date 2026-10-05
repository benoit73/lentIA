import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { colors, softCardShadow } from "../theme";
import { SurvivalChanceBadge } from "./SurvivalChanceBadge";
import { T } from "./ui";

export function TopBar() {
  const { user, signOut } = useAuth();

  // Pas de place pour nom + email sur un téléphone : ils s'affichent en
  // touchant l'avatar, avec la déconnexion.
  function openAccount() {
    if (!user) return;
    Alert.alert(user.name, user.email, [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        <View style={styles.logo}>
          <T weight="bold" size={15} color={colors.white}>
            L
          </T>
        </View>
        <T weight="bold" size={14}>
          LentIA
        </T>
      </View>

      <SurvivalChanceBadge />

      <View style={[styles.side, { justifyContent: "flex-end" }]}>
        {user && (
          <Pressable onPress={openAccount} hitSlop={8} accessibilityLabel="Compte et déconnexion">
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <T weight="bold" size={13} color={colors.white}>
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </T>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...softCardShadow,
  },
  side: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
});

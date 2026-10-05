import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { Card, T } from "../components/ui";
import { colors } from "../theme";
import { useAuth } from "./AuthContext";

export function SignInScreen() {
  const { signIn } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    setPending(true);
    setError(null);
    try {
      await signIn();
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (isErrorWithCode(err) && err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Services Google Play indisponibles sur cet appareil.");
      } else {
        setError("Connexion Google impossible.");
      }
      console.error("Connexion Google", err);
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Card style={styles.card}>
        <View style={styles.logo}>
          <T weight="bold" size={20} color={colors.white}>
            L
          </T>
        </View>
        <T weight="bold" size={18} style={styles.center}>
          LentIA — Dashboard
        </T>
        <T size={13} color={colors.textSecondary} style={[styles.center, { marginTop: 4 }]}>
          Connecte-toi avec ton compte Google pour accéder aux capteurs.
        </T>
        <Pressable onPress={onPress} disabled={pending} style={[styles.button, pending && { opacity: 0.6 }]}>
          {pending ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <T weight="semibold" size={14} color="#3C4043">
              Se connecter avec Google
            </T>
          )}
        </Pressable>
        {error && (
          <T size={12} color={colors.red600} style={[styles.center, { marginTop: 10 }]}>
            {error}
          </T>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    padding: 32,
    alignItems: "center",
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  center: { textAlign: "center" },
  button: {
    marginTop: 24,
    minWidth: 220,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DADCE0",
    backgroundColor: colors.white,
  },
});

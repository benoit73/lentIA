import { useEffect } from "react";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { colors } from "../theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootStack fontsLoaded={fontsLoaded} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootStack({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { token, ready } = useAuth();
  const loaded = fontsLoaded && ready;

  // Splash gardé jusqu'aux polices ET à la restauration de session : sinon
  // l'écran de connexion clignoterait avant de laisser place au dashboard.
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {/* Équivalent de RequireAuth du web : sans token, seules les routes
            du second groupe existent, et inversement. */}
        <Stack.Protected guard={!!token}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sensors/[sensor]" />
        </Stack.Protected>
        <Stack.Protected guard={!token}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

import { View } from "react-native";
import TopTabs from "expo-router/js-top-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TopBar } from "../../components/TopBar";
import { colors, fonts } from "../../theme";

// Équivalent mobile du carrousel 3D du web (CarouselShell + PageCylinder) :
// on glisse d'une page à l'autre, onglets en bas de l'écran, header fixe
// hors de l'animation.
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <TopBar />
      </View>

      <TopTabs
        tabBarPosition="bottom"
        screenOptions={{
          sceneStyle: { backgroundColor: colors.bg },
          tabBarScrollEnabled: true,
          tabBarItemStyle: { width: "auto", paddingHorizontal: 14 },
          tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12, textTransform: "none" },
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIndicatorStyle: { backgroundColor: colors.accent, height: 3, borderRadius: 2, top: 0 },
          tabBarStyle: { backgroundColor: colors.white, paddingBottom: insets.bottom },
          tabBarPressColor: colors.accentSoft,
        }}
      >
        <TopTabs.Screen name="index" options={{ title: "Dashboard" }} />
        <TopTabs.Screen name="historique" options={{ title: "Historique" }} />
        <TopTabs.Screen name="controle" options={{ title: "Contrôle" }} />
        <TopTabs.Screen name="camera" options={{ title: "Caméra" }} />
        <TopTabs.Screen name="journal" options={{ title: "Journal" }} />
        <TopTabs.Screen name="automatisation" options={{ title: "Automatisation" }} />
      </TopTabs>
    </View>
  );
}

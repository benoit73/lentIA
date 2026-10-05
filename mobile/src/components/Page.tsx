import type { ReactNode } from "react";
import { ScrollView } from "react-native";

/** Contenu défilant d'une page : marges et espacement entre cartes communs. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

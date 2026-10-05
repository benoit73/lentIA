import type { CapacitorConfig } from "@capacitor/cli";

// App Android : emballe le build Vite (dist/) dans une WebView. Voir la
// section "Application Android" du README.
const config: CapacitorConfig = {
  appId: "com.lentia.app",
  appName: "LentIA",
  webDir: "dist",
  server: {
    // La VM n'expose l'API qu'en HTTP : une app servie en https://localhost
    // verrait ses appels bloqués (mixed content). À repasser en "https" (et
    // retirer cleartext) le jour où la VM a un certificat TLS.
    androidScheme: "http",
    cleartext: true,
  },
  plugins: {
    SocialLogin: {
      // Seul Google est utilisé : évite d'embarquer les SDK des autres.
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },
};

export default config;

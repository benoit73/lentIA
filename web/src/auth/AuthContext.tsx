import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { GOOGLE_CLIENT_ID } from "../config";
import type { GoogleCredentialResponse } from "../google-identity";

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  gisReady: boolean;
  renderSignInButton: (el: HTMLElement) => void;
  /** App Android uniquement : Google bloque le bouton GIS dans une WebView,
   * la connexion passe par le Credential Manager natif d'Android. */
  isNative: boolean;
  nativeSignIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "lentia_id_token";

const isNative = Capacitor.isNativePlatform();

// Web : sessionStorage (session limitée à l'onglet). Android : localStorage,
// sinon la session serait perdue à chaque fois que le système tue l'app.
const tokenStorage: Storage = isNative ? localStorage : sessionStorage;

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return null; // token expiré
    }
    return {
      email: payload.email ?? "",
      name: payload.name ?? payload.email ?? "",
      picture: payload.picture ?? "",
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [gisReady, setGisReady] = useState(false);

  const acceptToken = useCallback((credential: string) => {
    const decoded = decodeToken(credential);
    if (!decoded) return;
    tokenStorage.setItem(STORAGE_KEY, credential);
    setToken(credential);
    setUser(decoded);
  }, []);

  const handleCredential = useCallback(
    (response: GoogleCredentialResponse) => acceptToken(response.credential),
    [acceptToken],
  );

  // Restaure la session au chargement.
  useEffect(() => {
    const stored = tokenStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const decoded = decodeToken(stored);
    if (decoded) {
      setToken(stored);
      setUser(decoded);
    } else {
      tokenStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Charge le script Google Identity Services une seule fois (web), ou
  // initialise le plugin de connexion native (Android). Dans les deux cas
  // l'ID token a pour audience le Client ID *web* : l'API n'y voit aucune
  // différence.
  useEffect(() => {
    if (isNative) {
      SocialLogin.initialize({ google: { webClientId: GOOGLE_CLIENT_ID } })
        .then(() => setGisReady(true))
        .catch((err) => console.error("Initialisation Google Sign-In native", err));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
      });
      setGisReady(true);
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [handleCredential]);

  const renderSignInButton = useCallback((el: HTMLElement) => {
    window.google?.accounts.id.renderButton(el, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
    });
  }, []);

  const nativeSignIn = useCallback(async () => {
    const { result } = await SocialLogin.login({
      provider: "google",
      options: { scopes: ["email", "profile"] },
    });
    if (result.responseType === "online" && result.idToken) {
      acceptToken(result.idToken);
    }
  }, [acceptToken]);

  const signOut = useCallback(() => {
    tokenStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    if (isNative) {
      SocialLogin.logout({ provider: "google" }).catch(() => undefined);
    } else {
      window.google?.accounts.id.disableAutoSelect();
    }
  }, []);

  const value = useMemo(
    () => ({ token, user, gisReady, renderSignInButton, isNative, nativeSignIn, signOut }),
    [token, user, gisReady, renderSignInButton, nativeSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}

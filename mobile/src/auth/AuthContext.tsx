import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import { GOOGLE_WEB_CLIENT_ID } from "../config";

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** false tant que la session n'a pas été restaurée au démarrage (évite
   * d'afficher l'écran de connexion une fraction de seconde pour rien). */
  ready: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  /** À appeler sur un 401 : tente d'abord un renouvellement silencieux du
   * token (expiré au bout d'1 h), et ne déconnecte que s'il échoue. */
  handleUnauthorized: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "lentia_id_token";

// webClientId = Client ID *web* du dashboard : c'est lui qui fixe l'audience
// de l'ID token, donc l'API (auth.py) l'accepte sans changement. Le client
// OAuth « Android » de Google Cloud ne sert qu'à autoriser l'APK (package +
// SHA-1), il n'apparaît pas dans le code.
GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

interface Decoded {
  user: AuthUser;
  expiresAt: number; // epoch ms
}

function decodeToken(token: string): Decoded | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const expiresAt = typeof payload.exp === "number" ? payload.exp * 1000 : Infinity;
    if (expiresAt < Date.now()) return null; // token expiré
    return {
      user: {
        email: payload.email ?? "",
        name: payload.name ?? payload.email ?? "",
        picture: payload.picture ?? "",
      },
      expiresAt,
    };
  } catch {
    return null;
  }
}

/** Nouvel ID token sans interaction, si l'utilisateur s'est déjà connecté
 * sur cet appareil. null sinon. */
async function silentToken(): Promise<string | null> {
  try {
    const response = await GoogleSignin.signInSilently();
    return response.type === "success" ? response.data.idToken : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const refreshing = useRef(false);

  const clearSession = useCallback(() => {
    SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => undefined);
    setToken(null);
    setUser(null);
    setExpiresAt(null);
  }, []);

  const acceptToken = useCallback((credential: string | null): boolean => {
    const decoded = credential ? decodeToken(credential) : null;
    if (!credential || !decoded) return false;
    SecureStore.setItemAsync(STORAGE_KEY, credential).catch(() => undefined);
    setToken(credential);
    setUser(decoded.user);
    setExpiresAt(decoded.expiresAt);
    return true;
  }, []);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      if (!acceptToken(await silentToken())) clearSession();
    } finally {
      refreshing.current = false;
    }
  }, [acceptToken, clearSession]);

  // Restaure la session au démarrage : token stocké s'il est encore valide,
  // sinon renouvellement silencieux (l'app reste connectée d'un jour à
  // l'autre, contrairement au dashboard web et son sessionStorage).
  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
      if (!acceptToken(stored) && GoogleSignin.hasPreviousSignIn()) {
        acceptToken(await silentToken());
      }
      setReady(true);
    })();
  }, [acceptToken]);

  // Renouvelle le token juste après son expiration, sans attendre un 401.
  useEffect(() => {
    if (expiresAt === null || !Number.isFinite(expiresAt)) return;
    const timer = setTimeout(refresh, Math.max(0, expiresAt - Date.now()) + 1000);
    return () => clearTimeout(timer);
  }, [expiresAt, refresh]);

  const signIn = useCallback(async () => {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (isSuccessResponse(response)) acceptToken(response.data.idToken);
  }, [acceptToken]);

  const signOut = useCallback(() => {
    clearSession();
    GoogleSignin.signOut().catch(() => undefined);
  }, [clearSession]);

  const value = useMemo(
    () => ({ token, user, ready, signIn, signOut, handleUnauthorized: refresh }),
    [token, user, ready, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}

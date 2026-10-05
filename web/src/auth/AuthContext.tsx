import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "lentia_id_token";

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

  const handleCredential = useCallback((response: GoogleCredentialResponse) => {
    const decoded = decodeToken(response.credential);
    if (!decoded) return;
    sessionStorage.setItem(STORAGE_KEY, response.credential);
    setToken(response.credential);
    setUser(decoded);
  }, []);

  // Restaure la session depuis sessionStorage au chargement.
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const decoded = decodeToken(stored);
    if (decoded) {
      setToken(stored);
      setUser(decoded);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Charge le script Google Identity Services une seule fois.
  useEffect(() => {
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

  const signOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    window.google?.accounts.id.disableAutoSelect();
  }, []);

  const value = useMemo(
    () => ({ token, user, gisReady, renderSignInButton, signOut }),
    [token, user, gisReady, renderSignInButton, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}

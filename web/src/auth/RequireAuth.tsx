import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { GoogleSignInButton } from "./GoogleSignInButton";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-theme-card rounded-3xl p-8 shadow-soft-card text-center max-w-sm w-full">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-theme-textPrimary text-white flex items-center justify-center font-bold text-xl">
            L
          </div>
          <h1 className="mt-4 font-bold text-lg text-theme-textPrimary">LentIA — Dashboard</h1>
          <p className="mt-1 text-sm text-theme-textSecondary">
            Connecte-toi avec ton compte Google pour accéder aux capteurs.
          </p>
          <div className="mt-6 flex justify-center">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

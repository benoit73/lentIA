import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";

export function GoogleSignInButton() {
  const { gisReady, renderSignInButton, isNative } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isNative && gisReady && ref.current) {
      renderSignInButton(ref.current);
    }
  }, [isNative, gisReady, renderSignInButton]);

  if (isNative) return <NativeSignInButton />;
  return <div ref={ref} />;
}

// Le bouton GIS ne fonctionne pas dans une WebView Android : sur l'app, un
// bouton maison déclenche la sélection de compte native.
function NativeSignInButton() {
  const { gisReady, nativeSignIn } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setPending(true);
    setError(null);
    try {
      await nativeSignIn();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "USER_CANCELLED") setError("Connexion Google impossible");
      console.error("Connexion Google native", err);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={!gisReady || pending}
        className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm disabled:opacity-50"
      >
        {pending ? "Connexion…" : "Se connecter avec Google"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

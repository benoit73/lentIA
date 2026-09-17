import { useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";

export function GoogleSignInButton() {
  const { gisReady, renderSignInButton } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gisReady && ref.current) {
      renderSignInButton(ref.current);
    }
  }, [gisReady, renderSignInButton]);

  return <div ref={ref} />;
}

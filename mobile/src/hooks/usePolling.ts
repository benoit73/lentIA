import { useEffect, useRef } from "react";

/**
 * Rappelle `callback` toutes les `intervalMs`, en plus de son premier appel
 * (fait par l'appelant lui-même, typiquement dans un useEffect au montage).
 * Sert à rafraîchir les vues qui n'ont pas de canal temps réel dédié
 * (journal, états des actionneurs) : une action manuelle se répercute tout
 * de suite via un rechargement explicite, et ce polling rattrape en plus les
 * changements faits ailleurs (règle d'automatisation, autre onglet/appareil).
 */
export function usePolling(callback: () => void, intervalMs: number) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const interval = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
}

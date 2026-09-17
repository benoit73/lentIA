import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchSensorHistory, type HistoryPoint, type HistoryRange } from "../api";
import { useAuth } from "../auth/AuthContext";

export function useSensorHistory(sensor: string, range: HistoryRange) {
  const { token, signOut } = useAuth();
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSensorHistory(token, sensor, range);
      setData(rows);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.status === 401) signOut();
      } else if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, sensor, range.start, range.end, range.limit, signOut]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

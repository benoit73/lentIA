import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { SensorChart } from "../components/SensorChart";
import { PresetKey, presetToRange, RangePicker } from "../components/RangePicker";
import { TopBar } from "../components/TopBar";
import { sensorByKey } from "../config";
import { useSensorHistory } from "../hooks/useSensorHistory";
import { useSensorRealtime } from "../hooks/useSensorRealtime";

export function SensorDetail() {
  const { sensor: sensorKey } = useParams<{ sensor: string }>();
  const sensor = sensorByKey(sensorKey);

  const [preset, setPreset] = useState<PresetKey>("24h");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { token } = useAuth();
  const range = useMemo(() => presetToRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const { data, loading, error } = useSensorHistory(sensorKey ?? "", range);
  const live = useSensorRealtime(sensorKey ?? "", token);

  if (!sensor) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <TopBar />
        <main className="mt-5 bg-theme-card rounded-3xl p-6 shadow-soft-card">
          <p className="text-sm text-theme-textPrimary">Capteur inconnu.</p>
          <Link to="/" className="text-xs font-bold text-theme-accent">
            ← Retour au dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <TopBar />
      <main className="mt-5 max-w-4xl mx-auto bg-theme-card rounded-3xl p-5 shadow-soft-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link to="/" className="text-xs font-bold text-theme-accent">
              ← Retour au dashboard
            </Link>
            <h1 className="font-bold text-2xl text-theme-textPrimary tracking-tight mt-1">{sensor.label}</h1>
            <p className="text-sm text-theme-textSecondary mt-0.5">
              Valeur actuelle :{" "}
              <strong className="text-theme-textPrimary">
                {live !== null ? `${live} ${sensor.unit}` : "—"}
              </strong>
            </p>
          </div>
          <RangePicker
            preset={preset}
            customStart={customStart}
            customEnd={customEnd}
            onPresetChange={setPreset}
            onCustomChange={(start, end) => {
              setCustomStart(start);
              setCustomEnd(end);
            }}
          />
        </div>

        <div className="mt-6">
          {loading && <p className="text-sm text-theme-textSecondary">Chargement…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && <SensorChart data={data} color={sensor.color} unit={sensor.unit} />}
        </div>
      </main>
    </div>
  );
}

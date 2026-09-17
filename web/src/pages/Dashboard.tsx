import { useMemo, useState } from "react";
import { SENSORS } from "../config";
import { SensorCard } from "../components/SensorCard";
import { PresetKey, presetToRange, RangePicker } from "../components/RangePicker";
import { TopBar } from "../components/TopBar";

export function Dashboard() {
  const [preset, setPreset] = useState<PresetKey>("24h");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const range = useMemo(() => presetToRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-20">
      <TopBar />

      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-bold text-sm text-theme-textSecondary uppercase tracking-wide">Vue d'ensemble</h2>
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

      <main className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
        {SENSORS.map((sensor) => (
          <SensorCard key={sensor.key} sensor={sensor} range={range} />
        ))}
      </main>
    </div>
  );
}

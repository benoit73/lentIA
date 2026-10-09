import { Link } from "react-router-dom";
import { useCameraStream } from "../hooks/useCameraStream";
import { CameraView } from "./CameraView";

export function CameraPanel() {
  const stream = useCameraStream();

  return (
    <div className="bg-theme-card rounded-3xl p-5 shadow-soft-card flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg text-theme-textPrimary tracking-tight">Caméra</h2>
          <p className="text-xs text-theme-textSecondary mt-0.5">Retour caméra du bac, en direct.</p>
        </div>
        <Link to="/camera" className="text-xs font-bold text-theme-accent hover:underline whitespace-nowrap">
          Plein écran →
        </Link>
      </div>
      <CameraView stream={stream} className="mt-4 flex-1 min-h-[220px] aspect-[4/3]" />
    </div>
  );
}

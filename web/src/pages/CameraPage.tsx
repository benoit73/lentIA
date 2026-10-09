import { CameraView } from "../components/CameraView";
import { formatDateTime } from "../format";
import { useCameraStream } from "../hooks/useCameraStream";

export function CameraPage() {
  const stream = useCameraStream();
  const { frame } = stream;

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 pb-20">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold text-sm text-theme-textSecondary uppercase tracking-wide">Caméra</h2>
          <p className="text-xs text-theme-textSecondary mt-0.5">
            Image en direct du bac — caméra HM01B0 (monochrome) branchée sur le Pico.
          </p>
        </div>
        {frame && (
          <a
            href={`data:image/jpeg;base64,${frame.jpeg}`}
            download={`lentia-${frame.received_at.replace(/[:.]/g, "-")}.jpg`}
            className="px-4 py-2 rounded-xl bg-theme-accent text-white text-xs font-bold"
          >
            Enregistrer l'image
          </a>
        )}
      </div>

      <main className="mt-4 max-w-4xl mx-auto bg-theme-card rounded-3xl p-4 sm:p-5 shadow-soft-card">
        <CameraView stream={stream} className="w-full aspect-[4/3]" />
        {frame && (
          <p className="mt-3 text-[11px] text-theme-textSecondary">
            {frame.width} × {frame.height} px · dernière image le {formatDateTime(frame.received_at)}
          </p>
        )}
      </main>
    </div>
  );
}

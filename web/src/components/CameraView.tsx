import type { CameraStream } from "../hooks/useCameraStream";
import { formatTime } from "../format";

/** Image temps réel de la caméra, avec badge en ligne/hors ligne. Placeholder
 * tant qu'aucune image n'a été reçue. */
export function CameraView({ stream, className = "" }: { stream: CameraStream; className?: string }) {
  const { frame, online, fps } = stream;

  if (!frame) {
    return (
      <div
        className={`rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 flex flex-col items-center justify-center gap-2 text-theme-textMuted ${className}`}
      >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs font-semibold">En attente d'une image du Pico…</span>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-slate-900 ${className}`}>
      <img
        src={`data:image/jpeg;base64,${frame.jpeg}`}
        alt="Caméra du bac de lentilles"
        className={`w-full h-full object-contain transition-opacity ${online ? "" : "opacity-50"}`}
      />
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            online ? "bg-red-600 text-white" : "bg-white/90 text-theme-textSecondary"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-white animate-pulse" : "bg-slate-400"}`} />
          {online ? "En direct" : "Hors ligne"}
        </span>
        {online && (
          <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white tabular-nums">
            {fps.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} img/s
          </span>
        )}
      </div>
      {!online && (
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-theme-textSecondary">
          Dernière image à {formatTime(frame.received_at)}
        </span>
      )}
    </div>
  );
}

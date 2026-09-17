export function CameraPanel() {
  return (
    <div className="bg-theme-card rounded-3xl p-5 shadow-soft-card flex flex-col">
      <h2 className="font-bold text-lg text-theme-textPrimary tracking-tight">Caméra</h2>
      <p className="text-xs text-theme-textSecondary mt-0.5">
        Retour caméra du bac — pas encore de caméra branchée.
      </p>
      <div className="mt-4 flex-1 min-h-[220px] rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 flex flex-col items-center justify-center gap-2 text-theme-textMuted">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs font-semibold">Aucune photo pour l'instant</span>
      </div>
    </div>
  );
}

export function LiveStatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
        online ? "text-emerald-600" : "text-red-500"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-red-500"}`} />
      {online ? "En ligne" : "Hors ligne"}
    </span>
  );
}

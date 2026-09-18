import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: ReactNode;
  /** Badge aligné à droite du titre (ex. « 4,1 L restants »). */
  pill?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Décale l'apparition du widget pour que la grille se remplisse en cascade. */
  delayMs?: number;
}

export function WidgetCard({ title, subtitle, pill, children, className = "", delayMs = 0 }: Props) {
  return (
    <section
      className={`widget-in bg-theme-card rounded-3xl p-5 shadow-soft-card flex flex-col ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-lg text-theme-textPrimary tracking-tight leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-theme-textSecondary mt-0.5">{subtitle}</p>}
        </div>
        {pill}
      </div>
      {children}
    </section>
  );
}

export function WidgetPill({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "muted" }) {
  const tones = {
    accent: "bg-theme-accent/10 text-theme-accent",
    muted: "bg-white/70 text-theme-textSecondary",
  };
  return (
    <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

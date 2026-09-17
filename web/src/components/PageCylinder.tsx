import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

export interface CylinderFace {
  path: string;
  label: string;
  node: ReactNode;
}

interface Props {
  faces: CylinderFace[];
  activeIndex: number;
  onSettle: (index: number) => void;
}

// Sensibilité du glisser : un glisser sur toute la largeur de l'écran fait
// tourner le cylindre de ~140°, un peu moins que l'angle entre deux faces
// (180° pour 2 faces) — il faut glisser franchement pour changer de page.
const DRAG_DEGREES_PER_WIDTH = 140;

export function PageCylinder({ faces, activeIndex, onSettle }: Props) {
  const n = faces.length;
  const angleStep = 360 / n;

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [dragOffsetDeg, setDragOffsetDeg] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pour 2 faces, la formule du polygone régulier dégénère (rayon nul) : on
  // fixe une profondeur raisonnable pour garder l'effet 3D. Pour 3+ faces,
  // la formule aligne les faces bord à bord comme un vrai tambour.
  const radius = n <= 2 ? width * 0.42 : width / (2 * Math.tan(Math.PI / n));

  const baseAngle = -activeIndex * angleStep;
  const currentAngle = baseAngle + dragOffsetDeg;

  const settle = useCallback(
    (finalAngle: number) => {
      const steps = Math.round(-finalAngle / angleStep);
      const nextIndex = ((steps % n) + n) % n;
      setDragOffsetDeg(0);
      setDragging(false);
      onSettle(nextIndex);
    },
    [angleStep, n, onSettle],
  );

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartX.current = e.clientX;
    setDragging(true);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging || width === 0) return;
    const deltaX = e.clientX - dragStartX.current;
    setDragOffsetDeg((deltaX / width) * DRAG_DEGREES_PER_WIDTH);
  }

  function handlePointerUp() {
    if (!dragging) return;
    settle(baseAngle + dragOffsetDeg);
  }

  function goTo(delta: number) {
    onSettle(((activeIndex + delta) % n + n) % n);
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") goTo(-1);
    if (e.key === "ArrowRight") goTo(1);
  }

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden outline-none"
        style={{ perspective: "1800px", touchAction: "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="group"
        aria-label="Pages du dashboard"
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(-${radius}px) rotateY(${currentAngle}deg)`,
            transition: dragging ? "none" : "transform 550ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {faces.map((face, i) => (
            <div
              key={face.path}
              className="absolute inset-0"
              style={{
                transform: `rotateY(${i * angleStep}deg) translateZ(${radius}px)`,
                backfaceVisibility: "hidden",
                pointerEvents: i === activeIndex && !dragging ? "auto" : "none",
              }}
            >
              {/* Le scroll est isolé sur un enfant à part : un même élément
                  3D-transformé + overflow non-visible casse le hit-testing
                  des clics dans Chromium. */}
              <div className="absolute inset-0 overflow-y-auto">{face.node}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Page précédente"
        onClick={() => goTo(-1)}
        className="hidden sm:flex fixed left-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-white shadow-soft-card items-center justify-center text-theme-textSecondary hover:text-theme-textPrimary text-xl"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Page suivante"
        onClick={() => goTo(1)}
        className="hidden sm:flex fixed right-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-white shadow-soft-card items-center justify-center text-theme-textSecondary hover:text-theme-textPrimary text-xl"
      >
        ›
      </button>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 glass-pill rounded-full p-1 flex items-center gap-1 shadow-soft-card border border-white/70">
        {faces.map((face, i) => (
          <button
            key={face.path}
            type="button"
            onClick={() => onSettle(i)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
              i === activeIndex
                ? "bg-white shadow-sm text-theme-textPrimary"
                : "text-theme-textSecondary hover:text-theme-textPrimary"
            }`}
          >
            {face.label}
          </button>
        ))}
      </div>
    </>
  );
}

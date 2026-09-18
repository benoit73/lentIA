import { useLocation, useNavigate } from "react-router-dom";
import { PageCylinder } from "../components/PageCylinder";
import { TopBar } from "../components/TopBar";
import { AutomationPage } from "./AutomationPage";
import { ControlPage } from "./ControlPage";
import { Dashboard } from "./Dashboard";
import { JournalPage } from "./JournalPage";

export function CarouselShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const pages = [
    { path: "/", label: "Dashboard", node: <Dashboard /> },
    { path: "/controle", label: "Contrôle", node: <ControlPage /> },
    { path: "/journal", label: "Journal", node: <JournalPage /> },
    { path: "/automatisation", label: "Automatisation", node: <AutomationPage /> },
  ];
  const activeIndex = Math.max(
    0,
    pages.findIndex((p) => p.path === location.pathname),
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hors du cylindre 3D : reste fixe pendant la rotation entre pages,
          ne fait pas partie de l'animation. */}
      <div className="p-4 sm:p-6 lg:p-8 pb-0 shrink-0">
        <TopBar />
      </div>

      <div className="relative flex-1">
        <PageCylinder
          faces={pages}
          activeIndex={activeIndex}
          onSettle={(index) => {
            if (pages[index].path !== location.pathname) {
              navigate(pages[index].path, { replace: true });
            }
          }}
        />
      </div>
    </div>
  );
}

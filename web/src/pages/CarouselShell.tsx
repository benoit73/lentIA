import { useLocation, useNavigate } from "react-router-dom";
import { PageCylinder } from "../components/PageCylinder";
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
    <div className="min-h-screen relative">
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
  );
}

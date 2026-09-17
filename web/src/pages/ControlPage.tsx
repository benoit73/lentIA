import { ActuatorPanel } from "../components/ActuatorPanel";
import { CameraPanel } from "../components/CameraPanel";
import { JournalPreview } from "../components/JournalPreview";
import { TopBar } from "../components/TopBar";

export function ControlPage() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-20">
      <TopBar />
      <main className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        <ActuatorPanel />
        <CameraPanel />
        <JournalPreview />
      </main>
    </div>
  );
}

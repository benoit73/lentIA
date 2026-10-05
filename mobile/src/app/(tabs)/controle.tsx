import { ActuatorPanel } from "../../components/ActuatorPanel";
import { CameraPanel } from "../../components/CameraPanel";
import { JournalPreview } from "../../components/JournalPreview";
import { Page } from "../../components/Page";

export default function ControlPage() {
  return (
    <Page>
      <ActuatorPanel />
      <CameraPanel />
      <JournalPreview />
    </Page>
  );
}

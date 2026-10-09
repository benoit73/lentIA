import { View } from "react-native";
import { CameraView } from "../../components/CameraView";
import { Page } from "../../components/Page";
import { Card, SectionTitle, T } from "../../components/ui";
import { formatDateTime } from "../../format";
import { useCameraStream } from "../../hooks/useCameraStream";
import { colors } from "../../theme";

export default function CameraPage() {
  const stream = useCameraStream();
  const { frame } = stream;

  return (
    <Page>
      <View style={{ gap: 4 }}>
        <SectionTitle>Caméra</SectionTitle>
        <T size={12} color={colors.textSecondary}>
          Image en direct du bac — caméra HM01B0 (monochrome) branchée sur le Pico.
        </T>
      </View>

      <Card style={{ padding: 12 }}>
        <CameraView stream={stream} />
        {frame && (
          <T size={11} color={colors.textSecondary} style={{ marginTop: 10 }}>
            {frame.width} × {frame.height} px · dernière image le {formatDateTime(frame.received_at)}
          </T>
        )}
      </Card>
    </Page>
  );
}

import { KeyRound, RotateCcw, Wifi } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { LobbyActions } from "../components/LobbyActions";
import { Panel, PanelTitle } from "../../../components/ui/Panel";
import { MAX_STREAM_CAMERAS } from "../lib/streamSession";

interface PairedPanelProps {
  canPairAnother: boolean;
  onPairAnother: () => void;
  onBack: () => void;
}

export const PairedPanel = ({
  canPairAnother,
  onPairAnother,
  onBack,
}: PairedPanelProps) => (
  <div style={{ maxWidth: 560, margin: "0 auto" }}>
    <Panel style={{ padding: 20 }}>
      <PanelTitle
        icon={Wifi}
        title="Paired"
        info={`The camera is on the stage. Pop it out to keep working, and pair up to ${MAX_STREAM_CAMERAS} devices.`}
      />
    </Panel>
    <LobbyActions>
      <Button
        variant="ghost"
        size="sm"
        disabled={!canPairAnother}
        onClick={onPairAnother}
        title={
          canPairAnother
            ? "Show a new code for another device"
            : `Already holding ${MAX_STREAM_CAMERAS} cameras. Drop one first.`
        }
      >
        <KeyRound size={14} />
        Pair another camera
      </Button>
      <Button variant="ghost" size="sm" onClick={onBack}>
        <RotateCcw size={14} />
        Back
      </Button>
    </LobbyActions>
  </div>
);

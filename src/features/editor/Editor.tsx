import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { colors, DISPLAY, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { EditorWorkspace } from "./EditorWorkspace";

export function Editor() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const song = useStore((s) => s.songs.find((item) => item.id === songId));

  if (!song) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: DISPLAY, color: colors.text }}>Song not found</h2>
          <p style={{ fontFamily: UI, color: colors.sub }}>It may have been deleted.</p>
          <Button variant="primary" onClick={() => navigate("/songs")}>
            <ArrowLeft size={15} />
            Back to songs
          </Button>
        </div>
      </div>
    );
  }

  return <EditorWorkspace key={song.id} song={song} />;
}

import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { colors, DISPLAY, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { ManuscriptWorkspace } from "./ManuscriptWorkspace";

export function ManuscriptEditor() {
  const { manuscriptId } = useParams();
  const navigate = useNavigate();
  const manuscript = useStore((s) =>
    s.manuscripts.find((item) => item.id === manuscriptId),
  );

  if (!manuscript) {
    return (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: DISPLAY, color: colors.text }}>
            Manuscript not found
          </h2>
          <p style={{ fontFamily: UI, color: colors.sub }}>
            It may have been deleted.
          </p>
          <Button variant="primary" onClick={() => navigate("/manuscripts")}>
            <ArrowLeft size={15} />
            Back to manuscripts
          </Button>
        </div>
      </div>
    );
  }

  return <ManuscriptWorkspace key={manuscript.id} manuscript={manuscript} />;
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { buildNewManuscript } from "../../lib/manuscript/newManuscript";
import { Button } from "../../components/ui/Button";
import { ManuscriptWorkspace } from "./ManuscriptWorkspace";
import routes, { NEW_MANUSCRIPT_ID } from "../../routes";

export const ManuscriptEditor = () => {
  const { colors, fonts } = useUITheme();
  const { manuscriptId } = useParams();
  const navigate = useNavigate();
  const defaultThemeId = useStore(
    (s) => s.prefs.defaultManuscriptThemeId || "classic",
  );
  const stored = useStore((s) =>
    s.manuscripts.find((item) => item.id === manuscriptId),
  );

  const starting = manuscriptId === NEW_MANUSCRIPT_ID;
  /* Held here rather than written to the library: a manuscript nobody typed
     into should leave nothing behind. */
  const [draft] = useState(() =>
    starting ? buildNewManuscript(defaultThemeId) : null,
  );
  const saved = useStore((s) =>
    draft ? s.manuscripts.find((item) => item.id === draft.id) : undefined,
  );

  useEffect(() => {
    if (starting && saved)
      navigate(routes.manuscript(saved.id), { replace: true });
  }, [navigate, saved, starting]);

  const manuscript = stored ?? saved ?? draft;

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
          <h2 style={{ fontFamily: fonts.display, color: colors.text }}>
            Manuscript not found
          </h2>
          <p style={{ fontFamily: fonts.ui, color: colors.sub }}>
            It may have been deleted.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(routes.manuscripts())}
          >
            <ArrowLeft size={15} />
            Back to manuscripts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ManuscriptWorkspace
      key={manuscript.id}
      manuscript={manuscript}
      unsaved={!stored && !saved}
    />
  );
};

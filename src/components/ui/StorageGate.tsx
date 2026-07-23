import { useState } from "react";
import { AlertTriangle, HardDrive, Trash2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { colors, DISPLAY, UI, glass, fade } from "../../theme/tokens";
import { Button } from "./Button";
import { formatBytes } from "../../lib/storageStats";

export function StorageGate() {
  const storage = useStore((s) => s.storage);
  const freeUpStorage = useStore((s) => s.freeUpStorage);
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!storage || storage.viable) return null;

  const onFree = async () => {
    setBusy(true);
    await freeUpStorage();
    setBusy(false);
    setAttempted(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(0,0,0,0.9)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 18,
          padding: 26,
          background: colors.panel,
          backdropFilter: glass.backdropFilter,
          WebkitBackdropFilter: glass.WebkitBackdropFilter,
          border: `1px solid ${colors.border}`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 13,
            display: "grid",
            placeItems: "center",
            background: fade(colors.danger, 0.16),
            color: colors.danger,
            marginBottom: 16,
          }}
        >
          <HardDrive size={24} />
        </div>
        <h2
          style={{
            margin: "0 0 8px",
            fontFamily: DISPLAY,
            fontSize: 23,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          Not enough storage space
        </h2>
        <p
          style={{
            fontFamily: UI,
            fontSize: 14,
            color: colors.sub,
            lineHeight: 1.65,
            marginTop: 0,
          }}
        >
          Your browser hasn't given WorshipStudio enough room to run smoothly
          {storage.budget > 0
            ? ` (about ${formatBytes(storage.budget)} available)`
            : ""}
          . To use the app you'll need to free up space in your browser, or
          upgrade to a newer browser version.
        </p>

        {attempted && !storage.viable && (
          <div
            style={{
              display: "flex",
              gap: 11,
              padding: 14,
              borderRadius: 11,
              background: fade(colors.danger, 0.1),
              border: `1px solid ${fade(colors.danger, 0.3)}`,
              marginBottom: 16,
            }}
          >
            <AlertTriangle
              size={18}
              color={colors.danger}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <div
              style={{
                fontFamily: UI,
                fontSize: 13,
                color: colors.text,
                lineHeight: 1.6,
              }}
            >
              There still isn't enough space. Please update your browser to the
              latest version, or clear this site's storage manually: open your
              browser settings → Privacy / Site settings → find this site →{" "}
              <strong>Clear data</strong> (this removes cached site data and
              storage). Closing other installed web apps can also free space.
            </div>
          </div>
        )}

        <Button
          variant="danger"
          onClick={onFree}
          busy={busy}
          style={{ width: "100%", justifyContent: "center" }}
        >
          <Trash2 size={15} />
          Free up storage
        </Button>
        <p
          style={{
            fontFamily: UI,
            fontSize: 11.5,
            color: colors.dim,
            marginTop: 10,
            marginBottom: 0,
            lineHeight: 1.5,
          }}
        >
          "Free up storage" clears WorshipStudio's stored data on this device
          (songs, custom themes, backgrounds and audio) and restores the
          defaults.
        </p>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, Clock, Film, Music } from "lucide-react";
import { useStore, type UploadKind } from "../../store/useStore";
import { colors, fade, UI } from "../../theme/tokens";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { TextInput } from "./Field";
import { Spinner } from "./Spinner";

const stripExtension = (name: string) => name.replace(/\.[^.]+$/, "");

const KIND_NOUNS: Record<UploadKind, { one: string; many: string }> = {
  background: { one: "background", many: "backgrounds" },
  audio: { one: "sound", many: "sounds" },
  image: { one: "image", many: "images" },
  video: { one: "video", many: "videos" },
};

const visualKinds: UploadKind[] = ["background", "image"];

type RowStatus = "saved" | "saving" | "waiting" | "naming";

function StatusBadge({ status }: { status: RowStatus }) {
  if (status === "naming") return null;
  const box = (background: string, color: string, child: ReactNode) => (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        background,
        color,
      }}
    >
      {child}
    </div>
  );
  if (status === "saved")
    return box(fade(colors.accent, 0.18), colors.accent, <Check size={15} />);
  if (status === "saving") return box("transparent", colors.accent, <Spinner size={16} />);
  return box("transparent", colors.dim, <Clock size={15} />);
}

export function UploadLabelModal() {
  const pending = useStore((s) => s.pendingUpload);
  const commit = useStore((s) => s.commitUpload);
  const cancel = useStore((s) => s.cancelUpload);

  const [labels, setLabels] = useState<string[]>([]);

  useEffect(() => {
    if (pending && pending.savingIndex === null)
      setLabels(pending.files.map((file) => stripExtension(file.name)));
  }, [pending]);

  const showPreviews = Boolean(pending && visualKinds.includes(pending.kind));
  const files = pending?.files;
  const previews = useMemo(
    () =>
      files && pending && visualKinds.includes(pending.kind)
        ? files.map((file) => URL.createObjectURL(file))
        : [],
    [files],
  );
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  if (!pending) return null;

  const saving = pending.savingIndex !== null;
  const noun = KIND_NOUNS[pending.kind];
  const count = pending.files.length;
  const title = saving
    ? `Uploading ${count > 1 ? noun.many : noun.one}`
    : `Name your ${count > 1 ? noun.many : noun.one}`;

  const rowStatus = (index: number): RowStatus => {
    if (pending.savingIndex === null) return "naming";
    if (index < pending.savingIndex) return "saved";
    if (index === pending.savingIndex) return "saving";
    return "waiting";
  };

  const setLabel = (index: number, value: string) =>
    setLabels((prev) => prev.map((label, i) => (i === index ? value : label)));

  return (
    <Modal
      open
      onClose={saving ? () => {} : cancel}
      title={title}
      width={520}
      footer={
        <>
          <Button onClick={cancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void commit(labels)} busy={saving}>
            {count > 1 ? `Save ${count} items` : "Save"}
          </Button>
        </>
      }
    >
      {saving && count > 1 ? (
        <p style={{ fontFamily: UI, fontSize: 13, color: colors.sub, marginTop: 0, lineHeight: 1.6 }}>
          {pending.savedCount} of {count} uploaded. Please keep this window open.
        </p>
      ) : (
        <p style={{ fontFamily: UI, fontSize: 13, color: colors.sub, marginTop: 0, lineHeight: 1.6 }}>
          Give {count > 1 ? "each upload" : "this upload"} a label to find it easily later. Labels
          default to the file name.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pending.files.map((file, i) => {
          const status = rowStatus(i);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: status === "waiting" ? 0.5 : 1,
                transition: "opacity .2s ease",
              }}
            >
              {showPreviews ? (
                <div
                  style={{
                    width: 64,
                    height: 38,
                    borderRadius: 7,
                    flexShrink: 0,
                    background: `center/cover url(${previews[i]})`,
                    border: `1px solid ${colors.border}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 38,
                    borderRadius: 7,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    background: fade(colors.accent, 0.14),
                    color: colors.accentSoft,
                  }}
                >
                  {pending.kind === "video" ? <Film size={17} /> : <Music size={17} />}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextInput
                  value={labels[i] ?? ""}
                  placeholder={stripExtension(file.name)}
                  disabled={saving}
                  onChange={(e) => setLabel(i, e.target.value)}
                />
                <div
                  style={{
                    fontFamily: UI,
                    fontSize: 11.5,
                    color: colors.dim,
                    marginTop: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.name}
                </div>
              </div>
              <StatusBadge status={status} />
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

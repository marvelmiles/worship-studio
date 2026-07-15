import { useEffect, useMemo, useState } from "react";
import { Film, Music } from "lucide-react";
import { useStore, type UploadKind } from "../../store/useStore";
import { C, UI } from "../../theme/tokens";
import { Modal } from "./Modal";
import { Btn } from "./Button";
import { TextInput } from "./Field";

const stripExt = (name: string) => name.replace(/\.[^.]+$/, "");

const KIND_NOUNS: Record<UploadKind, { one: string; many: string }> = {
  background: { one: "background", many: "backgrounds" },
  audio: { one: "sound", many: "sounds" },
  image: { one: "image", many: "images" },
  video: { one: "video", many: "videos" },
};

const visualKinds: UploadKind[] = ["background", "image"];

export function UploadLabelModal() {
  const pending = useStore((s) => s.pendingUpload);
  const commit = useStore((s) => s.commitUpload);
  const cancel = useStore((s) => s.cancelUpload);

  const [labels, setLabels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pending) {
      setLabels(pending.files.map((f) => stripExt(f.name)));
      setBusy(false);
    }
  }, [pending]);

  const showPreviews = Boolean(pending && visualKinds.includes(pending.kind));
  const previews = useMemo(
    () => (pending && visualKinds.includes(pending.kind) ? pending.files.map((f) => URL.createObjectURL(f)) : []),
    [pending]
  );
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  if (!pending) return null;

  const noun = KIND_NOUNS[pending.kind];
  const count = pending.files.length;
  const title = `Name your ${count > 1 ? noun.many : noun.one}`;

  const setLabel = (index: number, value: string) =>
    setLabels((prev) => prev.map((l, i) => (i === index ? value : l)));

  const save = async () => {
    setBusy(true);
    await commit(labels);
  };

  return (
    <Modal
      open
      onClose={busy ? () => {} : cancel}
      title={title}
      width={520}
      footer={
        <>
          <Btn onClick={cancel} disabled={busy}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : count > 1 ? `Save ${count} items` : "Save"}
          </Btn>
        </>
      }
    >
      <p style={{ fontFamily: UI, fontSize: 13, color: C.sub, marginTop: 0, lineHeight: 1.6 }}>
        Give {count > 1 ? "each upload" : "this upload"} a label to find it easily later. Labels
        default to the file name.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pending.files.map((file, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {showPreviews ? (
              <div
                style={{
                  width: 64,
                  height: 38,
                  borderRadius: 7,
                  flexShrink: 0,
                  background: `center/cover url(${previews[i]})`,
                  border: `1px solid ${C.border}`,
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
                  background: "rgba(216,162,74,0.14)",
                  color: C.goldSoft,
                }}
              >
                {pending.kind === "video" ? <Film size={17} /> : <Music size={17} />}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <TextInput value={labels[i] ?? ""} placeholder={stripExt(file.name)} onChange={(e) => setLabel(i, e.target.value)} />
              <div
                style={{
                  fontFamily: UI,
                  fontSize: 11.5,
                  color: C.dim,
                  marginTop: 3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

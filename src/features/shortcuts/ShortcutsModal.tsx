import { useStore } from "../../store/useStore";
import { colors, UI } from "../../theme/tokens";
import { Modal } from "../../components/ui/Modal";
import { SectionTitle } from "../../components/ui/Field";
import { SHORTCUT_GROUPS } from "../../lib/shortcuts";

const keyStyle = {
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  fontWeight: 600,
  color: colors.text,
  background: "rgba(255,255,255,0.07)",
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  padding: "3px 8px",
  minWidth: 22,
  textAlign: "center" as const,
};

export function ShortcutsModal() {
  const overlay = useStore((s) => s.overlay);
  const close = useStore((s) => s.closeOverlay);

  return (
    <Modal
      open={overlay === "shortcuts"}
      onClose={close}
      title="Keyboard Shortcuts"
      width={540}
    >
      <p
        style={{
          fontFamily: UI,
          fontSize: 13,
          color: colors.sub,
          marginTop: 0,
          lineHeight: 1.6,
        }}
      >
        Every shortcut in the studio, grouped by where it works. Each group
        says when its keys are live: in an editor, while presenting, or on the
        Bible page.
      </p>
      {SHORTCUT_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: 6 }}>
          <SectionTitle>{group.title}</SectionTitle>
          {group.note && (
            <p
              style={{
                fontFamily: UI,
                fontSize: 12,
                color: colors.sub,
                margin: "4px 0 10px",
                lineHeight: 1.55,
                fontStyle: "italic",
              }}
            >
              {group.note}
            </p>
          )}
          {group.shortcuts.map((shortcut, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "8px 0",
                borderBottom:
                  i < group.shortcuts.length - 1
                    ? `1px solid ${colors.border}`
                    : "none",
              }}
            >
              <span
                style={{ fontFamily: UI, fontSize: 13.5, color: colors.text }}
              >
                {shortcut.description}
              </span>
              <span
                style={{
                  display: "flex",
                  gap: 5,
                  flexShrink: 0,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                  maxWidth: 260,
                }}
              >
                {shortcut.keys.map((key) => (
                  <kbd key={key} style={keyStyle}>
                    {key}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      ))}
    </Modal>
  );
}

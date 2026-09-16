import { useStore } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";
import { themeVar } from "../../theme/cssVars";
import { Modal } from "../../components/ui/Modal";
import { SectionTitle } from "../../components/ui/Field";
import { InfoTip } from "../../components/ui/InfoTip";
import { SHORTCUT_GROUPS } from "../../lib/shortcuts";

const keyStyle = {
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  fontWeight: 600,
  color: themeVar.text,
  background: "rgba(255,255,255,0.07)",
  border: `1px solid ${themeVar.border}`,
  borderRadius: 6,
  padding: "3px 8px",
  minWidth: 22,
  textAlign: "center" as const,
};

export const ShortcutsModal = () => {
  const { colors, fonts } = useUITheme();
  const overlay = useStore((s) => s.overlay);
  const close = useStore((s) => s.closeOverlay);

  return (
    <Modal
      open={overlay === "shortcuts"}
      onClose={close}
      title="Keyboard Shortcuts"
      width={540}
      info={
        <InfoTip title="Keyboard shortcuts">
          Every shortcut in the studio, grouped by where it works. Each group
          says when its keys are live: in an editor, while presenting, or on the
          Bible page.
        </InfoTip>
      }
    >
      {SHORTCUT_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: 6 }}>
          <SectionTitle
            info={
              group.note ? (
                <InfoTip title={group.title}>{group.note}</InfoTip>
              ) : undefined
            }
          >
            {group.title}
          </SectionTitle>
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
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 13.5,
                  color: colors.text,
                }}
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
};

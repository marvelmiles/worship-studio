import { Monitor, MonitorPlay, MonitorX } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { SectionTitle } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
import { useScreenAccess, type DisplayInfo } from "../../hooks/useScreenAccess";

const NOTE_BY_ACCESS = {
  unsupported:
    "This browser cannot put the live window on another display by itself. Go Live still opens a window you can drag onto the projector, then press F to fill it. Chrome or Edge can do it for you.",
  prompt:
    "Allow this once and Go Live opens straight onto the projector, in fullscreen, every time.",
  denied:
    "Display access is blocked for this site. Open the padlock in the address bar, turn Window management back on, then reload.",
  granted: "",
} as const;

export const ProjectorSection = () => {
  const { colors, fonts } = useUITheme();
  const { access, isExtended, displays, isAsking, allowDisplays } =
    useScreenAccess();

  const note = NOTE_BY_ACCESS[access];

  return (
    <>
      <SectionTitle>Projector</SectionTitle>
      <div style={{ marginBottom: 18 }}>
        {note && (
          <p
            style={{
              margin: "0 0 12px",
              fontFamily: fonts.ui,
              fontSize: 12.5,
              lineHeight: 1.65,
              color: colors.sub,
            }}
          >
            {note}
          </p>
        )}

        {access === "prompt" && (
          <Button variant="primary" onClick={allowDisplays} busy={isAsking}>
            <MonitorPlay size={15} />
            Allow display access
          </Button>
        )}

        {access === "granted" && displays.length > 0 && (
          <div style={{ display: "grid", gap: 8 }}>
            {displays.map((display) => (
              <DisplayRow key={display.id} display={display} />
            ))}
          </div>
        )}

        {access === "granted" && !isExtended && (
          <p
            style={{
              margin: "10px 0 0",
              fontFamily: fonts.ui,
              fontSize: 12.5,
              lineHeight: 1.65,
              color: colors.sub,
            }}
          >
            Only this display is connected. Plug the projector in and set
            Windows to Extend, rather than Duplicate, to keep the running order
            on the laptop while the audience sees the slides.
          </p>
        )}

        {access === "denied" && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontFamily: fonts.ui,
              fontSize: 12.5,
              fontWeight: 600,
              color: colors.danger,
            }}
          >
            <MonitorX size={15} />
            Blocked by this browser
          </span>
        )}
      </div>
    </>
  );
};

const DisplayRow = ({ display }: { display: DisplayInfo }) => {
  const { colors, fonts } = useUITheme();
  const Icon = display.isProjector ? MonitorPlay : Monitor;
  const badge = display.isProjector
    ? "Live output"
    : display.isCurrent
      ? "This screen"
      : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "10px 12px",
        borderRadius: 11,
        background: colors.raise,
        border: `1px solid ${display.isProjector ? fade(colors.accent, 0.4) : colors.border}`,
      }}
    >
      <Icon
        size={17}
        color={display.isProjector ? colors.accentSoft : colors.sub}
        style={{ flexShrink: 0 }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: fonts.ui,
            fontSize: 13,
            fontWeight: 600,
            color: colors.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {display.label}
        </span>
        <span
          style={{ fontFamily: fonts.ui, fontSize: 11.5, color: colors.sub }}
        >
          {display.size}
        </span>
      </span>
      {badge && (
        <span
          style={{
            fontFamily: fonts.ui,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.3,
            padding: "4px 9px",
            borderRadius: 99,
            whiteSpace: "nowrap",
            color: display.isProjector ? colors.accentSoft : colors.sub,
            background: display.isProjector
              ? fade(colors.accent, 0.16)
              : fade(colors.text, 0.07),
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
};

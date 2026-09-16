import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Info } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { Popover } from "./Popover";
import type { PopoverAlign, PopoverSide } from "./Popover";

export type InfoTipVariant = "popover" | "modal";

interface InfoTipProps {
  title: string;
  children: ReactNode;
  variant?: InfoTipVariant;
  side?: PopoverSide;
  align?: PopoverAlign;
  size?: number;
}

export const InfoTip = ({
  title,
  children,
  variant = "popover",
  side = "bottom",
  align = "start",
  size = 14,
}: InfoTipProps) => {
  const { colors, fonts, shadows } = useUITheme();
  const [open, setOpen] = useState(false);

  const trigger = (
    <span
      role="button"
      tabIndex={0}
      aria-label={`About ${title.toLowerCase()}`}
      aria-expanded={open}
      aria-haspopup={variant === "modal" ? "dialog" : "true"}
      title={variant === "modal" ? `About ${title.toLowerCase()}` : undefined}
      onClick={(event) => {
        event.preventDefault();
        if (variant !== "modal") return;
        event.stopPropagation();
        setOpen(true);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLSpanElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        setOpen((current) => (variant === "modal" ? true : !current));
      }}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size + 8,
        height: size + 8,
        borderRadius: "50%",
        cursor: "pointer",
        color: open ? colors.accentSoft : colors.dim,
        background: open ? fade(colors.accent, 0.16) : "transparent",
        transition: "color .15s, background .15s",
        verticalAlign: "middle",
        flexShrink: 0,
        textTransform: "none",
        letterSpacing: 0,
      }}
    >
      <Info size={size} aria-hidden />
    </span>
  );

  if (variant === "modal") {
    return (
      <>
        {trigger}
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={title}
          width={560}
          footer={
            <Button variant="primary" onClick={() => setOpen(false)}>
              Got it
            </Button>
          }
        >
          <div
            style={{
              fontFamily: fonts.ui,
              fontSize: 13.5,
              lineHeight: 1.7,
              color: colors.sub,
              textTransform: "none",
              letterSpacing: 0,
              fontWeight: 400,
            }}
          >
            {children}
          </div>
        </Modal>
      </>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      openOnHover
      side={side}
      align={align}
      trigger={trigger}
    >
      <div
        role="tooltip"
        style={{
          maxWidth: 300,
          padding: "11px 13px",
          borderRadius: 12,
          background: fade(colors.panelSolid, 0.98),
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.overlay,
          fontFamily: fonts.ui,
          textTransform: "none",
          letterSpacing: 0,
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: colors.text,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 400,
            lineHeight: 1.55,
            color: colors.sub,
          }}
        >
          {children}
        </div>
      </div>
    </Popover>
  );
};

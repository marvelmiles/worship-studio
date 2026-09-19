import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { IconButton } from "../ui/Button";
import type { AppNavigationItem } from "./appNavigation";
import { isRouteActive } from "../../routes";
import { APP_NAME } from "../../lib/appInfo";

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
  destinations: AppNavigationItem[];
  actions: AppNavigationItem[];
}

export const NavDrawer = ({
  open,
  onClose,
  pathname,
  destinations,
  actions,
}: NavDrawerProps) => {
  const { colors, fonts, shadows } = useUITheme();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const section = (title: string, items: AppNavigationItem[]) => (
    <div style={{ marginBottom: 18 }}>
      <div className="ws-section-label" style={{ padding: "0 4px 8px" }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item) => {
          const active = item.path ? isRouteActive(item.path, pathname) : false;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active || undefined}
              onClick={() => {
                item.run();
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "11px 12px",
                borderRadius: 11,
                cursor: "pointer",
                textAlign: "left",
                background: active ? fade(colors.accent, 0.14) : "transparent",
                border: `1px solid ${active ? fade(colors.accent, 0.32) : "transparent"}`,
                color: active ? colors.accentSoft : colors.text,
              }}
            >
              <item.icon size={18} style={{ flexShrink: 0 }} />
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontFamily: fonts.ui,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    display: "block",
                    fontFamily: fonts.ui,
                    fontSize: 12,
                    marginTop: 2,
                    color: colors.sub,
                  }}
                >
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 380,
        display: "flex",
        justifyContent: "flex-end",
        background: colors.scrim,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "wfFade .18s ease",
      }}
      onClick={onClose}
    >
      <nav
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(320px, 88vw)",
          height: "100%",
          overflowY: "auto",
          padding: "16px 14px 28px",
          background: colors.bg2,
          borderLeft: `1px solid ${colors.border}`,
          boxShadow: shadows.overlay,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
            padding: "0 2px",
          }}
        >
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 17,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            {APP_NAME}
          </span>
          <IconButton icon={X} title="Close menu" onClick={onClose} />
        </div>
        {section("Go to", destinations)}
        {section("Studio", actions)}
      </nav>
    </div>,
    document.body,
  );
};

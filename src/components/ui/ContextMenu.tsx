import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";

export interface MenuItem {
  label?: string;
  icon?: LucideIcon;
  fn?: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const { colors, fonts, glass } = useUITheme();
  const UI = fonts.ui;
  useEffect(() => {
    const h = () => onClose();
    window.addEventListener("click", h);
    window.addEventListener("scroll", h, true);
    return () => {
      window.removeEventListener("click", h);
      window.removeEventListener("scroll", h, true);
    };
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        left: Math.min(x, window.innerWidth - 210),
        top: Math.min(y, window.innerHeight - items.length * 38 - 10),
        zIndex: 300,
        width: 196,
        ...glass,
        background: "rgba(22,19,36,0.85)",
        padding: 6,
        boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
      }}
    >
      {items.map((it, i) =>
        it.divider ? (
          <div key={i} style={{ height: 1, background: colors.border, margin: "5px 8px" }} />
        ) : (
          <button
            key={i}
            onClick={() => {
              it.fn?.();
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "9px 11px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: UI,
              fontSize: 13.5,
              color: it.danger ? colors.danger : colors.text,
              textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = colors.raise)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {it.icon && <it.icon size={15} />} {it.label}
          </button>
        )
      )}
    </div>
  );
}

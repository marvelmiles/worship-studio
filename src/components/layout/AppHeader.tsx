import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useViewport } from "../../hooks/useViewport";
import { IconButton } from "../ui/Button";
import { NavDrawer } from "./NavDrawer";
import { isDestinationActive, useAppNavigation } from "./appNavigation";

/* The header never squeezes: it spends the width it has on whole icon slots and
   only opens a drawer for whatever is left over. */
const ICON_SLOT = 38;
const LOGO_SLOT = 34;
const MENU_SLOT = 38;
const WORDMARK_SLOT = 132;
const LABELLED_FROM = 1120;
const WORDMARK_FROM = 780;
const WIDE_PADDING_FROM = 700;

export const AppHeader = () => {
  const { colors, fonts } = useUITheme();
  const location = useLocation();
  const { width } = useViewport();
  const { destinations, actions } = useAppNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const labelled = width >= LABELLED_FROM;
  const showWordmark = width >= WORDMARK_FROM;
  const edgePadding = width >= WIDE_PADDING_FROM ? 22 : 12;
  const chrome =
    edgePadding * 2 + LOGO_SLOT + (showWordmark ? WORDMARK_SLOT : 0) + 16;
  const totalItems = destinations.length + actions.length;
  const capacity = Math.floor((width - chrome) / ICON_SLOT);
  const needsDrawer = !labelled && capacity < totalItems;
  const visibleCount = needsDrawer
    ? Math.max(1, Math.floor((width - chrome - MENU_SLOT) / ICON_SLOT))
    : totalItems;

  const visibleDestinations = destinations.slice(0, visibleCount);
  const visibleActions = actions.slice(
    0,
    Math.max(0, visibleCount - destinations.length),
  );

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: `0 ${edgePadding}px`,
        height: 58,
        borderBottom: `1px solid ${colors.border}`,
        flexShrink: 0,
        background: fade(colors.bg2, 0.8),
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <Link
        to="/"
        aria-label="WorshipStudio home"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        <img
          src="/favicon.svg"
          alt=""
          width={34}
          height={34}
          style={{
            borderRadius: 9,
            boxShadow: `0 4px 16px ${fade(colors.accent, 0.25)}`,
          }}
        />
        {showWordmark && (
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: -0.2,
              color: colors.text,
              whiteSpace: "nowrap",
            }}
          >
            WorshipStudio
          </span>
        )}
      </Link>

      <nav
        aria-label="Primary"
        style={{
          display: "flex",
          gap: 4,
          marginLeft: labelled ? 12 : 0,
          flexShrink: 0,
        }}
      >
        {visibleDestinations.map((item) => {
          const path = item.path ?? "/";
          const active = isDestinationActive(path, location.pathname);
          return (
            <Link
              key={item.id}
              to={path}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: labelled ? undefined : 34,
                height: 34,
                padding: labelled ? "0 14px" : 0,
                borderRadius: labelled ? 10 : 9,
                textDecoration: "none",
                fontFamily: fonts.ui,
                fontWeight: 600,
                fontSize: 13.5,
                whiteSpace: "nowrap",
                background: active ? colors.raise : "transparent",
                border: `1px solid ${active ? colors.border : "transparent"}`,
                color: active ? colors.text : colors.sub,
              }}
            >
              <item.icon size={16} />
              {labelled && item.label}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 4,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {visibleActions.map((item) => (
          <IconButton
            key={item.id}
            icon={item.icon}
            title={item.label}
            active={
              item.path
                ? isDestinationActive(item.path, location.pathname)
                : undefined
            }
            onClick={item.run}
          />
        ))}
        {needsDrawer && (
          <IconButton
            icon={Menu}
            title="Open menu"
            onClick={() => setDrawerOpen(true)}
          />
        )}
      </div>

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pathname={location.pathname}
        destinations={destinations}
        actions={actions}
      />
    </header>
  );
};

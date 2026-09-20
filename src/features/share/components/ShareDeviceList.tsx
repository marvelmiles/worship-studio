import { Check, MonitorSmartphone } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { fade } from "../../../theme/uiTheme";
import { Spinner } from "../../../components/ui/Spinner";
import type { ShareDevice } from "../lib/shareSignaling";

interface ShareDeviceListProps {
  devices: ShareDevice[];
  selectedIds: readonly string[];
  isSearching: boolean;
  disabled: boolean;
  onToggle: (deviceId: string) => void;
}

export const ShareDeviceList = ({
  devices,
  selectedIds,
  isSearching,
  disabled,
  onToggle,
}: ShareDeviceListProps) => {
  const { colors, fonts } = useUITheme();
  const selected = new Set(selectedIds);

  if (devices.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "26px 0",
          textAlign: "center",
        }}
      >
        {isSearching && <Spinner size={20} />}
        <span
          style={{
            fontFamily: fonts.ui,
            fontSize: 13,
            lineHeight: 1.6,
            color: colors.sub,
            maxWidth: 320,
          }}
        >
          {isSearching
            ? "Looking for devices on this WiFi"
            : "No other device is here yet. Open Quick Share on the other device and it appears in this list."}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {devices.map((device) => {
        const isSelected = selected.has(device.id);
        return (
          <button
            key={device.id}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onToggle(device.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 12px",
              borderRadius: 12,
              cursor: disabled ? "not-allowed" : "pointer",
              textAlign: "left",
              background: isSelected ? fade(colors.accent, 0.12) : colors.bg,
              border: `1px solid ${isSelected ? colors.accent : colors.border}`,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                flexShrink: 0,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: fade(colors.accent, 0.14),
                color: colors.accentSoft,
              }}
            >
              <MonitorSmartphone size={17} />
            </span>
            <span
              className="ws-ellipsis"
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: fonts.ui,
                fontSize: 13.5,
                fontWeight: 600,
                color: colors.text,
              }}
            >
              {device.name}
            </span>
            <span
              aria-hidden
              style={{
                width: 20,
                height: 20,
                flexShrink: 0,
                borderRadius: 7,
                display: "grid",
                placeItems: "center",
                background: isSelected ? colors.accent : "transparent",
                border: `1px solid ${isSelected ? colors.accent : colors.borderStrong}`,
                color: colors.onAccent,
              }}
            >
              {isSelected && <Check size={13} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
};

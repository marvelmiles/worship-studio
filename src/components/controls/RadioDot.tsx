import { useUITheme } from "../../theme/ThemeProvider";

/** The mark on a one-of-many choice, shared by the asset pickers. */
export const RadioDot = ({ selected }: { selected: boolean }) => {
  const { colors } = useUITheme();
  return (
    <span
      aria-hidden
      style={{
        width: 14,
        height: 14,
        flexShrink: 0,
        borderRadius: "50%",
        border: `1.5px solid ${selected ? colors.accent : colors.borderStrong}`,
        display: "grid",
        placeItems: "center",
      }}
    >
      {selected && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: colors.accent,
          }}
        />
      )}
    </span>
  );
};

import { useUITheme } from "../../../theme/ThemeProvider";

export const MissingContentNotice = () => {
  const { colors, fonts } = useUITheme();
  return (
    <span
      style={{ fontFamily: fonts.ui, fontSize: 12.5, color: colors.danger }}
    >
      This item is no longer in the library.
    </span>
  );
};

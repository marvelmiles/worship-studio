/** The id of a tab created by `PillTabs` under `prefix`. */
export const pillTabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;

/** The id of the panel a `PillTabs` tab controls. */
export const pillTabPanelId = (prefix: string, id: string) =>
  `${prefix}-panel-${id}`;

/** Spread onto the element showing the active tab's content. */
export const pillTabPanelProps = (prefix: string, id: string) => ({
  role: "tabpanel",
  id: pillTabPanelId(prefix, id),
  "aria-labelledby": pillTabId(prefix, id),
});

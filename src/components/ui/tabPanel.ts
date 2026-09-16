export const pillTabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;

export const pillTabPanelId = (prefix: string, id: string) =>
  `${prefix}-panel-${id}`;

export const pillTabPanelProps = (prefix: string, id: string) => ({
  role: "tabpanel",
  id: pillTabPanelId(prefix, id),
  "aria-labelledby": pillTabId(prefix, id),
});

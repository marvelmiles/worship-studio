import { useMemo, useState } from "react";
import { LayoutGrid, PackageOpen } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Select } from "../../../components/ui/Field";
import { LibrarySortSelect } from "../../../components/ui/LibrarySortSelect";
import { SearchInput } from "../../../components/ui/SearchInput";
import {
  DEFAULT_LIBRARY_SORT,
  sortLibrary,
  type LibrarySortOption,
} from "../../../lib/librarySort";
import {
  pickKey,
  type PickedShareItems,
  type ShareItem,
  type ShareTab,
  type ShareTabId,
} from "../../../lib/shareCatalog";
import { ShareItemTile } from "./ShareItemTile";

interface ShareItemPickerProps {
  tabs: ShareTab[];
  picked: PickedShareItems;
  disabled: boolean;
  onChange: (picked: PickedShareItems) => void;
}

/**
 * Everything this device can hand over, one module at a time. What is chosen
 * is held across every module at once, so a send can carry a manuscript, two
 * clips and a passage together.
 */
export const ShareItemPicker = ({
  tabs,
  picked,
  disabled,
  onChange,
}: ShareItemPickerProps) => {
  const { colors } = useUITheme();
  const [activeTab, setActiveTab] = useState<ShareTabId>(
    tabs[0]?.id ?? "manuscripts",
  );
  const [sort, setSort] = useState<LibrarySortOption>(DEFAULT_LIBRARY_SORT);
  const [query, setQuery] = useState("");

  const tab = tabs.find((entry) => entry.id === activeTab) ?? tabs[0];

  const moduleOptions = useMemo(
    () =>
      tabs.map((entry) => {
        const chosen = entry.items.filter(
          (item) => picked[pickKey(entry.id, item)],
        ).length;
        return {
          value: entry.id,
          label: chosen > 0 ? `${entry.label} (${chosen})` : entry.label,
        };
      }),
    [picked, tabs],
  );

  const shown = useMemo(() => {
    if (!tab) return [];
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? tab.items.filter((item) => item.name.toLowerCase().includes(needle))
      : tab.items;
    return sortLibrary(matching, sort, (item) => item.name);
  }, [query, sort, tab]);

  const allShownPicked =
    shown.length > 0 &&
    shown.every((item) => tab && picked[pickKey(tab.id, item)]);

  const toggle = (item: ShareItem) => {
    if (!tab) return;
    const key = pickKey(tab.id, item);
    const next = { ...picked };
    if (next[key]) delete next[key];
    else next[key] = item;
    onChange(next);
  };

  const setMany = (items: ShareItem[], shouldPick: boolean) => {
    if (!tab) return;
    const next = { ...picked };
    for (const item of items) {
      const key = pickKey(tab.id, item);
      if (shouldPick) next[key] = item;
      else delete next[key];
    }
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="ws-row-wrap">
        <div style={{ position: "relative", flex: "1 1 190px", minWidth: 170 }}>
          <LayoutGrid
            size={15}
            style={{
              position: "absolute",
              left: 13,
              top: 13,
              color: colors.dim,
              pointerEvents: "none",
            }}
          />
          <Select
            value={activeTab}
            aria-label="Module to share from"
            options={moduleOptions}
            onChange={(event) => {
              setActiveTab(event.target.value as ShareTabId);
              setQuery("");
            }}
            style={{ paddingLeft: 38 }}
          />
        </div>
        {tab && tab.items.length > 0 && (
          <>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={`Search ${tab.label.toLowerCase()}…`}
              style={{ minWidth: 160 }}
            />
            <LibrarySortSelect
              value={sort}
              onChange={setSort}
              nameLabel="Name"
              style={{ minWidth: 168 }}
            />
          </>
        )}
      </div>

      {tab && shown.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <SelectAllAction
            disabled={disabled}
            isClearing={allShownPicked}
            onClick={() => setMany(shown, !allShownPicked)}
          />
        </div>
      )}

      {!tab || tab.items.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={`No ${tab?.label.toLowerCase() ?? "items"} yet`}
          message="Anything you add here later can be sent from this page."
          compact
          bare
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No matches"
          message="Try a different search."
          compact
          bare
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(146px,1fr))",
            gap: 10,
          }}
        >
          {shown.map((item) => (
            <ShareItemTile
              key={item.key}
              item={item}
              picked={Boolean(picked[pickKey(tab.id, item)])}
              disabled={disabled}
              onToggle={() => toggle(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SelectAllActionProps {
  disabled: boolean;
  isClearing: boolean;
  onClick: () => void;
}

const SelectAllAction = ({
  disabled,
  isClearing,
  onClick,
}: SelectAllActionProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: fonts.ui,
        fontSize: 12,
        fontWeight: 600,
        color: disabled ? colors.dim : colors.accentSoft,
      }}
    >
      {isClearing ? "Clear these" : "Select all"}
    </button>
  );
};

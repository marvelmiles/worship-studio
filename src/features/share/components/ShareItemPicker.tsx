import { useMemo, useState } from "react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { EmptyState } from "../../../components/ui/EmptyState";
import { LibrarySortSelect } from "../../../components/ui/LibrarySortSelect";
import { SearchInput } from "../../../components/ui/SearchInput";
import { SegmentedTabs } from "../../../components/ui/SegmentedTabs";
import { PackageOpen } from "lucide-react";
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
 * Everything this device can hand over, tab by tab. What is chosen is held
 * across every tab at once, so a send can carry a manuscript, two clips and a
 * passage together.
 */
export const ShareItemPicker = ({
  tabs,
  picked,
  disabled,
  onChange,
}: ShareItemPickerProps) => {
  const { colors, fonts } = useUITheme();
  const [activeTab, setActiveTab] = useState<ShareTabId>(
    tabs[0]?.id ?? "manuscripts",
  );
  const [sort, setSort] = useState<LibrarySortOption>(DEFAULT_LIBRARY_SORT);
  const [query, setQuery] = useState("");

  const tab = tabs.find((entry) => entry.id === activeTab) ?? tabs[0];

  const shown = useMemo(() => {
    if (!tab) return [];
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? tab.items.filter((item) => item.name.toLowerCase().includes(needle))
      : tab.items;
    return sortLibrary(matching, sort, (item) => item.name);
  }, [query, sort, tab]);

  const pickedInTab = tab
    ? tab.items.filter((item) => picked[pickKey(tab.id, item)]).length
    : 0;
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
      <SegmentedTabs
        tabs={tabs.map((entry) => {
          const chosen = entry.items.filter(
            (item) => picked[pickKey(entry.id, item)],
          ).length;
          return {
            id: entry.id,
            label: entry.label,
            count: chosen > 0 ? chosen : entry.items.length,
          };
        })}
        value={activeTab}
        onChange={(id) => {
          setActiveTab(id);
          setQuery("");
        }}
        ariaLabel="What to send"
        minSegmentWidth={118}
      />

      {tab && tab.items.length > 0 && (
        <div className="ws-row-wrap">
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
        </div>
      )}

      {tab && tab.items.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: fonts.ui,
              fontSize: 12,
              color: pickedInTab > 0 ? colors.accentSoft : colors.dim,
            }}
          >
            {pickedInTab > 0
              ? `${pickedInTab} of ${tab.items.length} chosen`
              : `${tab.items.length} here`}
          </span>
          <span style={{ display: "flex", gap: 14 }}>
            <TextAction
              disabled={disabled || shown.length === 0}
              onClick={() => setMany(shown, !allShownPicked)}
            >
              {allShownPicked ? "Clear these" : "Select all"}
            </TextAction>
            {pickedInTab > 0 && (
              <TextAction
                disabled={disabled}
                onClick={() => setMany(tab.items, false)}
              >
                Clear tab
              </TextAction>
            )}
          </span>
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
              tab={tab.id}
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

const TextAction = ({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: string;
}) => {
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
      {children}
    </button>
  );
};

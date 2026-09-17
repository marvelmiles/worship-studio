import { PanelTabs, type PanelTab } from "../../../components/ui/PanelTabs";

export type WorkspaceTab = "slides" | "edit" | "style";

interface WorkspaceTabBarProps {
  tab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  hasSlide: boolean;
}

export const WorkspaceTabBar = ({
  tab,
  onChange,
  hasSlide,
}: WorkspaceTabBarProps) => {
  const tabs: PanelTab<WorkspaceTab>[] = [
    { id: "slides", label: "Slides" },
    { id: "edit", label: "Edit" },
    { id: "style", label: "Style", disabled: !hasSlide },
  ];
  return (
    <PanelTabs
      tabs={tabs}
      value={tab}
      onChange={onChange}
      ariaLabel="Editor panels"
    />
  );
};

import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  Palette,
  Plus,
  Upload,
  Volume2,
} from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { useStore } from "../../../store/useStore";
import { overlayTarget } from "../../../lib/overlayTarget";
import { THEMES_PATH } from "../../themes/themeRoutes";
import { DashboardTile, type DashboardTileProps } from "./DashboardTile";
import type { DashboardCounts } from "../useDashboardData";

interface OverviewGridProps {
  counts: DashboardCounts;
}

export const OverviewGrid = ({ counts }: OverviewGridProps) => {
  const { charts } = useUITheme();
  const navigate = useNavigate();
  const createManuscript = useStore((s) => s.createManuscript);
  const openOverlay = useStore((s) => s.openOverlay);

  const newManuscript = () => {
    const created = createManuscript();
    if (created) navigate(`/manuscripts/${created.id}`);
  };

  const tiles: DashboardTileProps[] = [
    {
      icon: FileText,
      label: "Manuscripts",
      value: counts.manuscripts,
      color: charts[0],
      title: "Open the manuscript library",
      onClick: () => navigate("/manuscripts"),
    },
    {
      icon: Layers,
      label: "Slides",
      value: counts.totalSlides,
      color: charts[1],
      title: "Open the manuscript library",
      onClick: () => navigate("/manuscripts"),
    },
    {
      icon: BookOpen,
      label: "Passages",
      value: counts.savedPassages,
      color: charts[2],
      title: "Open your saved Bible passages",
      onClick: () => navigate("/bible", { state: { tab: "saved" } }),
    },
    {
      icon: ImageIcon,
      label: "Images",
      value: counts.imageCount,
      color: charts[3],
      title: "Open the image library",
      onClick: () => navigate("/images"),
    },
    {
      icon: Film,
      label: "Videos",
      value: counts.videoCount,
      color: charts[4],
      title: "Open the video library",
      onClick: () => navigate("/videos"),
    },
    {
      icon: Palette,
      label: "Themes",
      value: counts.themes,
      color: charts[5],
      title: "Open the themes page",
      onClick: () => navigate(THEMES_PATH),
    },
    {
      icon: Volume2,
      label: "Sounds",
      value: counts.sounds,
      color: charts[6],
      title: "Open the sounds in the asset library",
      onClick: () => openOverlay("assets", overlayTarget("audio")),
    },
    {
      icon: Plus,
      label: "New Manuscript",
      sub: "Start writing a set",
      primary: true,
      title: "Create a new manuscript",
      onClick: newManuscript,
    },
    {
      icon: Palette,
      label: "Manage Themes",
      sub: "Fonts, colors, backgrounds",
      title: "Open the themes page: Fonts, colors, backgrounds",
      onClick: () => navigate(THEMES_PATH),
    },
    {
      icon: Upload,
      label: "Upload Assets",
      sub: "Backgrounds and sounds",
      title: "Open the asset library: Backgrounds and sounds",
      onClick: () => openOverlay("assets"),
    },
  ];

  return (
    <div className="ws-dash-grid">
      {tiles.map((tile) => (
        <DashboardTile key={tile.label} {...tile} />
      ))}
    </div>
  );
};

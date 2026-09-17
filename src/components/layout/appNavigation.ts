import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Film,
  HelpCircle,
  Image as ImageIcon,
  Keyboard,
  LayoutDashboard,
  Palette,
  Radio,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "../../store/useStore";
import { THEMES_PATH } from "../../features/themes/themeRoutes";

export interface AppNavigationItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  path?: string;
  run: () => void;
}

export interface AppNavigation {
  destinations: AppNavigationItem[];
  actions: AppNavigationItem[];
}

export const isDestinationActive = (path: string, pathname: string): boolean =>
  path === "/" ? pathname === "/" : pathname.startsWith(path);

export const useAppNavigation = (): AppNavigation => {
  const navigate = useNavigate();
  const openOverlay = useStore((s) => s.openOverlay);

  return useMemo(() => {
    const destination = (
      id: string,
      label: string,
      description: string,
      icon: LucideIcon,
      path: string,
    ): AppNavigationItem => ({
      id,
      label,
      description,
      icon,
      path,
      run: () => navigate(path),
    });

    return {
      destinations: [
        destination(
          "dashboard",
          "Dashboard",
          "Your library at a glance",
          LayoutDashboard,
          "/",
        ),
        destination(
          "manuscripts",
          "Manuscripts",
          "Lyrics, hymns and sermons",
          FileText,
          "/manuscripts",
        ),
        destination(
          "bible",
          "Bible",
          "Read and project scripture",
          BookOpen,
          "/bible",
        ),
        destination(
          "images",
          "Images",
          "Your image library",
          ImageIcon,
          "/images",
        ),
        destination("videos", "Videos", "Your video library", Film, "/videos"),
        destination(
          "stream",
          "Stream",
          "Cameras and live projection",
          Radio,
          "/stream",
        ),
      ],
      actions: [
        {
          id: "about",
          label: "About & Help",
          description: "FAQs and how everything works",
          icon: HelpCircle,
          run: () => openOverlay("about"),
        },
        {
          id: "assets",
          label: "Asset library",
          description: "Backgrounds, colors and sounds",
          icon: ImageIcon,
          run: () => openOverlay("assets"),
        },
        {
          id: "themes",
          label: "Manage themes",
          description: "Fonts, colors, backgrounds",
          icon: Palette,
          path: THEMES_PATH,
          run: () => navigate(THEMES_PATH),
        },
        {
          id: "shortcuts",
          label: "Keyboard shortcuts",
          description: "Every key the studio listens for",
          icon: Keyboard,
          run: () => openOverlay("shortcuts"),
        },
        {
          id: "settings",
          label: "Settings",
          description: "Playback, storage and backups",
          icon: Settings,
          run: () => openOverlay("settings"),
        },
      ],
    };
  }, [navigate, openOverlay]);
};

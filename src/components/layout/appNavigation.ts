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
import routes from "../../routes";

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
          routes.dashboard(),
        ),
        destination(
          "manuscripts",
          "Manuscripts",
          "Lyrics, hymns and sermons",
          FileText,
          routes.manuscripts(),
        ),
        destination(
          "bible",
          "Bible",
          "Read and project scripture",
          BookOpen,
          routes.bible(),
        ),
        destination(
          "images",
          "Images",
          "Your image library",
          ImageIcon,
          routes.images(),
        ),
        destination(
          "videos",
          "Videos",
          "Your video library",
          Film,
          routes.videos(),
        ),
        destination(
          "stream",
          "Stream",
          "Cameras and live projection",
          Radio,
          routes.stream(),
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
          path: routes.themes(),
          run: () => navigate(routes.themes()),
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

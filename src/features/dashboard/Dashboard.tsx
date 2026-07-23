import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useDashboardData } from "./useDashboardData";
import { GreetingHeader } from "./components/GreetingHeader";
import { StatsGrid } from "./components/StatsGrid";
import { StorageCard } from "./components/StorageCard";
import { QuickActions } from "./components/QuickActions";
import { RecentActivities } from "./components/RecentActivities";
import { SongsByCategory } from "./components/SongsByCategory";
import { MostUsedArtifacts } from "./components/MostUsedArtifacts";

export function Dashboard() {
  useDocumentTitle("Dashboard · WorshipStudio");
  const {
    greeting,
    counts,
    songsByCategory,
    largestCategoryCount,
    mostUsed,
    activities,
    storage,
  } = useDashboardData();

  const showStorage =
    storage && (storage.level !== "ok" || storage.backend !== "indexeddb");

  return (
    <div
      style={{
        padding: "clamp(18px,4vw,32px) clamp(14px,4vw,36px)",
        maxWidth: 1240,
        margin: "0 auto",
      }}
    >
      <GreetingHeader
        label={greeting.label}
        heading={greeting.heading}
        tag={greeting.tag}
      />

      <StatsGrid counts={counts} />

      {showStorage && <StorageCard storage={storage} />}

      <QuickActions />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 16,
        }}
      >
        <RecentActivities activities={activities} />

        <div style={{ display: "grid", gap: 16 }}>
          <SongsByCategory
            data={songsByCategory}
            largest={largestCategoryCount}
          />
          <MostUsedArtifacts mostUsed={mostUsed} />
        </div>
      </div>
    </div>
  );
}

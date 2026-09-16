import type { ReactNode } from "react";

export const LobbyActions = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      marginTop: 16,
      display: "flex",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "center",
    }}
  >
    {children}
  </div>
);

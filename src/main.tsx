import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import App from "./App";
import { UIThemeProvider } from "./theme/ThemeProvider";
import "./fonts";
import "./index.css";
import "./pwa";
import clearEverything from "./lib/clearEverything";

const bootstrap = async () => {
  const params = new URLSearchParams(window.location.search);

  if (params.has("reset")) {
    await clearEverything();
  }

  const router = createBrowserRouter([{ path: "*", element: <App /> }]);

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <UIThemeProvider>
        <RouterProvider router={router} />
      </UIThemeProvider>
    </React.StrictMode>,
  );
};

void bootstrap();

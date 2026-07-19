import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { UIThemeProvider } from "./theme/ThemeProvider";
import "./fonts";
import "./index.css";
import "./pwa";
import clearEverything from "./lib/clearEverything";

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);

  if (params.has("reset")) {
    await clearEverything();
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <UIThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </UIThemeProvider>
    </React.StrictMode>,
  );
}

void bootstrap();

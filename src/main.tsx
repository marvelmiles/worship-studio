import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
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

  /**
   * A single catch-all route: the screens stay declared in <App />, and the
   * data router underneath is what lets an editor block a navigation it isn't
   * ready for, the browser's Back and Forward buttons included. Built after the
   * reset above so it never starts listening to a history it is about to lose.
   */
  const router = createBrowserRouter([{ path: "*", element: <App /> }]);

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <UIThemeProvider>
        <RouterProvider router={router} />
      </UIThemeProvider>
    </React.StrictMode>,
  );
}

void bootstrap();

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./fonts";
import "./index.css";
import "./pwa";
import clearEverything from "./lib/clearEverything";

const params = new URLSearchParams(window.location.search);

if (params.has("reset")) {
  await clearEverything();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

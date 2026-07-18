import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./fonts";
import "./index.css";
import "./pwa";
import clearEverything from "./lib/clearEverything";

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);

  if (params.has("reset")) {
    await clearEverything();
  }

  // go through the entire project and do the follwoing

  // * restructure sentence or paragraphs not to use "— ", make sentenace/paragraphy human like, simple and understandable by anyone
  // * work on all the project logics and simplify things, use human readable/understandable friendly variable and function name.  rename things or restructure things to make the data flow even more obvious and easier to understand and maintain
  // * for every pending or loading state show a loading spinner rather than text example something like "saving..."
  // * if multiple assets are been uploaded show a ui on each item to indicate what has been uploaded, what is currently uploading and item left to be uploaded so the user have a visually feel upload is in progress
  // * for empty state show a ui design that fit the empty state it represent with  realistic icons or image. dont use just text to indicate empty state
  // * remove every comment in the project except technical or important comments for a particular logic or function. make comment short,simple,straightforward, human like understandable by anyone
  // * redesign the project theme to a different color and theme that is lovely, modern not neccessarily have to use gradient and also i don't generic themes that make it obvious it is ai generated. generic themes like themes used by default from other popular ai agents.
  // * redesign the app logo to something unique that capture what the project is now

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}

void bootstrap();

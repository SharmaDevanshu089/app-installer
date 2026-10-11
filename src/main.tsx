import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { setupClientLogger } from "./clientLogger";

// Initialize global logging across all unhandled errors, rejections, and console calls
setupClientLogger();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

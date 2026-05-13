import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { RecourseProvider } from "./state/recourse";
import { CANONICAL_CASE } from "./data/mockCase";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RecourseProvider initialCase={CANONICAL_CASE}>
      <App />
    </RecourseProvider>
  </StrictMode>
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { RecourseProvider } from "./state/recourse";
import { CANONICAL_CASE } from "./data/mockCase";
import { SURPRISE_BILL_CASE } from "./data/surpriseBillCase";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RecourseProvider cases={[CANONICAL_CASE, SURPRISE_BILL_CASE]}>
      <App />
    </RecourseProvider>
  </StrictMode>
);

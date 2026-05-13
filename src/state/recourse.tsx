import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Case } from "@/types";

export type FlowStage = "landing" | "scanning" | "extracted" | "strategy" | "draft";

interface RecourseState {
  activeCase: Case;
  stage: FlowStage;
  setStage: (s: FlowStage) => void;
  /** Which entity is hover-focused — drives the scan-anchor overlay */
  focusedEntityId: string | null;
  setFocusedEntityId: (id: string | null) => void;
  /** Reset the demo back to the landing — used by the "see it again" button */
  reset: () => void;
}

const Ctx = createContext<RecourseState | null>(null);

export function RecourseProvider({
  children,
  initialCase,
}: {
  children: ReactNode;
  initialCase: Case;
}) {
  const [stage, setStage] = useState<FlowStage>("landing");
  const [focusedEntityId, setFocusedEntityId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStage("landing");
    setFocusedEntityId(null);
  }, []);

  const value = useMemo<RecourseState>(
    () => ({
      activeCase: initialCase,
      stage,
      setStage,
      focusedEntityId,
      setFocusedEntityId,
      reset,
    }),
    [initialCase, stage, focusedEntityId, reset]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecourse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRecourse must be used within RecourseProvider");
  return ctx;
}

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Case } from "@/types";

export type FlowStage = "landing" | "scanning" | "extracted" | "strategy" | "draft";

interface RecourseState {
  /** All cases the provider was configured with */
  cases: Case[];
  /** The case the user is currently working through */
  activeCase: Case;
  /** Switch to a different case — resets stage and focus */
  setActiveCase: (id: string) => void;
  stage: FlowStage;
  setStage: (s: FlowStage) => void;
  /** Which entity is hover-focused — drives the scan-anchor overlay */
  focusedEntityId: string | null;
  setFocusedEntityId: (id: string | null) => void;
  /** Reset to landing without changing the active case */
  reset: () => void;
}

const Ctx = createContext<RecourseState | null>(null);

export function RecourseProvider({
  children,
  cases,
}: {
  children: ReactNode;
  /** One or more cases. The first is active by default. */
  cases: Case[];
}) {
  if (cases.length === 0) {
    throw new Error("RecourseProvider requires at least one case");
  }

  const [activeCaseId, setActiveCaseId] = useState<string>(cases[0].id);
  const [stage, setStage] = useState<FlowStage>("landing");
  const [focusedEntityId, setFocusedEntityId] = useState<string | null>(null);

  const activeCase = useMemo(
    () => cases.find((c) => c.id === activeCaseId) ?? cases[0],
    [cases, activeCaseId]
  );

  const setActiveCase = useCallback((id: string) => {
    setActiveCaseId(id);
    setStage("landing");
    setFocusedEntityId(null);
  }, []);

  const reset = useCallback(() => {
    setStage("landing");
    setFocusedEntityId(null);
  }, []);

  const value = useMemo<RecourseState>(
    () => ({
      cases,
      activeCase,
      setActiveCase,
      stage,
      setStage,
      focusedEntityId,
      setFocusedEntityId,
      reset,
    }),
    [cases, activeCase, setActiveCase, stage, focusedEntityId, reset]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecourse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRecourse must be used within RecourseProvider");
  return ctx;
}

import type { FlagKind } from "@/types";
import { cn } from "@/lib/cn";

const FLAG_META: Record<FlagKind, { label: string; tone: "fabricated" | "warn" | "info" }> = {
  fabricated: { label: "Made up", tone: "fabricated" },
  stale_statute: { label: "Outdated cite", tone: "fabricated" },
  user_dependent: { label: "Your facts", tone: "warn" },
  jurisdiction_unknown: { label: "State unknown", tone: "warn" },
  policy_specific: { label: "Plan-specific", tone: "info" },
};

/**
 * Flags name the failure mode in plain words. "Made up" is the cross-hatch
 * pattern — same primitive as Sentinel uses for hallucinations, same
 * accessibility property (works for color-blind users).
 */
export function FlagBadge({ kind }: { kind: FlagKind }) {
  const meta = FLAG_META[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border",
        meta.tone === "fabricated" &&
          "text-fabricated border-fabricated/50 bg-hatch-fabricated",
        meta.tone === "warn" && "text-verify border-verify/40 bg-verify/5",
        meta.tone === "info" && "text-info border-info/40 bg-info/5"
      )}
    >
      {meta.label}
    </span>
  );
}

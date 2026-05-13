import { Clock } from "lucide-react";
import type { Deadline } from "@/types";
import { daysUntil, shortDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Renders the cadence engine in human terms. The countdown isn't a UI
 * flourish — it's the product. The institution's win condition is the
 * user missing this date; the AI's win condition is never missing it.
 */
export function DeadlineMeter({ deadline }: { deadline: Deadline }) {
  const days = daysUntil(deadline.dueAt);
  const urgency = days < 0 ? "missed" : days < 14 ? "hot" : days < 45 ? "warm" : "cool";

  const consequenceText: Record<Deadline["consequence"], string> = {
    missed_appeal: "If you miss this, the appeal is closed — no second chance.",
    right_lost: "If you miss this, you lose the right to ask for this.",
    second_window_opens: "A new window opens here — separate deadline.",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border p-3 transition-colors",
        urgency === "missed" && "border-fabricated/50 bg-fabricated/10",
        urgency === "hot" && "border-ember/50 bg-ember/10",
        urgency === "warm" && "border-verify/40 bg-verify/5",
        urgency === "cool" && "border-border bg-surface-1"
      )}
    >
      <Clock
        className={cn(
          "h-4 w-4 mt-0.5 flex-none",
          urgency === "missed" && "text-fabricated",
          urgency === "hot" && "text-ember",
          urgency === "warm" && "text-verify",
          urgency === "cool" && "text-fg-muted"
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-xs font-medium text-fg">{deadline.label}</div>
          <div
            className={cn(
              "text-[11px] tabular-nums",
              urgency === "missed" && "text-fabricated font-semibold",
              urgency === "hot" && "text-ember font-semibold",
              urgency === "warm" && "text-verify",
              urgency === "cool" && "text-fg-muted"
            )}
          >
            {urgency === "missed"
              ? `${Math.abs(days)} days past`
              : `${days} days · ${shortDate(deadline.dueAt)}`}
          </div>
        </div>
        <div className="mt-1 text-[11px] text-fg-muted leading-snug">
          {consequenceText[deadline.consequence]}
        </div>
      </div>
    </div>
  );
}

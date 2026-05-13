import { Check, AlertCircle, UserRound } from "lucide-react";
import type { ConfidenceLabel as Label } from "@/types";
import { cn } from "@/lib/cn";

const CONFIG: Record<
  Label,
  {
    text: string;
    sub: string;
    Icon: React.ComponentType<{ className?: string }>;
    cls: string;
  }
> = {
  settled: {
    text: "Settled",
    sub: "Statute confirmed · math checks out",
    Icon: Check,
    cls: "text-settled border-settled/40 bg-settled/10",
  },
  verify: {
    text: "You verify",
    sub: "Depends on facts only you know",
    Icon: AlertCircle,
    cls: "text-verify border-verify/40 bg-verify/10",
  },
  lawyer: {
    text: "Ask a lawyer",
    sub: "Beyond what AI should claim alone",
    Icon: UserRound,
    cls: "text-lawyer border-lawyer/40 bg-lawyer/10",
  },
};

/**
 * Recourse's calibrated confidence — flipped for non-experts.
 *
 * Sentinel says "Likely / Unsure / Low" because its reader is an expert
 * deciding whether to trust the AI. Recourse's reader is the patient,
 * who can't judge a percentage. So we give them an action verb instead:
 * "You verify" tells them what to do; "Ask a lawyer" tells them where
 * the AI's competence ends.
 */
export function ConfidenceLabel({
  label,
  size = "md",
}: {
  label: Label;
  size?: "sm" | "md";
}) {
  const cfg = CONFIG[label];
  const Icon = cfg.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium",
        cfg.cls,
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
      )}
      title={cfg.sub}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      {cfg.text}
    </span>
  );
}

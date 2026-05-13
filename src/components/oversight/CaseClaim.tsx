import { Lightbulb } from "lucide-react";
import type { CaseClaim as CaseClaimType } from "@/types";
import { ConfidenceLabel } from "@/components/primitives/ConfidenceLabel";
import { StatuteChip } from "@/components/primitives/StatuteChip";
import { FlagBadge } from "@/components/primitives/FlagBadge";
import { cn } from "@/lib/cn";

/**
 * The Recourse analogue of Sentinel's SentinelClaim — but the audience is
 * the patient, not a clinician. The verdict bar is gone (the user isn't
 * approving the AI to ship the claim; they're absorbing it). Instead we
 * lead with a plain-language gloss and end with "what you should verify."
 */
export function CaseClaim({ claim, index }: { claim: CaseClaimType; index: number }) {
  const unanchored = claim.anchors.length === 0;
  return (
    <div
      style={{ animationDelay: `${index * 90}ms` }}
      className={cn(
        "animate-fade-in-up rounded-md border border-border bg-surface-1 border-l-2 p-4 space-y-3",
        claim.confidence === "settled" && "border-l-settled/60",
        claim.confidence === "verify" && "border-l-verify/60",
        claim.confidence === "lawyer" && "border-l-lawyer/60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
          Claim {index + 1}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          <ConfidenceLabel label={claim.confidence} size="sm" />
          {claim.flags.map((f) => (
            <FlagBadge key={f} kind={f} />
          ))}
        </div>
      </div>

      {/* Plain-language gloss first — the moment the user understands */}
      {claim.plainLanguage && (
        <div className="rounded-md bg-ember/10 border border-ember/30 px-3 py-2.5 flex items-start gap-2.5">
          <Lightbulb className="h-3.5 w-3.5 text-ember mt-0.5 flex-none" />
          <div className="text-sm text-fg leading-relaxed font-medium">
            {claim.plainLanguage}
          </div>
        </div>
      )}

      {/* The technical statement second — what would go in the letter */}
      <p className="text-[13px] text-fg-muted leading-relaxed">{claim.text}</p>

      {/* Statute anchors, or the missing-source flag */}
      {unanchored ? (
        <div className="rounded-md border border-fabricated/40 bg-hatch-fabricated px-3 py-2 text-[11px] text-fabricated">
          No statute anchored to this claim — treat it as a strategy direction,
          not a legal conclusion.
        </div>
      ) : (
        <div className="space-y-1.5">
          {claim.anchors.map((a) => (
            <StatuteChip key={a.id} anchor={a} />
          ))}
        </div>
      )}

      {/* What the user has to verify themselves */}
      {claim.userVerifies && claim.userVerifies.length > 0 && (
        <div className="rounded-md border border-verify/40 bg-verify/5 px-3 py-2 text-[11px]">
          <div className="font-medium text-verify mb-1">You need to verify:</div>
          <ul className="space-y-1 text-fg-muted">
            {claim.userVerifies.map((v, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-verify mt-1">·</span>
                <span className="leading-snug">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

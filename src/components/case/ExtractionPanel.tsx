import { useRecourse } from "@/state/recourse";
import { ConfidenceLabel } from "@/components/primitives/ConfidenceLabel";
import { FlagBadge } from "@/components/primitives/FlagBadge";
import { cn } from "@/lib/cn";

/**
 * The right rail during the "extracted" stage — the AI's read of the
 * document, item by item. Hovering a row lights up the bounding box on
 * the EOB; hovering a bounding box lights up the row. That bidirectional
 * link is the credibility moment: the AI's claims are pinned to the page.
 */
export function ExtractionPanel() {
  const { activeCase, focusedEntityId, setFocusedEntityId } = useRecourse();
  const entities = activeCase.extracted;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold mb-1">
          What I pulled off the EOB
        </div>
        <p className="text-[11px] text-fg-muted leading-relaxed">
          Each row is pinned to a region of the document. Hover to see where
          on the page the AI read it from.
        </p>
      </div>

      <div className="space-y-1.5">
        {entities.map((e, i) => {
          const focused = focusedEntityId === e.id;
          return (
            <div
              key={e.id}
              onMouseEnter={() => setFocusedEntityId(e.id)}
              onMouseLeave={() => setFocusedEntityId(null)}
              style={{ animationDelay: `${i * 80}ms` }}
              className={cn(
                "animate-fade-in-up rounded-md border bg-surface-1 p-2.5 transition-colors cursor-default",
                focused
                  ? "border-ember bg-ember/5"
                  : "border-border hover:border-border-strong"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-[10px] uppercase tracking-wide text-fg-subtle">
                  {e.field}
                </div>
                <ConfidenceLabel label={e.confidence} size="sm" />
              </div>
              <div className="mt-0.5 text-xs text-fg leading-snug">{e.value}</div>
              {e.flags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {e.flags.map((f) => (
                    <FlagBadge key={f} kind={f} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

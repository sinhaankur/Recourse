import { BookOpen, ExternalLink } from "lucide-react";
import type { StatuteAnchor } from "@/types";
import { shortDate } from "@/lib/format";

/**
 * The provenance primitive. Every legal claim in Recourse anchors to a
 * real statute or regulation; the chip shows the short name + citation,
 * with the excerpt and "verified on" date one click away.
 *
 * "Verified on" is load-bearing: the AI's confidence in a statute is
 * only as fresh as the last time it checked the cite is still live.
 */
export function StatuteChip({ anchor }: { anchor: StatuteAnchor }) {
  return (
    <details className="group rounded-md border border-border bg-surface-1 transition-colors hover:border-border-strong">
      <summary className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-[11px] list-none">
        <BookOpen className="h-3 w-3 text-info" />
        <span className="font-medium text-fg">{anchor.shortName}</span>
        <span className="font-mono text-fg-muted">{anchor.citation}</span>
        <span className="ml-auto text-fg-subtle group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      <div className="border-t border-border px-3 py-2.5 text-[11px] text-fg-muted">
        <blockquote className="border-l-2 border-info/40 pl-3 italic leading-relaxed">
          "{anchor.excerpt}"
        </blockquote>
        <div className="mt-2 flex items-center justify-between text-[10px] text-fg-subtle">
          <span>Verified {shortDate(anchor.verifiedOn)}</span>
          {anchor.url && (
            <a
              href={anchor.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-info"
            >
              source <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </details>
  );
}

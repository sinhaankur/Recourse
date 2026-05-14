import { useRecourse } from "@/state/recourse";
import { usd, shortDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ExtractedEntity } from "@/types";

/**
 * The scanned-document substrate. Renders a believable insurance EOB or
 * provider bill as a static "paper" surface, then overlays the AI's
 * extraction targets — bounding boxes the focused entity lights up.
 *
 * The renderer is data-driven via `activeCase.paperMeta` so it can show
 * an Explanation of Benefits, a hospital statement, or any other
 * document genre without per-case code.
 *
 * Nothing here actually OCRs anything. The point is to make the moment
 * concrete: a real reviewer scrolling the portfolio recognizes the
 * document shape and watches the AI pull the right fields off it.
 */
export function EOBPaper({
  entities,
  highlight,
  scanning,
}: {
  entities: ExtractedEntity[];
  highlight: boolean;
  scanning: boolean;
}) {
  const { activeCase, focusedEntityId, setFocusedEntityId } = useRecourse();
  const m = activeCase.paperMeta;
  const showAllowed = !m.hideAllowedColumn;
  const columnTemplate = showAllowed
    ? "grid-cols-[1fr_auto_auto_auto_auto]"
    : "grid-cols-[1fr_auto_auto_auto]";

  return (
    <div className="relative">
      <div className="bg-paper text-paper-ink rounded-md shadow-xl ring-1 ring-black/10 overflow-hidden aspect-[8.5/11] relative">
        {/* Letterhead */}
        <div className="px-8 pt-7 pb-4 border-b border-paper">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-paper-ink-muted font-semibold">
                {m.organizationLine}
              </div>
              <div className="font-display text-2xl font-semibold mt-1 tracking-tight">
                {activeCase.documentTitle}
              </div>
              <div className="text-[11px] text-paper-ink-muted mt-0.5 font-mono">
                {m.referenceId} · Statement date {shortDate(activeCase.receivedAt)}
              </div>
            </div>
            {(m.cornerLabel || m.cornerSubtitle) && (
              <div className="text-right text-[10px] text-paper-ink-muted leading-tight">
                {m.cornerLabel && (
                  <div className="font-semibold uppercase tracking-wider">
                    {m.cornerLabel}
                  </div>
                )}
                {m.cornerSubtitle && <div>{m.cornerSubtitle}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Subject block */}
        <div className="px-8 py-3 border-b border-paper grid grid-cols-2 gap-x-8 gap-y-1 text-[11px]">
          {m.subjectRows.flatMap(([label, value], i) => [
            <div key={`l-${i}`} className="text-paper-ink-muted">
              {label}
            </div>,
            <div key={`v-${i}`} className="font-mono">
              {value}
            </div>,
          ])}
        </div>

        {/* Charge table */}
        <div className="px-8 py-4 text-[11px]">
          <div
            className={cn(
              "grid gap-x-4 text-[10px] uppercase tracking-wide text-paper-ink-muted border-b border-paper pb-1.5",
              columnTemplate
            )}
          >
            <div>{m.columnLabels.description}</div>
            <div className="text-right">{m.columnLabels.col1}</div>
            {showAllowed && <div className="text-right">{m.columnLabels.col2}</div>}
            <div className="text-right">{m.columnLabels.col3}</div>
            <div className="text-right">{m.columnLabels.col4}</div>
          </div>
          {activeCase.billLines.map((ln, i) => {
            const isLast = i === activeCase.billLines.length - 1;
            return (
              <div
                key={ln.id}
                className={cn(
                  "grid gap-x-4 py-1.5 border-b border-paper/60 last:border-b-0 font-mono",
                  columnTemplate,
                  isLast && "font-semibold pt-2.5"
                )}
              >
                <div className="leading-tight">
                  <div>{ln.description}</div>
                  <div className="text-[10px] text-paper-ink-muted">
                    {ln.cptCode !== "—" && `${ln.cptCode} · `}
                    {ln.dateOfService}
                    {ln.denialReason && (
                      <span className="text-red-700 ml-2">
                        {ln.denialReason.code} · {ln.denialReason.text}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">{ln.billed ? usd(ln.billed) : "—"}</div>
                {showAllowed && (
                  <div className="text-right">{ln.allowed ? usd(ln.allowed) : "—"}</div>
                )}
                <div className="text-right">{ln.paid ? usd(ln.paid) : "—"}</div>
                <div className="text-right">
                  {ln.patientResponsibility ? usd(ln.patientResponsibility) : "—"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer notice */}
        <div className="px-8 py-3 border-t border-paper text-[10px] text-paper-ink-muted leading-relaxed">
          <span className="font-semibold text-paper-ink">{m.footerHeadline}</span>{" "}
          {m.footerBody}
        </div>

        {/* Scan sweep overlay */}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-ember/40 to-transparent animate-scan-sweep" />
          </div>
        )}

        {/* Entity highlights */}
        {highlight &&
          entities.map((e) => {
            const isFocused = focusedEntityId === e.id;
            return (
              <button
                key={e.id}
                onMouseEnter={() => setFocusedEntityId(e.id)}
                onMouseLeave={() => setFocusedEntityId(null)}
                onFocus={() => setFocusedEntityId(e.id)}
                onBlur={() => setFocusedEntityId(null)}
                style={{
                  left: `${e.bbox.x}%`,
                  top: `${e.bbox.y}%`,
                  width: `${e.bbox.w}%`,
                  height: `${e.bbox.h}%`,
                }}
                className={cn(
                  "absolute rounded-sm border-2 transition-all cursor-pointer",
                  isFocused
                    ? "border-ember bg-ember/15 ring-4 ring-ember/20"
                    : "border-ember/50 bg-ember/5 hover:border-ember hover:bg-ember/10"
                )}
                aria-label={`${e.field}: ${e.value}`}
              />
            );
          })}
      </div>

      {highlight && (
        <div className="mt-3 text-[11px] text-fg-subtle text-center">
          Hover the boxes to see what was extracted.
        </div>
      )}
    </div>
  );
}

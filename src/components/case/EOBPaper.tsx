import { useRecourse } from "@/state/recourse";
import { usd, shortDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ExtractedEntity } from "@/types";

/**
 * The scanned-EOB substrate. Renders a believable insurance Explanation
 * of Benefits as a static "paper" surface, then overlays the AI's
 * extraction targets — bounding boxes the focused entity lights up.
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

  return (
    <div className="relative">
      <div className="bg-paper text-paper-ink rounded-md shadow-xl ring-1 ring-black/10 overflow-hidden aspect-[8.5/11] relative">
        {/* Letterhead */}
        <div className="px-8 pt-7 pb-4 border-b border-paper">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-paper-ink-muted font-semibold">
                Northshore Health · Member Services
              </div>
              <div className="font-display text-2xl font-semibold mt-1 tracking-tight">
                Explanation of Benefits
              </div>
              <div className="text-[11px] text-paper-ink-muted mt-0.5 font-mono">
                Claim # N-4218-A · Statement date {shortDate(activeCase.receivedAt)}
              </div>
            </div>
            <div className="text-right text-[10px] text-paper-ink-muted leading-tight">
              <div className="font-semibold uppercase tracking-wider">
                Not a bill
              </div>
              <div>For your records.</div>
            </div>
          </div>
        </div>

        {/* Subject block */}
        <div className="px-8 py-3 border-b border-paper grid grid-cols-2 gap-x-8 gap-y-1 text-[11px]">
          <div className="text-paper-ink-muted">Member</div>
          <div className="font-mono">M.R. ····7421</div>
          <div className="text-paper-ink-muted">Plan</div>
          <div className="font-mono">Self-funded ERISA group plan</div>
          <div className="text-paper-ink-muted">Provider</div>
          <div className="font-mono">Dr. Sara Levin, LCSW (OON)</div>
          <div className="text-paper-ink-muted">Service period</div>
          <div className="font-mono">Feb 4 – Apr 29, 2026 · 14 visits</div>
        </div>

        {/* Charge table */}
        <div className="px-8 py-4 text-[11px]">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 text-[10px] uppercase tracking-wide text-paper-ink-muted border-b border-paper pb-1.5">
            <div>Service · CPT</div>
            <div className="text-right">Billed</div>
            <div className="text-right">Allowed</div>
            <div className="text-right">Plan paid</div>
            <div className="text-right">You owe</div>
          </div>
          {activeCase.billLines.map((ln) => (
            <div
              key={ln.id}
              className={cn(
                "grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 py-1.5 border-b border-paper/60 last:border-b-0 font-mono",
                ln.id === "ln-5" && "font-semibold pt-2.5"
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
              <div className="text-right">{ln.allowed ? usd(ln.allowed) : "—"}</div>
              <div className="text-right">{ln.paid ? usd(ln.paid) : "—"}</div>
              <div className="text-right">
                {ln.patientResponsibility ? usd(ln.patientResponsibility) : "—"}
              </div>
            </div>
          ))}
        </div>

        {/* Appeal notice */}
        <div className="px-8 py-3 border-t border-paper text-[10px] text-paper-ink-muted leading-relaxed">
          <span className="font-semibold text-paper-ink">Appeal rights.</span>{" "}
          You may request an internal appeal of this determination within
          180 days. Submit appeals to Northshore Health, Appeals Department,
          PO Box ····, by certified mail or via the member portal. Internal
          appeal must be filed by{" "}
          <span className="font-mono">Aug 6, 2026</span>. You may also
          request the criteria used to make this determination.
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

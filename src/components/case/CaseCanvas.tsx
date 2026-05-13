import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { useRecourse, type FlowStage } from "@/state/recourse";
import { EOBPaper } from "./EOBPaper";
import { ExtractionPanel } from "./ExtractionPanel";
import { CaseClaim } from "@/components/oversight/CaseClaim";
import { DeadlineMeter } from "@/components/primitives/DeadlineMeter";
import { DraftPreview } from "@/components/oversight/DraftPreview";
import { cn } from "@/lib/cn";

/**
 * The post-landing canvas. Drives a 4-stage progression — scanning →
 * extracted → strategy → draft — that the user steps through with one
 * button. Each stage adds context next to a persistent EOB on the left,
 * so the document never leaves view. The institution's letter and the
 * user's response are always co-visible.
 */
export function CaseCanvas() {
  const { activeCase, stage, setStage, reset } = useRecourse();

  const stages: FlowStage[] = ["scanning", "extracted", "strategy", "draft"];
  const idx = stages.indexOf(stage);
  const next = stages[idx + 1];
  const prev = stages[idx - 1];

  return (
    <div className="min-h-screen flex flex-col">
      <ProgressBar current={stage} />

      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-8 items-start">
        {/* Left — the EOB document, always present */}
        <div className="lg:sticky lg:top-6">
          <EOBPaper
            entities={activeCase.extracted}
            highlight={stage !== "scanning"}
            scanning={stage === "scanning"}
          />
        </div>

        {/* Right — the changing context panel */}
        <div className="min-w-0">
          {stage === "scanning" && <ScanningPanel />}
          {stage === "extracted" && <ExtractionPanel />}
          {stage === "strategy" && <StrategyPanel />}
          {stage === "draft" && <DraftPreview />}
        </div>
      </main>

      {/* Footer rail */}
      <footer className="border-t border-border bg-canvas/95 backdrop-blur sticky bottom-0">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted hover:text-fg"
          >
            <RefreshCw className="h-3 w-3" />
            Restart the demo
          </button>

          <div className="flex items-center gap-2">
            {prev && (
              <button
                onClick={() => setStage(prev)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-[12px] text-fg-muted hover:bg-surface-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            {next && (
              <button
                onClick={() => setStage(next)}
                className="inline-flex items-center gap-1.5 rounded-md bg-ember px-3 py-1.5 text-[12px] font-medium text-canvas hover:bg-ember/90"
              >
                {STAGE_CTA[next]}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

const STAGE_CTA: Record<FlowStage, string> = {
  landing: "Start",
  scanning: "Scanning…",
  extracted: "See the extraction",
  strategy: "Show me the strategy",
  draft: "Show me the letter",
};

function ProgressBar({ current }: { current: FlowStage }) {
  const steps: { id: FlowStage; label: string }[] = [
    { id: "scanning", label: "Scan" },
    { id: "extracted", label: "Extract" },
    { id: "strategy", label: "Strategy" },
    { id: "draft", label: "Draft" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <div className="border-b border-border bg-canvas/95 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-6 py-2.5 flex items-center gap-2">
        {steps.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold",
                  active && "text-ember bg-ember/10 border border-ember/30",
                  done && "text-settled",
                  !active && !done && "text-fg-subtle"
                )}
              >
                <span className="tabular-nums">{i + 1}</span>
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px w-6",
                    done ? "bg-settled/60" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScanningPanel() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold mb-1">
          Reading the document
        </div>
        <p className="text-sm text-fg-muted leading-relaxed">
          Vision model is pulling structured fields off the EOB. In a real
          run this takes ~3 seconds and returns confidence per field. We're
          faking the time but the fields it finds are the ones a real model
          would.
        </p>
      </div>
      <div className="space-y-2">
        {["Letterhead · payer identity", "Claim ID · service period", "Denial codes · CO-50", "Appeal deadline · 90 days", "Plan type · ERISA"].map(
          (label, i) => (
            <div
              key={label}
              style={{ animationDelay: `${i * 220}ms` }}
              className="animate-fade-in-up flex items-center gap-2.5 rounded-md border border-border bg-surface-1 px-3 py-2 text-[12px]"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse-soft" />
              <span className="text-fg-muted">{label}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function StrategyPanel() {
  const { activeCase } = useRecourse();
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold mb-1">
          The fight, in claims
        </div>
        <p className="text-[11px] text-fg-muted leading-relaxed">
          Four claims the AI is making about your case. The first label tells
          you what kind of trust to extend each one — and what to verify yourself.
        </p>
      </div>

      <div className="space-y-3">
        {activeCase.claims.map((c, i) => (
          <CaseClaim key={c.id} claim={c} index={i} />
        ))}
      </div>

      <div className="pt-4 border-t border-border">
        <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold mb-2">
          Cadence engine · the deadlines that decide the case
        </div>
        <div className="space-y-2">
          {activeCase.deadlines.map((d) => (
            <DeadlineMeter key={d.id} deadline={d} />
          ))}
        </div>
      </div>
    </div>
  );
}

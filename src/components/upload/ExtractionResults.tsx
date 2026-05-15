import { AlertCircle, Loader2, Sparkles, X, FileWarning, RefreshCw } from "lucide-react";
import { useRecourse } from "@/state/recourse";
import { ConfidenceLabel } from "@/components/primitives/ConfidenceLabel";
import { cn } from "@/lib/cn";

/**
 * Renders the extraction state as a panel on the right side of the upload
 * flow. Four visual states correspond to extractionStatus:
 *
 *   ready / idle  → "Click Extract" prompt
 *   extracting    → loader + streaming text
 *   done          → structured results panel
 *   failed        → error message + raw model output (debug aid)
 */
export function ExtractionResults() {
  const { uploadedDoc, runExtraction, cancelExtraction, ollamaStatus, selectedModel } =
    useRecourse();

  if (!uploadedDoc) return null;
  const { extractionStatus, extraction, streamingText, extractionError, rawResponse, durationMs } =
    uploadedDoc;

  if (extractionStatus === "ready" || extractionStatus === "rendering") {
    return (
      <Panel>
        <PanelHeader title="Ready to extract" />
        <p className="text-[12px] text-fg-muted leading-relaxed">
          The document is rendered and waiting. Click Extract to send it to{" "}
          <span className="font-mono text-fg">{selectedModel ?? "your model"}</span>{" "}
          running locally on your machine.
        </p>
        <button
          onClick={runExtraction}
          disabled={ollamaStatus !== "ready" || extractionStatus === "rendering"}
          className={cn(
            "mt-2 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-medium",
            ollamaStatus === "ready" && extractionStatus !== "rendering"
              ? "bg-ember text-canvas hover:bg-ember/90"
              : "bg-surface-2 text-fg-subtle cursor-not-allowed"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Extract
        </button>
      </Panel>
    );
  }

  if (extractionStatus === "extracting") {
    return (
      <Panel>
        <div className="flex items-center justify-between">
          <PanelHeader title="Reading the document" sub="Streaming response from your local model" />
          <button
            onClick={cancelExtraction}
            className="inline-flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ember">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {streamingText ? `${streamingText.length} chars received` : "Waiting for first token…"}
        </div>
        {streamingText && (
          <pre className="max-h-72 overflow-auto rounded-md border border-border bg-surface-2 px-3 py-2 text-[10.5px] font-mono text-fg-muted whitespace-pre-wrap leading-relaxed">
            {streamingText}
          </pre>
        )}
      </Panel>
    );
  }

  if (extractionStatus === "failed") {
    return (
      <Panel>
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-fabricated mt-0.5 flex-none" />
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-fabricated">
              Extraction failed
            </div>
            <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
              {extractionError ?? "Unknown error"}
            </p>
          </div>
        </div>
        {rawResponse && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-fg-subtle mb-1 flex items-center gap-1.5">
              <FileWarning className="h-3 w-3" />
              Raw model output
            </div>
            <pre className="max-h-72 overflow-auto rounded-md border border-border bg-surface-2 px-3 py-2 text-[10.5px] font-mono text-fg-muted whitespace-pre-wrap leading-relaxed">
              {rawResponse}
            </pre>
          </div>
        )}
        <button
          onClick={runExtraction}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-[12px] text-fg hover:bg-surface-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      </Panel>
    );
  }

  // done
  return (
    <Panel>
      <PanelHeader
        title={`Extracted in ${durationMs ? (durationMs / 1000).toFixed(1) : "—"}s`}
        sub={extraction?.documentKind ? `Document kind: ${extraction.documentKind}` : undefined}
      />

      {!extraction || extraction.fields.length === 0 ? (
        <p className="text-[12px] text-fg-muted">
          The model returned no fields. The document may be too low-resolution
          or in an unexpected layout.
        </p>
      ) : (
        <div className="space-y-1.5">
          {extraction.fields.map((f, i) => (
            <div
              key={`${f.field}-${i}`}
              className="rounded-md border border-border bg-surface-1 p-2.5 animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-[10px] uppercase tracking-wide text-fg-subtle">
                  {f.field}
                </div>
                <ConfidenceLabel label={f.confidence} size="sm" />
              </div>
              <div className="mt-0.5 text-xs text-fg leading-snug">{f.value}</div>
              {f.reasoning && (
                <div className="mt-1 text-[10.5px] text-fg-muted leading-snug italic">
                  {f.reasoning}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-3 mt-2 text-[10.5px] text-fg-subtle leading-snug">
        These are raw extractions from a local vision model. They have not
        been mapped to legal claims or a playbook — that's intentional. A
        7B model isn't reliable enough to cite real statute. The canonical
        cases on the landing show what the next stages would look like.
      </div>

      <button
        onClick={runExtraction}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-[12px] text-fg-muted hover:bg-surface-2 hover:text-fg"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Run extraction again
      </button>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-1/40 p-4 space-y-3">
      {children}
    </div>
  );
}

function PanelHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
        {title}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-fg-muted">{sub}</div>}
    </div>
  );
}

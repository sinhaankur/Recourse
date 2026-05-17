import { Check, Loader2, X, FileText, AlertCircle } from "lucide-react";
import { useRecourse } from "@/state/recourse";
import { cn } from "@/lib/cn";

/**
 * Left pane during policy-decoder mode. Renders the document as a vertical
 * stack of page thumbnails, each annotated with its analysis status. The
 * thumbnails are small intentionally — the value is "here's the whole
 * document, you can see what got analyzed and what didn't," not "here's
 * a reading viewer."
 */
export function MultipagePdfPreview() {
  const { decoder, clearDecoder } = useRecourse();
  if (!decoder) return null;
  const { file, pages, status, currentPage } = decoder;

  return (
    <div className="rounded-md border border-border bg-surface-1 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border text-[11px] bg-surface-2">
        <div className="min-w-0 flex items-center gap-2">
          <FileText className="h-3 w-3 text-fg-subtle" />
          <span className="font-mono text-fg truncate">{file.name}</span>
          <span className="text-fg-subtle">
            · {pages.length} page{pages.length === 1 ? "" : "s"}
            {pages.length > 0 && pages[0].page.pageCount > pages.length && (
              <span> of {pages[0].page.pageCount}</span>
            )}
          </span>
        </div>
        <button
          onClick={clearDecoder}
          className="rounded p-1 text-fg-muted hover:bg-surface-3 hover:text-fg"
          aria-label="Clear policy"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {status === "rendering" && pages.length === 0 && (
        <div className="px-3 py-12 text-center text-[11px] text-fg-muted">
          <Loader2 className="inline h-4 w-4 animate-spin mr-1.5" />
          Rendering pages…
        </div>
      )}

      <div className="overflow-y-auto max-h-[70vh] p-2 space-y-2">
        {pages.map((p) => {
          const isCurrent = currentPage === p.page.pageNumber;
          return (
            <div
              key={p.page.pageNumber}
              className={cn(
                "relative rounded border bg-paper transition-colors",
                isCurrent && "ring-2 ring-ember",
                p.status === "complete" && "border-settled/40",
                p.status === "failed" && "border-fabricated/40",
                p.status === "queued" && "border-border",
                p.status === "running" && "border-ember"
              )}
            >
              <img
                src={p.page.dataUrl}
                alt={`Page ${p.page.pageNumber}`}
                className="w-full h-auto rounded"
              />
              <div className="absolute top-1 left-1 inline-flex items-center gap-1 rounded bg-canvas/85 backdrop-blur px-1.5 py-0.5 text-[10px] font-mono text-fg-muted border border-border">
                p.{p.page.pageNumber}
                <StatusIcon status={p.status} />
              </div>
              {p.status === "complete" && p.annotations.length > 0 && (
                <div className="absolute top-1 right-1 rounded bg-settled/15 border border-settled/40 px-1.5 py-0 text-[9px] font-mono text-settled">
                  {p.annotations.length} found
                </div>
              )}
              {p.status === "failed" && p.error && (
                <div className="absolute top-1 right-1 rounded bg-fabricated/15 border border-fabricated/40 px-1.5 py-0 text-[9px] font-mono text-fabricated">
                  failed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: "queued" | "running" | "complete" | "failed" | "skipped" }) {
  if (status === "running")
    return <Loader2 className="h-2.5 w-2.5 animate-spin text-ember" />;
  if (status === "complete")
    return <Check className="h-2.5 w-2.5 text-settled" />;
  if (status === "failed")
    return <AlertCircle className="h-2.5 w-2.5 text-fabricated" />;
  if (status === "skipped")
    return <X className="h-2.5 w-2.5 text-fg-subtle" />;
  return null;
}

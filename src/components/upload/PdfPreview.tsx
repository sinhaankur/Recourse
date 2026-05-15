import { X, Loader2 } from "lucide-react";
import { useRecourse } from "@/state/recourse";
import { cn } from "@/lib/cn";

/**
 * Shows the rendered document with a thin chrome strip that names the
 * file, page count, and lets the user remove it.
 */
export function PdfPreview() {
  const { uploadedDoc, clearUpload } = useRecourse();
  if (!uploadedDoc) return null;
  const { file, rendered, extractionStatus } = uploadedDoc;

  return (
    <div className="rounded-md border border-border bg-surface-1 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border text-[11px] bg-surface-2">
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-mono text-fg truncate">{file.name}</span>
          {rendered.pageCount > 0 && (
            <span className="text-fg-subtle">
              · page {rendered.pageNumber} of {rendered.pageCount}
            </span>
          )}
        </div>
        <button
          onClick={clearUpload}
          className="rounded p-1 text-fg-muted hover:bg-surface-3 hover:text-fg"
          aria-label="Remove document"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        className={cn(
          "relative bg-paper p-2",
          extractionStatus === "extracting" && "ring-2 ring-ember/40"
        )}
      >
        {extractionStatus === "rendering" ? (
          <div className="aspect-[8.5/11] flex items-center justify-center text-fg-muted text-[12px]">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Rendering…
          </div>
        ) : rendered.dataUrl ? (
          <img
            src={rendered.dataUrl}
            alt="Uploaded document"
            className="w-full h-auto rounded shadow-sm"
          />
        ) : null}
        {extractionStatus === "extracting" && (
          <div className="absolute inset-2 pointer-events-none overflow-hidden rounded">
            <div className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-ember/30 to-transparent animate-scan-sweep" />
          </div>
        )}
      </div>
    </div>
  );
}

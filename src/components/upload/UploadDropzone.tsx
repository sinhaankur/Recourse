import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { useRecourse } from "@/state/recourse";
import { cn } from "@/lib/cn";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp";

/**
 * The drop zone. Accepts PDF or image files; renders the first page (or
 * the image itself) and hands it back to the provider. Disabled when
 * Ollama isn't ready so the user can't get stuck staring at a "now what"
 * screen.
 */
export function UploadDropzone() {
  const { loadFile, ollamaStatus } = useRecourse();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const disabled = ollamaStatus !== "ready";

  const onFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      loadFile(arr[0]);
    },
    [loadFile]
  );

  return (
    <button
      type="button"
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files) onFiles(e.dataTransfer.files);
      }}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg border-2 border-dashed p-10 flex flex-col items-center justify-center gap-3 transition-colors",
        disabled
          ? "border-border bg-surface-1/40 cursor-not-allowed opacity-60"
          : dragOver
          ? "border-ember bg-ember/10"
          : "border-border bg-surface-1 hover:border-border-strong hover:bg-surface-2"
      )}
    >
      <UploadCloud
        className={cn(
          "h-8 w-8",
          dragOver ? "text-ember" : "text-fg-subtle"
        )}
      />
      <div className="text-center">
        <div className="text-sm font-medium text-fg">
          {disabled ? "Start Ollama above to enable upload" : "Drop a PDF or image"}
        </div>
        <div className="mt-1 text-[11px] text-fg-muted">
          {disabled
            ? "Once Ollama is reachable, this zone activates."
            : "Or click to browse. PDF, PNG, JPG, WebP. First page only for PDFs."}
        </div>
      </div>
      <div className="text-[10px] text-fg-subtle flex items-center gap-1.5">
        <FileText className="h-2.5 w-2.5" />
        Stays on your machine — Recourse never uploads it anywhere.
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={(e) => e.target.files && onFiles(e.target.files)}
        className="sr-only"
      />
    </button>
  );
}

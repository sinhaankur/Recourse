import { ArrowLeft } from "lucide-react";
import { useRecourse } from "@/state/recourse";
import { OllamaSetupBanner } from "./OllamaSetupBanner";
import { UploadDropzone } from "./UploadDropzone";
import { PdfPreview } from "./PdfPreview";
import { ExtractionResults } from "./ExtractionResults";

/**
 * Top-level screen for the upload mode. Three-row layout:
 *
 *   1. Header with "back to landing" + mode label
 *   2. Ollama setup banner (gates everything below)
 *   3. Either the dropzone (no doc yet) OR a two-pane preview+results
 */
export function UploadFlow() {
  const { setMode, clearUpload, uploadedDoc } = useRecourse();

  const onBack = () => {
    clearUpload();
    setMode("canonical");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-canvas/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to canonical cases
          </button>
          <div className="ml-auto text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
            Upload your own · powered by local Ollama
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-6 space-y-5">
        <OllamaSetupBanner />

        {!uploadedDoc ? (
          <UploadDropzone />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-6 items-start">
            <div className="lg:sticky lg:top-20">
              <PdfPreview />
            </div>
            <div className="min-w-0">
              <ExtractionResults />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-[11px] text-fg-subtle">
        The vision call runs against your local Ollama. No cloud, no API key,
        no data leaving your machine.
      </footer>
    </div>
  );
}

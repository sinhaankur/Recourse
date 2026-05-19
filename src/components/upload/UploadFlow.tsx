import { ArrowLeft, FileScan, BookOpen } from "lucide-react";
import { useRecourse } from "@/state/recourse";
import { OllamaSetupBanner } from "./OllamaSetupBanner";
import { UploadDropzone } from "./UploadDropzone";
import { PdfPreview } from "./PdfPreview";
import { ExtractionResults } from "./ExtractionResults";
import { MultipagePdfPreview } from "./MultipagePdfPreview";
import { PolicyDecoderResults } from "./PolicyDecoderResults";
import { cn } from "@/lib/cn";

/**
 * Top-level screen for upload mode. The task toggle at the top determines
 * which sub-flow the user is in:
 *
 *   Denial letter → single-page extraction. PdfPreview + ExtractionResults.
 *   Decoder       → multi-page policy analysis. MultipagePdfPreview +
 *                     PolicyDecoderResults.
 *
 * The same Ollama setup banner gates both — they share the daemon + model
 * picker.
 */
export function UploadFlow() {
  const {
    setMode,
    clearUpload,
    clearDecoder,
    uploadedDoc,
    decoder,
    uploadTask,
    setUploadTask,
  } = useRecourse();

  const onBack = () => {
    clearUpload();
    clearDecoder();
    setMode("canonical");
  };

  const switchTask = (t: "denial" | "decoder") => {
    if (t === uploadTask) return;
    // Switching tasks clears the other side's loaded state so the UI
    // doesn't get confused. The user can re-upload anytime.
    if (t === "decoder") clearUpload();
    else clearDecoder();
    setUploadTask(t);
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
        {/* Task selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TaskOption
            active={uploadTask === "denial"}
            onClick={() => switchTask("denial")}
            Icon={FileScan}
            title="Read a denial letter / bill"
            body="Single page. Pulls deadline, claim ID, denial code, amount, plan type."
          />
          <TaskOption
            active={uploadTask === "decoder"}
            onClick={() => switchTask("decoder")}
            Icon={BookOpen}
            title="Decode your insurance policy"
            body="Multi-page SPD or EOC. Surfaces covered / excluded / vague / silent passages — the loopholes the insurer will use against you."
          />
        </div>

        <OllamaSetupBanner />

        {/* Conditional flows by task */}
        {uploadTask === "denial" ? (
          !uploadedDoc ? (
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
          )
        ) : !decoder ? (
          <UploadDropzone />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 items-start">
            <div className="lg:sticky lg:top-20">
              <MultipagePdfPreview />
            </div>
            <div className="min-w-0">
              <PolicyDecoderResults />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-[11px] text-fg-subtle space-y-1">
        <div>
          Vision call runs against your local Ollama. No cloud, no API key,
          no data leaving your machine.
        </div>
        <div className="text-[10.5px]">
          <span className="font-semibold">Not legal advice.</span> Output is
          a starting point, not a legal conclusion.{" "}
          <a
            href="https://github.com/sinhaankur/Recourse/blob/main/docs/LEGAL.md"
            target="_blank"
            rel="noreferrer"
            className="text-info hover:underline"
          >
            Legal & compliance posture
          </a>
          .
        </div>
      </footer>
    </div>
  );
}

function TaskOption({
  active,
  onClick,
  Icon,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-md border p-3 transition-colors",
        active
          ? "border-ember bg-ember/10 ring-1 ring-ember/40"
          : "border-border bg-surface-1 hover:bg-surface-2"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", active ? "text-ember" : "text-fg-muted")} />
        <div
          className={cn(
            "text-[13px] font-semibold",
            active ? "text-ember" : "text-fg"
          )}
        >
          {title}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-fg-muted leading-relaxed">{body}</p>
    </button>
  );
}

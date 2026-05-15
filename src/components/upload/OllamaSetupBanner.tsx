import { useState } from "react";
import { Check, Copy, RefreshCw, Terminal, AlertTriangle } from "lucide-react";
import { useRecourse } from "@/state/recourse";
import { cn } from "@/lib/cn";

/**
 * The status banner. Three states matching ollamaStatus:
 *
 *  unknown / unreachable → red banner, copy-able setup command, "Recheck" button
 *  no_vision_models      → yellow banner, "pull a vision model" command
 *  ready                 → green banner, list of models with vision tags
 *
 * The whole upload flow gates on this — the dropzone is enabled only when
 * status is "ready". Otherwise the user can't get to "extract" anyway.
 */
export function OllamaSetupBanner() {
  const { ollamaStatus, ollamaModels, ollamaError, reprobeOllama, selectedModel, setSelectedModel } =
    useRecourse();

  if (ollamaStatus === "ready") {
    const visionModels = ollamaModels.filter((m) => m.vision);
    return (
      <div className="rounded-md border border-settled/40 bg-settled/5 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-settled">
            <Check className="h-3.5 w-3.5" />
            Ollama ready
          </div>
          <span className="text-[11px] text-fg-muted">
            {visionModels.length} vision model{visionModels.length === 1 ? "" : "s"} available ·{" "}
            {ollamaModels.length} total
          </span>
          {visionModels.length > 0 && (
            <label className="ml-auto flex items-center gap-2 text-[11px] text-fg-muted">
              Model
              <select
                value={selectedModel ?? ""}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-md border border-border bg-surface-1 px-2 py-1 text-[11px] font-mono text-fg"
              >
                {visionModels.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
    );
  }

  if (ollamaStatus === "no_vision_models") {
    return (
      <SetupBlock
        tone="warn"
        Icon={AlertTriangle}
        title="Ollama is running, but no vision-capable model is installed"
        body="The text-only models on your machine can't read images. Pull a vision model — pick one:"
        commands={[
          {
            label: "Smaller, faster (~5 GB)",
            cmd: "ollama pull llava",
          },
          {
            label: "Best quality (~8 GB)",
            cmd: "ollama pull llama3.2-vision",
          },
        ]}
        actionLabel="I pulled one — recheck"
        onAction={reprobeOllama}
      />
    );
  }

  // unknown or unreachable
  return (
    <SetupBlock
      tone="danger"
      Icon={AlertTriangle}
      title="Ollama isn't reachable from this page"
      body={
        ollamaError
          ? `${ollamaError}. Ollama runs locally; if you haven't installed it yet, install via brew install ollama. Then start it with browser-CORS enabled:`
          : "Ollama runs locally on your machine. Install via brew install ollama, then start it with browser-CORS enabled:"
      }
      commands={[
        {
          label: "Start Ollama (the OLLAMA_ORIGINS env var is the key part — it lets the browser call it)",
          cmd: 'OLLAMA_ORIGINS="*" ollama serve',
        },
        {
          label: "Then pull a vision model in another terminal",
          cmd: "ollama pull llava",
        },
      ]}
      actionLabel="Recheck"
      onAction={reprobeOllama}
    />
  );
}

function SetupBlock({
  tone,
  Icon,
  title,
  body,
  commands,
  actionLabel,
  onAction,
}: {
  tone: "danger" | "warn";
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  commands: Array<{ label: string; cmd: string }>;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-4 space-y-3",
        tone === "danger" && "border-fabricated/40 bg-fabricated/5",
        tone === "warn" && "border-verify/40 bg-verify/5"
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className={cn(
            "h-4 w-4 mt-0.5 flex-none",
            tone === "danger" ? "text-fabricated" : "text-verify"
          )}
        />
        <div className="min-w-0">
          <div
            className={cn(
              "text-[12px] font-semibold",
              tone === "danger" ? "text-fabricated" : "text-verify"
            )}
          >
            {title}
          </div>
          <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">{body}</p>
        </div>
      </div>
      <div className="space-y-2">
        {commands.map((c, i) => (
          <CommandBlock key={i} label={c.label} cmd={c.cmd} />
        ))}
      </div>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-2.5 py-1 text-[11px] font-medium text-fg-muted hover:bg-surface-2"
      >
        <RefreshCw className="h-3 w-3" />
        {actionLabel}
      </button>
    </div>
  );
}

function CommandBlock({ label, cmd }: { label: string; cmd: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div>
      <div className="text-[10px] text-fg-muted mb-0.5 leading-snug">{label}</div>
      <div className="flex items-stretch rounded-md border border-border bg-surface-1 overflow-hidden">
        <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] text-fg-subtle border-r border-border bg-surface-2 font-mono">
          <Terminal className="h-3 w-3" />
          $
        </div>
        <code className="flex-1 px-2.5 py-1.5 text-[11px] font-mono text-fg overflow-x-auto whitespace-nowrap">
          {cmd}
        </code>
        <button
          onClick={onCopy}
          className="px-2.5 border-l border-border bg-surface-2 text-fg-muted hover:text-fg hover:bg-surface-3 text-[10px]"
        >
          {copied ? (
            <Check className="h-3 w-3 text-settled" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>
    </div>
  );
}

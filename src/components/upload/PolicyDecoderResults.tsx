import { useState, useMemo } from "react";
import {
  Sparkles,
  Loader2,
  X,
  RefreshCw,
  AlertTriangle,
  Check,
  Ban,
  ShieldOff,
  Eye,
  ClipboardList,
} from "lucide-react";
import { useRecourse } from "@/state/recourse";
import { cn } from "@/lib/cn";
import type { PolicyAnnotation } from "@/lib/ollama";

type AnnotationKind = PolicyAnnotation["kind"];

const KIND_META: Record<
  AnnotationKind,
  {
    label: string;
    sub: string;
    Icon: React.ComponentType<{ className?: string }>;
    cls: string;
  }
> = {
  covered: {
    label: "Covered",
    sub: "A clear benefit you can rely on",
    Icon: Check,
    cls: "text-settled border-settled/40 bg-settled/5",
  },
  excluded: {
    label: "Excluded",
    sub: "Explicitly NOT covered — assume nothing",
    Icon: Ban,
    cls: "text-fabricated border-fabricated/40 bg-fabricated/5",
  },
  limit: {
    label: "Limit",
    sub: "A numeric cap — visits, dollars, days",
    Icon: ClipboardList,
    cls: "text-verify border-verify/40 bg-verify/5",
  },
  vague: {
    label: "Vague (loophole)",
    sub: "Undefined language with high financial impact — your leverage point if denied",
    Icon: AlertTriangle,
    cls: "text-verify border-verify/40 bg-verify/10",
  },
  silent: {
    label: "Silent (gap)",
    sub: "Something a reasonable person would expect to be addressed — but isn't",
    Icon: ShieldOff,
    cls: "text-lawyer border-lawyer/40 bg-lawyer/5",
  },
  procedure: {
    label: "Procedure required",
    sub: "Coverage depends on doing this step — miss it and the claim is denied",
    Icon: Eye,
    cls: "text-info border-info/40 bg-info/5",
  },
};

/**
 * Right pane during policy-decoder mode. Renders the decoder's lifecycle:
 *
 *  idle       → "drop a policy"
 *  rendering  → loader + page count
 *  ready      → "ready to analyze" + start button
 *  analyzing  → live progress, annotations stream in as they arrive
 *  done       → grouped annotations, filterable by kind
 *  aborted    → partial results + restart
 *  failed     → error message + retry
 */
export function PolicyDecoderResults() {
  const {
    decoder,
    runDecoder,
    cancelDecoder,
    ollamaStatus,
    selectedModel,
  } = useRecourse();
  const [filter, setFilter] = useState<AnnotationKind | "all">("all");

  // Flatten annotations across pages so the grouped/filterable view can
  // operate on one collection. Each entry knows which page it came from.
  const allAnnotations = useMemo(() => {
    if (!decoder) return [];
    return decoder.pages.flatMap((p) =>
      p.annotations.map((a) => ({ ...a, pageNumber: p.page.pageNumber }))
    );
  }, [decoder]);

  const counts = useMemo(() => {
    const c: Record<AnnotationKind, number> = {
      covered: 0,
      excluded: 0,
      limit: 0,
      vague: 0,
      silent: 0,
      procedure: 0,
    };
    for (const a of allAnnotations) c[a.kind] += 1;
    return c;
  }, [allAnnotations]);

  if (!decoder) return null;
  const { status, pages, pagesComplete, error } = decoder;
  const totalPages = pages.length;
  const totalPagesToRun = pages.filter(
    (p) => p.status !== "complete"
  ).length;

  if (status === "rendering") {
    return (
      <Panel>
        <Header title="Rendering pages" sub={`${pages.length} so far`} />
        <div className="flex items-center gap-2 text-[11px] text-ember">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Reading the PDF page by page…
        </div>
      </Panel>
    );
  }

  if (status === "ready") {
    return (
      <Panel>
        <Header
          title="Ready to analyze"
          sub={`${totalPages} pages rendered. Each page goes through your local model.`}
        />
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Local 7–11B vision models take ~5–15 seconds per page. {totalPages} pages
          ≈ {Math.ceil((totalPages * 10) / 60)} minutes. You can cancel any time
          and the pages already analyzed are kept.
        </p>
        <button
          onClick={runDecoder}
          disabled={ollamaStatus !== "ready"}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-medium",
            ollamaStatus === "ready"
              ? "bg-ember text-canvas hover:bg-ember/90"
              : "bg-surface-2 text-fg-subtle cursor-not-allowed"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Decode this policy
        </button>
      </Panel>
    );
  }

  if (status === "analyzing") {
    const remaining = totalPagesToRun;
    return (
      <Panel>
        <div className="flex items-center justify-between">
          <Header
            title="Decoding"
            sub={`Page ${decoder.currentPage ?? "—"} of ${totalPages} · ${pagesComplete}/${totalPages} done`}
          />
          <button
            onClick={cancelDecoder}
            className="inline-flex items-center gap-1 text-[11px] text-fg-muted hover:text-fg"
          >
            <X className="h-3 w-3" />
            Stop
          </button>
        </div>

        <div className="rounded-md border border-border bg-surface-2 overflow-hidden">
          <div
            className="h-1.5 bg-ember transition-all"
            style={{
              width: `${
                ((pages.length - remaining) / Math.max(pages.length, 1)) * 100
              }%`,
            }}
          />
        </div>
        <p className="text-[11px] text-fg-muted leading-relaxed">
          Using <span className="font-mono text-fg">{selectedModel}</span>.
          Annotations stream into the panel below as each page finishes.
        </p>

        {allAnnotations.length > 0 && (
          <AnnotationStream
            annotations={allAnnotations}
            filter={filter}
            setFilter={setFilter}
            counts={counts}
          />
        )}
      </Panel>
    );
  }

  if (status === "aborted" || status === "failed") {
    return (
      <Panel>
        <div className="flex items-start gap-2.5">
          <AlertTriangle
            className={cn(
              "h-4 w-4 mt-0.5 flex-none",
              status === "failed" ? "text-fabricated" : "text-fg-muted"
            )}
          />
          <div className="min-w-0">
            <div
              className={cn(
                "text-[12px] font-semibold",
                status === "failed" ? "text-fabricated" : "text-fg"
              )}
            >
              {status === "failed" ? "Decoder failed" : "Stopped"}
            </div>
            <p className="mt-1 text-[12px] text-fg-muted leading-relaxed">
              {error ??
                `Stopped after ${pagesComplete} pages. Partial results below.`}
            </p>
          </div>
        </div>
        {allAnnotations.length > 0 && (
          <AnnotationStream
            annotations={allAnnotations}
            filter={filter}
            setFilter={setFilter}
            counts={counts}
          />
        )}
        <button
          onClick={runDecoder}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-1 px-3 py-1.5 text-[12px] text-fg hover:bg-surface-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Resume from where we stopped
        </button>
      </Panel>
    );
  }

  // status === "done"
  return (
    <Panel>
      <Header
        title="Decoder complete"
        sub={`${pagesComplete} pages · ${allAnnotations.length} annotations`}
      />
      <AnnotationStream
        annotations={allAnnotations}
        filter={filter}
        setFilter={setFilter}
        counts={counts}
      />
      <div className="border-t border-border pt-3 text-[10.5px] text-fg-subtle leading-snug">
        These are raw annotations from a local vision model. The vague-language
        and silent-gap flags are <em>leads</em> for where to push back if you
        are denied later — they are not legal conclusions. The state-mandate
        cross-reference (where state floor laws override the policy) is not
        wired in yet; that's the next layer.
      </div>
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

function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
        {title}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-fg-muted">{sub}</div>}
    </div>
  );
}

function AnnotationStream({
  annotations,
  filter,
  setFilter,
  counts,
}: {
  annotations: Array<PolicyAnnotation & { pageNumber: number }>;
  filter: AnnotationKind | "all";
  setFilter: (f: AnnotationKind | "all") => void;
  counts: Record<AnnotationKind, number>;
}) {
  const filtered =
    filter === "all"
      ? annotations
      : annotations.filter((a) => a.kind === filter);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          label={`All ${annotations.length}`}
          active={filter === "all"}
          onClick={() => setFilter("all")}
          tone="neutral"
        />
        {(Object.keys(counts) as AnnotationKind[]).map((k) => {
          if (counts[k] === 0) return null;
          return (
            <FilterChip
              key={k}
              label={`${KIND_META[k].label} ${counts[k]}`}
              active={filter === k}
              onClick={() => setFilter(k)}
              kind={k}
            />
          );
        })}
      </div>
      <div className="space-y-1.5">
        {filtered.map((a, i) => (
          <AnnotationCard
            key={`${a.pageNumber}-${i}`}
            annotation={a}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  kind,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  kind?: AnnotationKind;
  tone?: "neutral";
}) {
  const baseCls =
    tone === "neutral"
      ? "border-border text-fg-muted hover:bg-surface-2"
      : kind
      ? KIND_META[kind].cls
      : "border-border";
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
        baseCls,
        active && "ring-2 ring-ember/40 font-semibold"
      )}
    >
      {label}
    </button>
  );
}

function AnnotationCard({
  annotation,
  index,
}: {
  annotation: PolicyAnnotation & { pageNumber: number };
  index: number;
}) {
  const m = KIND_META[annotation.kind];
  const Icon = m.Icon;
  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className={cn(
        "animate-fade-in-up rounded-md border p-2.5",
        m.cls,
        annotation.kind === "vague" && "bg-hatch-fabricated"
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold">
          <Icon className="h-3 w-3" />
          {m.label}
          <span className="text-fg-subtle font-mono">p.{annotation.pageNumber}</span>
        </div>
        <span
          className={cn(
            "text-[9px] uppercase tracking-wider font-semibold",
            annotation.impact === "high" && "text-fabricated",
            annotation.impact === "medium" && "text-verify",
            annotation.impact === "low" && "text-fg-subtle"
          )}
        >
          {annotation.impact} impact
        </span>
      </div>
      <div className="mt-1 text-[12px] text-fg leading-snug font-medium">
        {annotation.topic}
      </div>
      {annotation.excerpt && annotation.excerpt !== "[not addressed]" && (
        <blockquote className="mt-1 border-l-2 border-fg-subtle/30 pl-2 text-[11px] text-fg-muted italic leading-snug">
          "{annotation.excerpt}"
        </blockquote>
      )}
      {annotation.excerpt === "[not addressed]" && (
        <div className="mt-1 text-[10.5px] text-fg-subtle italic">
          (not addressed on this page)
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-fg-muted leading-relaxed">
        {annotation.note}
      </p>
    </div>
  );
}

import { ScanLine, ShieldOff, Clock, BookOpen, UploadCloud, FileScan } from "lucide-react";
import { useRecourse } from "@/state/recourse";
import { usd } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Landing — the pitch + the "open the case" CTA.
 *
 * The header is deliberately framed in second-person. Recourse is a tool
 * the user wields *against* a system that depends on them giving up. So
 * the headline names the loop, not the technology.
 */
export function Landing() {
  const { activeCase, cases, setActiveCase, setStage, setMode, setUploadTask } = useRecourse();

  const openUpload = (task: "denial" | "decoder") => {
    setUploadTask(task);
    setMode("upload");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-ember/15 ring-1 ring-ember/40 flex items-center justify-center">
              <span className="font-display text-ember font-bold text-sm leading-none">
                R
              </span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-fg">Recourse</div>
              <div className="text-[10px] uppercase tracking-wider text-fg-subtle">
                Fight the loop · interactive demo
              </div>
            </div>
          </div>
          <a
            href="https://github.com/sinhaankur"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-fg-muted hover:text-fg"
          >
            About
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-14 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 items-start">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-ember/40 bg-ember/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ember">
              Consumer-side AI
            </div>
            <h1 className="mt-4 font-display text-4xl md:text-5xl font-semibold leading-[1.05] tracking-tight text-fg">
              Institutions win by{" "}
              <span className="italic text-ember">exhausting you.</span>
              <br />
              Recourse is the part that doesn't get tired.
            </h1>
            <p className="mt-5 text-[15px] text-fg-muted leading-relaxed max-w-2xl">
              Insurance denials, surprise medical bills, parity violations —
              the institution's win condition is you missing a deadline,
              giving up on a confusing letter, or never realizing you had
              grounds to fight. Recourse reads the letter, anchors your
              claim to actual statute, and never lets the clock slip.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setStage("scanning");
                  setTimeout(() => setStage("extracted"), 2200);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-ember px-4 py-2.5 text-sm font-medium text-canvas hover:bg-ember/90 transition-colors"
              >
                <ScanLine className="h-4 w-4" />
                Run the example case
              </button>
              <button
                onClick={() => openUpload("denial")}
                className="inline-flex items-center gap-2 rounded-md border border-ember/40 bg-ember/5 px-4 py-2.5 text-sm font-medium text-ember hover:bg-ember/10 transition-colors"
              >
                <FileScan className="h-4 w-4" />
                Read your denial letter
              </button>
              <button
                onClick={() => openUpload("decoder")}
                className="inline-flex items-center gap-2 rounded-md border border-ember/40 bg-ember/5 px-4 py-2.5 text-sm font-medium text-ember hover:bg-ember/10 transition-colors"
              >
                <UploadCloud className="h-4 w-4" />
                Decode your policy
              </button>
            </div>
            <div className="mt-3 text-[11px] text-fg-subtle max-w-xl leading-snug">
              The canonical case is mocked end-to-end — instant, deterministic,
              demoable. The two upload paths run real vision models against your
              own documents via Ollama on your machine. Nothing leaves your laptop.
              Decoding a multi-page policy takes a few minutes.
            </div>
          </div>

          {/* The case card */}
          <div className="rounded-lg border border-border bg-surface-1 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
                The case you'll watch Recourse open
              </div>
              {cases.length > 1 && (
                <div className="text-[10px] text-fg-subtle">
                  {cases.length} cases available
                </div>
              )}
            </div>

            {/* Case picker — appears only when there's more than one */}
            {cases.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {cases.map((c) => {
                  const active = c.id === activeCase.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveCase(c.id)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[11px] border transition-colors",
                        active
                          ? "border-ember bg-ember/15 text-ember font-medium"
                          : "border-border bg-surface-2 text-fg-muted hover:bg-surface-3"
                      )}
                    >
                      {c.displayName}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 text-sm font-medium text-fg">
              {activeCase.displayName}
            </div>
            <div className="mt-1 text-[12px] text-fg-muted leading-relaxed">
              {activeCase.summary}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
              <Stat
                label="Amount in dispute"
                value={usd(activeCase.amountInDispute)}
              />
              <Stat
                label={
                  activeCase.loopKind === "surprise_bill"
                    ? "Liability wiped if you win"
                    : "Recovery if appeal wins"
                }
                value={usd(activeCase.recoveryEstimate)}
                tone="ember"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Three-pillar */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Pillar
            Icon={ScanLine}
            title="Read the letter"
            body="Vision model pulls amount, deadline, denial code, statute, plan type off a believable insurance document — every field pinned to the spot on the page it came from."
          />
          <Pillar
            Icon={BookOpen}
            title="Anchor the fight"
            body="Every legal claim cites the actual statute or regulation — verified date attached. No 'made-up case' citations: unanchored claims are flagged for what they are."
          />
          <Pillar
            Icon={Clock}
            title="Never miss the clock"
            body="Internal appeal, external review, parity disclosure — three separate deadlines, surfaced before the institution hopes you'll forget. This is the loop's break point."
          />
        </div>
      </section>

      {/* Companion line */}
      <footer className="flex-1 flex items-end">
        <div className="mx-auto max-w-6xl px-6 py-8 text-[11px] text-fg-subtle leading-relaxed flex items-center gap-2">
          <ShieldOff className="h-3 w-3" />
          <span>
            Companion piece to{" "}
            <a
              href="https://sinhaankur.github.io/Human-in-the-Loop/"
              target="_blank"
              rel="noreferrer"
              className="text-info hover:underline"
            >
              Sentinel
            </a>{" "}
            — that one is oversight of AI by experts; this one is oversight
            of institutions by AI, on behalf of the person they're squeezing.
          </span>
        </div>
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ember";
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono text-sm tabular-nums ${
          tone === "ember" ? "text-ember font-semibold" : "text-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Pillar({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-1 p-5">
      <Icon className="h-4 w-4 text-ember mb-3" />
      <div className="text-sm font-semibold text-fg">{title}</div>
      <p className="mt-1.5 text-[12px] text-fg-muted leading-relaxed">
        {body}
      </p>
    </div>
  );
}

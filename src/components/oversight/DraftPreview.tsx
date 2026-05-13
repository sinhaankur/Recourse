import { Mail, Send } from "lucide-react";
import { useRecourse } from "@/state/recourse";

/**
 * Final stage — the actual letter the user can send. The point isn't
 * polish; it's that the user can read what's about to be filed under
 * their name. "Trust the AI" works in inverse proportion to "the user
 * understood what was sent."
 */
export function DraftPreview() {
  const { activeCase } = useRecourse();
  const d = activeCase.draft;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">
          <Mail className="h-3 w-3" />
          Letter Recourse drafted for you
        </div>
        <p className="mt-1 text-[11px] text-fg-muted">
          You can read every word before it goes out. The bolded passages
          are the statutes the AI is leaning on; tap one to see the source.
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface-1 overflow-hidden">
        <div className="border-b border-border bg-surface-2 px-4 py-2 text-[11px] grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <span className="text-fg-subtle">To</span>
          <span className="font-mono text-fg">{d.recipient}</span>
          <span className="text-fg-subtle">Subject</span>
          <span className="font-mono text-fg">{d.subject}</span>
        </div>

        <pre className="px-5 py-4 whitespace-pre-wrap text-[12.5px] leading-relaxed font-sans text-fg">
          {d.body}
        </pre>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ember/40 bg-ember/10 px-4 py-3">
        <div className="text-[11px] text-fg-muted leading-snug max-w-md">
          When you send, Recourse uses certified mail with proof of delivery,
          and adds the date to your deadline tracker so we never miss the
          response window.
        </div>
        <button className="inline-flex items-center gap-2 rounded-md bg-ember px-3 py-2 text-[12px] font-medium text-canvas hover:bg-ember/90">
          <Send className="h-3.5 w-3.5" />
          Send via certified mail
        </button>
      </div>
    </div>
  );
}

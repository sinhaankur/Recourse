# Recourse — fight the loop

Consumer-side AI that helps end users contest the institutional loops they're trapped in — insurance denials, surprise medical bills, parity violations. Recourse reads the letter, anchors your claim to actual statute, and runs a cadence engine that never lets the clock slip.

> React 19 + TypeScript + Tailwind v4 · single canonical case (out-of-network mental health denial) · all data mocked, all statutes real.
>
> **Companion piece to [Sentinel](https://github.com/sinhaankur/Human-in-the-Loop).** Sentinel is oversight *of* AI by experts; Recourse is oversight of *institutions* by AI, on behalf of the person they're squeezing.

**[Live demo →](https://sinhaankur.github.io/Recourse/)** &nbsp;·&nbsp; **[How it works →](docs/HOW_IT_WORKS.md)** &nbsp;·&nbsp; **[Parity-law context →](docs/PARITY_LAW.md)** &nbsp;·&nbsp; **[Architecture →](docs/ARCHITECTURE.md)**

---

## The thesis

Every AI-for-legal product today is built for the lawyer or the in-house compliance team. The patient holding a $3,876 mental health denial gets nothing. Meanwhile the loop the institution runs against them is mechanical: vague denial code, 90-day clock, complex appeal, second denial, externally-reviewed appeal, statute of limitations. **The institution wins by exhaustion.** Recourse's win condition is being unexhaustible.

The product is not a chatbot. It is a **document-first workflow**:

```
EOB / denial letter      →  vision extraction   →  loop classifier
       ↓                                                  ↓
  the user reads      ←   plain-language claims  ←  statute-anchored strategy
       ↓
  draft letter      →   cadence engine (3 deadlines, not 1)   →  certified mail
```

The visible artifact in this repo is a single canonical case — an out-of-network mental health denial with a parity-law attack surface — staged across four screens. A real product runs the same pipeline against any uploaded document.

---

## Why mental-health denials, why this case

This canonical case isn't arbitrary. It's picked because:

- **Recent regulatory tailwind.** The 2024 tri-agency MHPAEA Final Rule (DOL / HHS / Treasury) tightened NQTL (Non-Quantitative Treatment Limitation) parity requirements and named "ghost networks" as an enforcement priority. Plans now have to *prove* their mental-health review processes are comparable to medical/surgical.
- **Clear procedural attack.** A blanket CO-50 denial across 14 sessions with no documented medical-necessity review is a textbook NQTL flag. The leverage move — requesting the plan's parity comparative analysis under 29 CFR § 2590.712(d) — usually breaks the loop, because most plans haven't done the homework.
- **Sympathetic story most reviewers recognize.** Therapist waitlists are months long; patients pay out-of-network because the in-network directory is fiction; the claim gets denied for "non-medical necessity" with no review on record.
- **Three real deadlines, not one.** Internal appeal (90 days). Parity disclosure request (separate window). External review (opens after the internal denial). The cadence engine is the product.

Every statute citation in the demo (`29 U.S.C. § 1185a`, `29 CFR § 2590.712(d)`, `45 CFR § 146.136(c)(4)`, the 2024 final rule) is real. The patient, provider, plan numbers, and dollar amounts are fictional.

---

## The four-stage walkthrough

1. **Landing** — the pitch + one "Run the example case" button.
2. **Scan** — a believable EOB renders as paper; a scan-line sweep simulates the vision model reading it. Takes ~2 seconds. The point is to make the document recognizable, not to actually OCR.
3. **Extract** — bounding boxes appear over the EOB; the right rail shows what the AI pulled (deadline, amount, denial code, plan type, network status). Hovering a row lights up its region on the page. This bidirectional anchor is the credibility moment.
4. **Strategy** — four AI-generated claims about the case, each:
   - prefaced with a **plain-language gloss** ("They have to show their work…") so a non-expert understands the move,
   - labelled `Settled` / `You verify` / `Ask a lawyer` (the calibrated-confidence layer, flipped for non-experts),
   - **anchored to one or more real statutes** with the operative excerpt and a "verified on" date,
   - tagged with what the user still has to verify themselves (your plan type, your call logs, your state),
   - sitting above three deadlines surfaced as the cadence engine.
5. **Draft** — the actual appeal letter, every word visible before send. Statutes cited in-line. A "Send via certified mail" CTA closes the loop.

---

## How Recourse differs from Sentinel

The two projects share primitives (calibrated confidence, evidence anchors, cross-hatch pattern for fabricated content) because the underlying problem is the same: **AI claims become trustworthy only when their uncertainty is legible and their basis is checkable.** What differs is the audience and the inversion of who's checking whom:

| Dimension | Sentinel | Recourse |
|---|---|---|
| Reader | Expert (clinician, lawyer, analyst) | End user (patient, tenant, debtor) |
| Confidence vocabulary | `High / Likely / Unsure / Low` — bands experts already use | `Settled / You verify / Ask a lawyer` — action verbs, not percentages |
| Verdict model | Reader judges AI's claims (Accept / Edit / Reject) | AI explains itself; reader's role is to *understand* and *verify*, then send |
| Provenance | Evidence link to clinical/legal source the expert can read | Statute chip with excerpt, verified date, and a "verified on" stamp |
| Audit object | Per-claim verdict log for compliance | Deadline ledger + certified-mail receipts for the user |

Sentinel proves "every AI tool needs an oversight layer." Recourse proves "every adversarial institution needs an oversight layer the user controls."

---

## What this prototype doesn't try to be

- **Not a chatbot.** Conversational interfaces hide the structure. A document-first workflow lets the user see what the AI saw.
- **Not a lawyer.** The "Ask a lawyer" confidence band is intentional — the AI's job is to win procedurally, surface the disclosure ask, and run the clock, not to provide jurisdiction-specific legal advice.
- **Not a generic "legal AI."** Picking one loop hard makes the product sharp; market-fit research lives in the broader portfolio. Medical billing + insurance denial is the strongest target (proven monetization via GoodBill / Resolve, ~17% in-network denial rate, ~50% appeal win rate when filed).

---

## Get it running

```bash
npm install
npm run dev
```

Open the printed URL.

```bash
npm run build      # typecheck + production build
npm run preview    # preview the built app
```

A GitHub Pages deploy workflow lives alongside Sentinel's — this repo will get its own when there's a stable public URL to point at.

---

## Stack

- **Vite** + **React 19** + **TypeScript** (strict)
- **Tailwind v4** with `@theme` design tokens (OKLCH palette, dark default + light mode) — shifted accent from Sentinel's `info` blue to a warmer `ember` so it reads as a sibling, not a clone
- **Radix UI** primitives for dialogs / popovers (held in reserve — the current demo is keyboard-and-hover only)
- **Lucide** icons + **Fraunces** for display type

---

## Why this exists

A portfolio piece exploring **AI Trust & Safety on the consumer side**. Sentinel asks "how should the expert reviewing AI work?"; Recourse asks "what does the AI look like when the user is the one being run on a loop, and the AI is in their corner?" Same primitives, inverted oversight, different politics.

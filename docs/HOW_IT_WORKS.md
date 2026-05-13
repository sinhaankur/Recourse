# How Recourse works

A code-level walkthrough of the consumer-side oversight flow. Pairs with the [live demo](https://sinhaankur.github.io/Recourse/), the [README](../README.md), and two deeper docs: [parity-law context](PARITY_LAW.md) (why the canonical case is shaped the way it is) and [architecture](ARCHITECTURE.md) (file map, state flow, and where a real backend would slot in).

---

## The thesis, one paragraph deeper

Every legal-AI product on the market today is built for the legal professional or the in-house compliance team. The patient holding a $3,876 mental-health denial gets nothing — and meanwhile the loop the institution runs against them is purely mechanical: vague denial code, a 90-day clock most people don't notice, a complex appeal process designed to attrite, a second denial whose only purpose is to push past the statute of limitations on the *next* remedy. The institution's strategy is exhaustion. Recourse's win condition is being unexhaustible — but unexhaustibility alone isn't enough. The product has to make the user understand what is being said in their name. Trust earned via legibility, not asserted via authority.

That's the whole inversion vs Sentinel. Sentinel earns trust by making an *expert*'s job easier — they were going to read the AI's output anyway, so the oversight layer just gives them better levers. Recourse has to do the harder thing: make a *non-expert* understand a legally adversarial document well enough to know what is being filed under their signature, without turning them into a paralegal.

---

## The persona inversion in detail

| Dimension | Sentinel | Recourse | Why the difference matters |
|---|---|---|---|
| **Reader** | Expert (clinician, lawyer, analyst) | End user (patient, debtor, tenant) | An expert can spot AI errors; a patient can't. So the product has to declare its own competence boundaries instead of relying on the reader to police them. |
| **AI's role** | Drafter; reader judges output | Translator + strategist + scheduler; reader absorbs and verifies their own facts | Sentinel's reader rejects bad AI output. Recourse's reader can't rate the legal soundness, but *can* rate "is this date right? was that my therapist?" — the AI surfaces only those questions. |
| **Confidence vocabulary** | `High` / `Likely` / `Unsure` / `Low` — the bands experts already use | `Settled` / `You verify` / `Ask a lawyer` — action verbs that tell the reader what to *do* | A percentage is useless to someone who can't calibrate the model. A verb is not. |
| **Verdict model** | Per-claim Accept / Edit / Reject by the reader | Reader doesn't approve the AI's claims — the AI is acting *for* them. Their action is to verify, then send. | The output is going out under the reader's signature, not the AI's. The product has to make that feel earned. |
| **Provenance** | Evidence link to clinical/legal source the expert can read | Statute chip with the operative excerpt + a "verified on" date | A statute is only as good as the last time someone confirmed it's still good law. That date is a first-class object in the UI. |
| **Audit object** | Per-claim verdict log for compliance | Deadline ledger + certified-mail receipts | The institution's win condition was you missing a date or losing a receipt. The audit is the user's defense, not the firm's. |
| **Failure mode for AI hallucination** | Hatch-pattern chip + accept/reject control | Hatch-pattern panel saying "No statute anchored — treat as a strategy direction, not a legal conclusion" — and the demo has one such claim deliberately, claim 4, because pretending the AI never overreaches is the lie | Recourse has to *show* its limits, not just bound them. |

---

## The unit: one `CaseClaim`

Anchored on a single shape in [`src/types.ts`](../src/types.ts):

```ts
interface CaseClaim {
  id: string;
  text: string;                    // the technical statement — what would go in the letter
  plainLanguage?: string;          // the "in other words" — what a 13-year-old would understand
  confidence: "settled" | "verify" | "lawyer";
  anchors: StatuteAnchor[];        // empty → unanchored → demoted to "strategy direction"
  flags: FlagKind[];
  userVerifies?: string[];         // what the user has to confirm themselves
}
```

`plainLanguage` is the load-bearing field. The technical statement *is* what goes in the appeal letter. But it's also what wakes up a reviewer reading legalese. So the AI is required to write the move twice — once for the reader, once for the recipient. That double-write is the single biggest behavioral difference from Sentinel's `AIClaim`.

Statute anchoring is structural. An anchorless `CaseClaim` is allowed (it shows up as claim 4 in the demo) but it gets a cross-hatched UI treatment and an explicit demotion: *"No statute anchored to this claim — treat it as a strategy direction, not a legal conclusion."* That demotion is shown to the user **and** removed from the draft letter. The AI is not allowed to write an unanchored legal claim *into the document*; it can only suggest a direction worth asking a lawyer about.

---

## The state machine

[`src/state/recourse.tsx`](../src/state/recourse.tsx) holds five things:

| Key | Type | Role |
|---|---|---|
| `activeCase` | `Case` | The single canonical case (constructed in [`src/data/mockCase.ts`](../src/data/mockCase.ts)). A real product would pass an array. |
| `stage` | `FlowStage` | One of `landing` / `scanning` / `extracted` / `strategy` / `draft`. Drives which right-rail component renders. |
| `setStage` | function | Used by Landing's CTA (auto-advances `scanning` → `extracted` after 2.2s) and by the footer rail's Back / Next buttons. |
| `focusedEntityId` | `string \| null` | The hover-anchor between the extraction panel and the bounding boxes on the EOB. Drives the bidirectional credibility moment. |
| `reset` | function | Returns to `landing` and clears focus — fires when a reviewer wants to run the demo again. |

There's deliberately no Accept / Edit / Reject state. The user isn't approving AI output; they're absorbing it, verifying their own facts against it, and sending the result.

---

## The four stages, one at a time

### Stage 1 — Scan ([CaseCanvas.tsx](../src/components/case/CaseCanvas.tsx) + [EOBPaper.tsx](../src/components/case/EOBPaper.tsx))

A believable Explanation of Benefits renders as paper: cream substrate, Fraunces display type for the document title, Inter for body, JetBrains Mono for the numerical columns. The letterhead reads "Northshore Health · Member Services" with a fake claim ID and a "Statement date" matching the case's `receivedAt`. The "Not a bill" disclaimer top-right is genre-correct: this is what real EOBs look like.

A scan-line sweeps top-to-bottom for 2.4 seconds (`@keyframes scan-sweep` in [index.css](../src/index.css)). The right rail simulates the vision model identifying field clusters one by one (Letterhead → Claim ID → Denial codes → Appeal deadline → Plan type), each fading in with an 80–220ms stagger so the read feels deliberate, not instant.

Why this matters: the "AI reads the letter" promise is the single most credibility-load-bearing moment in the entire product. If the document looks fake, every claim downstream is suspect. If the document looks real, the rest of the flow has earned the reader's attention.

### Stage 2 — Extract ([ExtractionPanel.tsx](../src/components/case/ExtractionPanel.tsx))

The scan sweep ends. The EOB stays. Five bounding boxes appear over specific regions of the document — the internal-appeal deadline, the dollar amount in dispute, the denial reason, the plan type, the network-availability note. Each box is anchored to a `bbox: { x, y, w, h }` expressed in percentages, so the overlay scales with the paper at any viewport.

The right rail shows five rows — one per extracted entity — each with:

- the field name ("Internal appeal deadline"),
- the value the AI pulled ("Aug 6, 2026 (90 days from received)"),
- a confidence label (`Settled` / `You verify` / `Ask a lawyer`),
- any flags (`Your facts` if the answer depends on something the AI can't see).

Hovering a row lights up its bounding box; hovering a bounding box lights up its row. That bidirectional anchor is the credibility moment. Without it the AI's structured claims float, and the reader has to take "I read the document correctly" on trust. With it, the AI's claims are pinned to the page — physically, visually, in a way a portfolio reviewer recognizes instantly.

Two extractions are deliberately `verify`-tier, not `settled`:

- **Plan type** — the AI can read "Self-funded ERISA group plan" off the document, but can't know whether the EOB itself is accurate; the user has to confirm via their benefits booklet.
- **In-network availability** — the document references ten LCSWs in the directory; the *fact that eight aren't accepting patients* is a parity-relevant claim the AI is making *about* the document, not extracting *from* it.

That distinction is doing real work: the product is telling the user where its competence ends, *during* the moment that would otherwise feel most impressive.

### Stage 3 — Strategy ([CaseClaim.tsx](../src/components/oversight/CaseClaim.tsx) + [DeadlineMeter.tsx](../src/components/primitives/DeadlineMeter.tsx))

Four claims. Each renders with:

1. A confidence label and any flags, top-right (the credibility budget the AI is asking for).
2. A **plain-language gloss** in an ember-tinted box ("They have to show their work. Federal law requires the insurer to prove they apply the same review standard to mental health as they do to physical conditions.") — the "in other words" line that makes a non-expert *get it*.
3. The technical statement under the gloss — what would go into the appeal letter.
4. The statute anchors as `<details>` chips. Click one to expand the operative excerpt and see the "verified on" date.
5. A "you need to verify" panel if the claim depends on facts only the user knows.

Below the four claims, the **cadence engine** renders three deadlines via [DeadlineMeter.tsx](../src/components/primitives/DeadlineMeter.tsx). The meter computes `daysUntil(dueAt)` and switches presentation across four bands:

| Band | Range | Look | Reads as |
|---|---|---|---|
| `missed` | `< 0` | Fabricated-tone red, semibold | "This deadline passed N days ago. You lost this remedy." |
| `hot` | `0–13` | Ember on ember background, semibold | "If you don't act this week, you lose." |
| `warm` | `14–44` | Verify-yellow | "Plan now, file before the band shifts." |
| `cool` | `45+` | Neutral | "Don't forget — but no urgency yet." |

The consequence line under each deadline is in plain English: *"If you miss this, the appeal is closed — no second chance."* Not "180-day claims regulation timing requirement." The lawyer-mode information is in the chip; the urgency-conveying information is in the prose.

### Stage 4 — Draft ([DraftPreview.tsx](../src/components/oversight/DraftPreview.tsx))

The actual letter, every word visible. Header block shows recipient + subject; body is rendered in a `<pre>` so the line breaks are honest. The statutes the AI is leaning on are referenced by their formal citations in-line; the letter itself reads as something a paralegal might draft.

The CTA — "Send via certified mail" — is wired to nothing in the prototype but is documented in the README as the eventual mechanism (USPS Certified Mail API or comparable). The point of certified mail is the receipt: the institution can't claim non-receipt, and the receipt date triggers the *next* deadline in the cadence engine (the institution's required response window).

---

## The full loop, end to end

```
EOB / denial letter received
        ↓
Vision model reads it
        ↓
        ├─ structured entities extracted (deadline, amount, denial code, plan, network)
        ├─ each entity tagged with confidence + flags
        └─ each entity anchored to a bounding box on the document
        ↓
Loop classifier identifies playbook
  (parity_violation, in this case — because CO-50 + no medical-necessity
   review on file + ghost-network indicator → MHPAEA NQTL attack surface)
        ↓
Strategy generator emits CaseClaim[]
        ├─ each claim has plain-language gloss + technical statement
        ├─ each anchored claim cites real statute(s) with verified-on date
        ├─ unanchored claims demoted to "strategy direction" + cross-hatched
        └─ "you verify" tasks surfaced separately
        ↓
Cadence engine schedules Deadline[]
        ├─ internal appeal      (90 days from receipt)
        ├─ parity disclosure    (separate window, before the appeal deadline)
        └─ external review      (opens after internal denial)
        ↓
Letter drafted
        ├─ statutes embedded in-line
        ├─ user-supplied evidence (call logs, screenshots) attached
        └─ certified mail with receipt for proof of filing
        ↓
Receipt date triggers institution's response clock
        ↓
[ ... loop continues until resolved ... ]
```

The loop *doesn't end* with the first letter — it ends when the institution settles, the user wins external review, or the user accepts a denied appeal. The cadence engine's job is to keep the user inside the loop on offense.

---

## Five design moves worth naming

### 1. Plain-language before legalese
Every claim has a `plainLanguage` field, rendered in an ember-tinted box *above* the technical statement. The technical statement still exists — it goes into the letter — but the reader's first encounter is the gloss. The gloss is the moment the reader *understands*; the statement is the moment they *act*.

### 2. "Verified on" as a first-class object
A statute citation is a snapshot. The 29 CFR § 2590.712 you read yesterday may have been re-numbered today. So every `StatuteAnchor` carries a `verifiedOn` ISO date, visible on the chip's expanded card. The product is saying: *"this is good law as of this date — if today is significantly later, treat it as a lead, not a foundation."*

### 3. Three deadlines, not one
Institutions exploit users tracking only the obvious deadline. The cadence engine deliberately surfaces three for this case — internal appeal, parity disclosure (a *separate* letter with its own clock), and external review (which opens only after internal denial). The visual rank (`hot` / `warm` / `cool`) is what tells the user which to act on this week vs. this month.

### 4. Unanchored claims get demoted, visibly
Claim 4 in the canonical case ("Your state may give you a second window") has zero statute anchors and a `jurisdiction_unknown` flag. The UI renders it with a cross-hatched panel: *"No statute anchored — treat as a strategy direction, not a legal conclusion."* That's the product *showing* its limit instead of hoping the user never finds it. The pattern is the same primitive Sentinel uses for hallucinations — same primitive doing different work for a different reader.

### 5. The reader's facts get their own tier
"You verify" is a distinct confidence band, not a flag. The reader isn't being asked to judge the AI's legal reasoning — they're being asked the *one* question they're uniquely qualified to answer: *"is this date right? is this plan type yours? did you keep those call logs?"* That partitioning of authority is what keeps the AI within its lane.

---

## What the prototype mocks vs. what a real backend would do

| Component in demo | Real-world equivalent |
|---|---|
| Hard-coded `CANONICAL_CASE` | User uploads an EOB / PDF / photograph; backend OCR pipeline returns structured `Case` |
| `extracted[]` with hard-coded bboxes | Vision LLM (Claude, GPT-4V) tool call returning `{ field, value, confidence, bbox }[]` |
| `claims[]` with hard-coded anchors | Loop classifier picks playbook; reasoning model generates claims; retrieval layer pulls verified statutes from a jurisdictional knowledge graph |
| `verifiedOn` hard-coded to "2026-05-12" | Statute-checking cron that re-validates each citation against canonical sources (Cornell LII, eCFR) on a cadence |
| `deadlines[]` hard-coded | Cadence engine — a backend job queue that schedules nudges by SMS/email N, N-7, N-1 days before each `dueAt` |
| "Send via certified mail" button | USPS Certified Mail API (or eFax / state e-filing where supported), receipt back into the deadline ledger |
| Single canonical case | Per-user case ledger; each loop has its own active `Case`; the dashboard view (out of scope for this prototype) lists them and surfaces the next deadline across all of them |

The component layer is the entirety of what this repo contains; the data layer is mocked. That's deliberate. The portfolio piece is the *interaction model*; the backend is the production work.

---

## What this prototype isn't trying to be

- **Not a chatbot.** Conversational interfaces hide the structure. A document-first workflow lets the user see what the AI saw.
- **Not a lawyer.** The "Ask a lawyer" confidence band is intentional — the AI's job is to win procedurally, force the disclosure, and run the clock, not to provide jurisdiction-specific legal advice.
- **Not a generic "legal AI for everything."** Picking one loop hard and shipping it well beats a flat surface of 30 loops half-baked.

---

## Where to go next

- [README](../README.md) — the thesis, install, and stack
- [PARITY_LAW.md](PARITY_LAW.md) — why mental-health denials are the right canonical case, and the legal mechanics under the hood
- [ARCHITECTURE.md](ARCHITECTURE.md) — file map, state flow, future API surface
- [src/types.ts](../src/types.ts) — every shape Recourse cares about, in ~120 lines
- [Sentinel](https://github.com/sinhaankur/Human-in-the-Loop) — the companion piece; same primitives, inverted oversight

# Architecture

How Recourse is wired, where the seams are, and where a real backend would slot in. Pairs with [HOW_IT_WORKS.md](HOW_IT_WORKS.md) (which covers the user-facing flow) and [PARITY_LAW.md](PARITY_LAW.md) (which covers the legal mechanics).

---

## File map

```
src/
├── App.tsx                      ← stage gate: Landing if stage="landing", else CaseCanvas
├── main.tsx                     ← wires RecourseProvider, mounts root
├── index.css                    ← Tailwind v4 @theme tokens, paper substrate, animations
├── types.ts                     ← Case, CaseClaim, StatuteAnchor, Deadline, ExtractedEntity
│
├── state/
│   └── recourse.tsx             ← React context: activeCase, stage, focusedEntityId, reset
│
├── data/
│   └── mockCase.ts              ← CANONICAL_CASE — the single demo fixture
│
├── lib/
│   ├── cn.ts                    ← clsx + tailwind-merge helper
│   └── format.ts                ← usd(), shortDate(), daysUntil()
│
└── components/
    ├── hero/
    │   └── Landing.tsx          ← landing page with thesis, case card, three pillars
    │
    ├── case/
    │   ├── CaseCanvas.tsx       ← orchestrator: progress bar, EOB persists, right rail rotates
    │   ├── EOBPaper.tsx         ← the document substrate + bounding-box overlay
    │   └── ExtractionPanel.tsx  ← right rail during stage="extracted"
    │
    ├── oversight/
    │   ├── CaseClaim.tsx        ← one AI claim with plain-language gloss + anchors
    │   └── DraftPreview.tsx     ← final letter preview + send CTA
    │
    └── primitives/
        ├── ConfidenceLabel.tsx  ← Settled / You verify / Ask a lawyer chip
        ├── StatuteChip.tsx      ← collapsible chip with citation, excerpt, verified-on
        ├── DeadlineMeter.tsx    ← countdown with hot/warm/cool/missed bands
        └── FlagBadge.tsx        ← Made up / Outdated cite / Your facts / etc.

docs/                            ← three deep-dive docs (this is one of them)
public/favicon.svg               ← ember R logo
.github/workflows/
└── deploy-pages.yml             ← build + deploy on push to main
```

---

## The orchestration

```
                                main.tsx
                                    │
                          ┌─ RecourseProvider ─┐
                          │   (activeCase,     │
                          │    stage,          │
                          │    focusedId,      │
                          │    reset)          │
                          └─────────┬──────────┘
                                    │
                                  App.tsx
                              (stage === "landing"?)
                                ┌───┴────┐
                              yes        no
                               │          │
                          Landing.tsx   CaseCanvas.tsx
                               │          │
                           CTA fires      ├─ ProgressBar (stage indicator)
                          setStage(       ├─ EOBPaper (always present, left)
                          "scanning")     ├─ Right rail rotates:
                          → setTimeout    │      scanning → ScanningPanel
                          → setStage(     │     extracted → ExtractionPanel
                          "extracted")    │      strategy → StrategyPanel
                                          │         draft → DraftPreview
                                          └─ Footer rail: Back / Next
```

`stage` is the only meaningful state transition. `focusedEntityId` is purely visual — used by `EOBPaper` and `ExtractionPanel` to coordinate the bidirectional hover anchor — but never changes what's rendered, only what's *styled*. That separation is intentional: the orchestration state is one variable; the coordination state is another.

---

## The component contract

### Stage components are dumb

`Landing`, `ScanningPanel`, `ExtractionPanel`, `StrategyPanel`, `DraftPreview` all read from the context (`useRecourse()`) and call `setStage` to advance. None of them take props for navigation. This is so the stage-advancement logic lives in one place — `CaseCanvas.tsx`'s footer rail — and so each panel can be reordered or skipped without renumbering.

If we add stage 5 (e.g., "track the response") later, it's: add a stage to the `FlowStage` union, append it to `stages[]` in `CaseCanvas`, add a label to `STAGE_CTA`, write the panel. No other components change.

### Primitives know one thing

Each component in [`components/primitives/`](../src/components/primitives/) renders exactly one shape from `types.ts`:

- `ConfidenceLabel` ← `ConfidenceLabel` type
- `StatuteChip` ← `StatuteAnchor`
- `DeadlineMeter` ← `Deadline`
- `FlagBadge` ← `FlagKind`

They are presentation-only. No context, no fetching, no side effects. This is what lets them be reused across Sentinel (when we eventually do) without dragging the whole state machine along.

### The EOB is a static substrate, not a real document

[`EOBPaper.tsx`](../src/components/case/EOBPaper.tsx) renders a *handcrafted* layout that *looks* like an EOB. There is no underlying PDF, no OCR, no actual document. The `extracted[]` array's `bbox` percentages are calibrated to where the handcrafted layout places each field.

This is a deliberate choice for the prototype. The portfolio reviewer needs to see the moment "AI reads a document" land convincingly; rendering an actual document via PDF.js + an actual OCR pipeline would 5× the work for the same demo effect. In production, this component would be replaced by:

```
<DocumentViewer
  src={uploadedFile}
  bboxes={extracted.map(e => e.bbox)}
  onBboxFocus={setFocusedEntityId}
/>
```

…where `DocumentViewer` renders the actual uploaded PDF/image, and bboxes are returned by the vision model alongside `extracted[]`.

---

## State flow

```
Initial state
  stage:           "landing"
  focusedEntity:   null
  activeCase:      CANONICAL_CASE   (loaded once by RecourseProvider)

User clicks "Run the example case"
  setStage("scanning")
  setTimeout(() => setStage("extracted"), 2200)

User hovers an extraction row
  setFocusedEntityId("ex-deadline")
  → ExtractionPanel renders that row with the ember accent
  → EOBPaper renders the matching bbox with the ember accent

User clicks "Show me the strategy"
  setStage("strategy")

User clicks "Show me the letter"
  setStage("draft")

User clicks "Restart the demo"
  reset() → setStage("landing"), setFocusedEntityId(null)
```

There is no async state, no fetching, no loading flags. The 2.2-second "scan" is a `setTimeout`. If real OCR were wired in, that timeout would be replaced by an actual API call, and a loading-state would need to be added to the stage type (e.g., split `scanning` into `scanning_in_flight` and `scanning_complete`). The shape of the change is small.

---

## Where the seams are

A real product slots in along five seams.

### Seam 1 — Document ingestion

**Today:** `mockCase.ts` exports one `CANONICAL_CASE`.
**Production:** an upload component (drag + drop, camera capture on mobile, email forwarding) pipes a file to a backend that returns `Case`. The component layer doesn't change; `RecourseProvider` takes a `Case | Case[]` rather than constructing one from a static fixture.

```tsx
<RecourseProvider initialCase={await ingestUploadedFile(file)}>
```

### Seam 2 — Vision extraction

**Today:** `extracted[]` is hand-authored with hand-calibrated bboxes.
**Production:** a vision-LLM tool call (Claude with image input, GPT-4V, etc.) returns a structured array. The shape is exactly `ExtractedEntity[]`; the only new infrastructure is the call itself, plus a confidence-thresholding step (low-confidence extractions should not get a `settled` label).

```ts
const extracted: ExtractedEntity[] = await visionExtract(pdfBuffer, {
  schema: ExtractedEntitySchema,
  prompt: EOB_EXTRACTION_PROMPT,
});
```

### Seam 3 — Loop classification + strategy generation

**Today:** `claims[]` is hand-authored to demonstrate the parity-violation playbook.
**Production:** a classifier picks the loop type (`parity_violation`, `surprise_bill`, `coding_error`, etc.) from the extracted entities and the document context. The chosen loop's playbook is a deterministic template — a list of `CaseClaim` *templates* with placeholder slots — that a reasoning model fills using the extracted facts. The statutes are pulled from a retrieval layer that knows which playbook needs which anchors.

This is the layer where the AI does its *legal* work. Everything upstream is document understanding; everything downstream is presentation.

### Seam 4 — Statute verification

**Today:** every `StatuteAnchor` has a hard-coded `verifiedOn: "2026-05-12"`.
**Production:** a backgrounded cron re-validates each anchor against canonical sources on a cadence (e.g., weekly). Specifically:

- U.S. Code citations checked against Cornell LII (`law.cornell.edu/uscode/...`)
- CFR citations checked against eCFR (`ecfr.gov/...`)
- Public Law citations checked against GovInfo
- Court decisions checked against CourtListener

Each successful check writes a new `verifiedOn` timestamp on the anchor. Each *failed* check (404, redirect, content drift beyond a similarity threshold) raises an alert and freezes the anchor as `stale_statute` until a human reviews it.

The `verifiedOn` shown in the UI is then trustworthy — it really means "this is good law as of this date."

### Seam 5 — Cadence engine + send

**Today:** `deadlines[]` is hand-authored and `DeadlineMeter` computes urgency client-side.
**Production:** the cadence engine is a backend job queue. Each `Deadline` has scheduled nudges (T-14, T-7, T-3, T-1, T-0) that fire via the user's chosen channel (email, SMS, push notification). The "Send via certified mail" CTA wires to a postal API (USPS Certified Mail or equivalent); the returned tracking number gets written to a `MailingRecord` keyed off the `DraftResponse.id`, and the delivery date triggers the *next* deadline in the engine (the institution's required response window).

The receipts are the user's audit trail. Without them, the institution can claim non-receipt. With them, the user has admissible proof of filing and the cadence engine has the timestamp it needs.

---

## What's not here (and why)

### No router

Single-page demo with five stages controlled by a state variable. A router was considered and rejected — for a four-step demo, URL state would mean either deep-linkable mid-state (which confuses portfolio reviewers who hit the page expecting the start) or hashbang gymnastics (which adds complexity without value). If a future version adds a multi-case dashboard, that's when a router belongs.

### No persistence

Each browser session starts at `stage: "landing"`. There is no `localStorage`, no IndexedDB, no backend. The demo is stateless. Persistence is a production-only concern: the demo's job is to make the interaction model legible, not to simulate session continuity.

### No analytics

This is a portfolio prototype. Telemetry would compromise the visual cleanliness and require a privacy posture that's premature for an unfunded prototype.

### No tests

Component tests are also premature. The visible artifact is the test — every commit either renders correctly or it doesn't, and the production build's TypeScript pass catches most regressions. When this graduates from prototype to product, the first tests to write are around the cadence engine's date math, not around the components.

---

## Build & deploy

### Local

```bash
npm install
npm run dev          # vite, http://localhost:5173
npm run build        # tsc -b + vite build → dist/
npm run preview      # serve the built dist/ for verification
```

### GitHub Pages

`.github/workflows/deploy-pages.yml` builds on every push to `main`, copies `dist/index.html` to `dist/404.html` for SPA fallback, uploads `dist/` as the Pages artifact, and deploys via the official `actions/deploy-pages` action. Concurrency-guarded so a half-baked build cannot overwrite a finished deploy.

The one-time setup on the GitHub repo is: **Settings → Pages → Source: GitHub Actions** (not "Deploy from a branch"). After that, every push to `main` deploys.

Live URL: **https://sinhaankur.github.io/Recourse/**

### Base path

`vite.config.ts` sets `base: "/Recourse/"` at build time so asset URLs in the built `index.html` resolve correctly under GitHub Pages' subdirectory hosting. Override with `VITE_BASE=/` if you ever need to preview the prod build at the filesystem root.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite 6** | Fast dev, sensible defaults, plays well with Tailwind v4 via `@tailwindcss/vite` |
| Framework | **React 19** + **TypeScript** (strict mode) | Same as Sentinel — sibling projects, shared mental model |
| Styling | **Tailwind v4** with `@theme` tokens | OKLCH palette, dark default + light mode, shared design language with Sentinel |
| State | **React Context** + hooks | One provider, four pieces of state — no need for Redux/Zustand at this scale |
| UI primitives | **Radix UI** (held in reserve) | Available for future dialogs/popovers; current demo is hover-and-keyboard only |
| Icons | **Lucide** | Consistent with Sentinel |
| Typography | **Inter** (body), **Fraunces** (display), **JetBrains Mono** (numeric) | Fraunces gives the demo a more editorial, less corporate-AI feel — fitting the consumer-side framing |

---

## Where to go next

- [README](../README.md) — the thesis, install, and stack
- [HOW_IT_WORKS.md](HOW_IT_WORKS.md) — the user-facing walkthrough
- [PARITY_LAW.md](PARITY_LAW.md) — why mental-health denials are the right canonical case
- [Sentinel](https://github.com/sinhaankur/Human-in-the-Loop) — the companion piece

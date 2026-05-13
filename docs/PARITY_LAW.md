# Why mental-health denials, and what's actually under the hood

The canonical Recourse case is not arbitrary. Every choice in the demo — the denial code, the number of sessions, the "self-funded ERISA" plan type, the ghost-network detail, the three-deadline cadence — is selected because it maps to a specific procedural lever in federal mental-health parity law. This document walks through the legal mechanics so the product decisions are legible.

> The statutes cited here are real. The patient, provider, plan numbers, and dollar amounts in the demo are fictional.

---

## Pick one: why this case, why now

Four reasons mental-health denials are the strongest opening loop for a consumer-side product:

1. **Live regulatory enforcement priority.** In September 2024 the Departments of Labor, Health and Human Services, and Treasury jointly issued a final rule overhauling Mental Health Parity and Addiction Equity Act (MHPAEA) implementation. The rule named "ghost networks" as a violation in itself, required plans to *measure and act on* data showing operational parity, and mandated written Non-Quantitative Treatment Limitation (NQTL) comparative analyses. Enforcement budget is rising. Plans are exposed.
2. **Sharp procedural attack with high leverage.** Most plans cannot, on demand, produce a compliant NQTL analysis for their medical-necessity review process. Requesting the analysis under 29 CFR § 2590.712(d) is a low-cost move that often results in the plan settling rather than producing the document. The lever is asymmetric in the user's favor.
3. **Sympathetic, recognizable story.** Therapist waitlists are months long; in-network directories are demonstrably inaccurate; patients pay out-of-network; the claim is denied for "non-medical necessity" with no medical review on record. This is the median experience of anyone trying to access mental-health care in the United States.
4. **The dollar amounts justify the unit economics.** Average mental-health claim in dispute lands in the $1K–$10K range — large enough to support a contingency model on recovery (15–25% of recovered amount), small enough that traditional legal representation is uneconomic. The gap between "needs a lawyer" and "doesn't need anything" is exactly where consumer-AI legal aid fits.

---

## MHPAEA — the federal floor

The **Paul Wellstone and Pete Domenici Mental Health Parity and Addiction Equity Act of 2008** (codified at 29 U.S.C. § 1185a, ERISA § 712; and 42 U.S.C. § 300gg-26, PHSA § 2726) requires that group health plans offering mental-health and substance-use-disorder (MH/SUD) benefits not impose treatment limitations on those benefits that are more restrictive than those applied to medical/surgical benefits.

The operative phrase, paraphrased: *"no more restrictive than the predominant treatment limitations applied to substantially all medical/surgical benefits."*

There are two kinds of treatment limitations the law cares about:

- **Quantitative Treatment Limitations (QTLs)** — numerical caps (e.g., "30 visits per year"). The math is straightforward to check.
- **Non-Quantitative Treatment Limitations (NQTLs)** — process-based restrictions (e.g., medical-necessity review, prior authorization, step therapy, network composition, provider-reimbursement methodologies). NQTLs are where parity violations actually hide, because they're judgment calls dressed up as policy.

The 2024 final rule pushed NQTL enforcement from "is the policy *written* as parity-compliant?" to "is the policy *operating* as parity-compliant?" That move is the entire reason this demo's strategy works.

---

## NQTL parity — the operative test

A plan cannot impose an NQTL on MH/SUD benefits unless the **processes, strategies, evidentiary standards, and other factors** used in applying the limitation are *comparable to, and applied no more stringently than*, those used in applying the limitation to medical/surgical benefits. (See 45 CFR § 146.136(c)(4) and 29 CFR § 2590.712(c)(4).)

In practice, the test has two prongs:

1. **In design** — does the written policy treat MH/SUD comparably to medical/surgical?
2. **In operation** — do the *outcomes* of the policy demonstrate comparable application?

The 2024 final rule made the operational prong measurable. Plans are now required to collect and evaluate data on:

- in-network reimbursement rates,
- out-of-network utilization,
- network composition (provider counts, geographic adequacy, accepting-new-patients status),
- the rate at which medical-necessity denials are upheld vs. overturned on appeal.

If MH/SUD outcomes look meaningfully worse than medical/surgical outcomes for comparable services, the plan is presumptively in violation — and has to prove it isn't.

---

## The disclosure right — the loop's pressure point

The leverage move for this kind of denial is not the appeal itself. It's the **NQTL comparative analysis disclosure request**.

Under 29 CFR § 2590.712(d), a plan must, *upon request*, provide:

- the criteria used to make a medical-necessity determination in the MH/SUD classification;
- the comparative analysis demonstrating parity in the application of those criteria;
- the data supporting that the criteria are operating in parity.

The participant or beneficiary (or their representative) can request this. The plan administrator has to respond. The 2024 final rule made this disclosure binding: plans cannot apply an NQTL without having a compliant written comparative analysis already in hand.

What happens in practice:

- Many plans, especially self-funded employer plans administered by a Third-Party Administrator, **do not have a compliant NQTL analysis** ready for medical-necessity reviews in the MH classification. Producing one takes weeks of work and may surface their own violations.
- Faced with a disclosure request paired with an appeal that *cites the disclosure obligation*, the plan often quietly settles the claim instead of producing the document.
- If the plan does produce the document, the user (or their counsel, if it escalates) now has the plan's own admission of how it applies medical-necessity standards — which is the input for any subsequent enforcement action.

This is why the demo's draft letter does *both* in one filing: appeals the denial *and* requests the NQTL analysis under § 2590.712(d). The disclosure ask is the lever.

---

## Ghost networks — the parity-in-operation hook

A "ghost network" is a plan's published in-network directory that — when actually called — turns out to consist mostly of providers who aren't accepting patients, have left the network, or never were in-network in the first place.

Until 2024, this was treated as a network-adequacy problem. The 2024 tri-agency final rule reclassified it as a **parity** problem when it disproportionately affects MH/SUD providers. Specifically: if the plan's in-network availability for psychotherapists is materially worse than for medical/surgical providers in the same geography, that disparity itself is evidence of an NQTL parity failure (because network composition is an NQTL).

In the demo, the canonical case includes a line in the EOB extraction: *"Directory references 10 LCSWs; 8 verified not accepting patients (Mar–Apr 2026)."* That is not flavor text. It is a parity-relevant fact that the user has to bring (the AI can read the directory but can't verify which providers are accepting patients without the user's calls). The "you verify" tier on that extraction is doing legal work.

The instruction in the demo's `userVerifies` field on Claim 3 — *"Save your call logs / directory screenshots — Recourse will attach them to the appeal"* — exists because the user is the only one who can produce that evidence, and the plan can't dispute it after the fact if the user has dated screenshots.

---

## ERISA self-funded vs. fully insured — why "plan type" is `verify`-tier

The procedural path differs based on plan type.

- **Fully insured plans** — regulated by state insurance commissioners; have state-level external review processes administered by independent review organizations (IROs); subject to state parity laws *and* federal MHPAEA.
- **Self-funded ERISA group plans** — regulated by the U.S. Department of Labor (Employee Benefits Security Administration); follow federal external review processes; *not* subject to state insurance regulation, including most state parity laws.

The same MHPAEA core applies in both cases, but the **enforcement venue, the external review timing, and the available remedies are different**. So before the AI can give the user definitive guidance on "after this denial, you have X days to do Y," it has to know which kind of plan they have.

That information is *on the EOB* in many cases, but plans don't always label it cleanly. So the demo extracts "Self-funded ERISA group plan" with confidence `verify` and a `user_dependent` flag. The user is asked to confirm via their benefits booklet or HR portal.

This is one example of a general pattern in the product: there are facts the AI can read off the document but can't verify, and the user has to confirm. The product makes that ask visible rather than guessing.

---

## The three-deadline cadence

The cadence engine in the demo surfaces three deadlines because there are, in reality, three:

### 1. Internal appeal — 90–180 days

Under the ACA's claims and appeals regulations (29 CFR § 2590.715-2719), a non-grandfathered group health plan must give a participant at least **180 days** to file an internal appeal of an adverse benefit determination. Many plans give exactly 180 days; some give 90 or 120. The clock starts on the date the adverse determination was received.

The demo uses 90 days to make the urgency more demo-able. In a real flow, the AI reads the actual deadline off the EOB (the demo's extracted "Aug 6, 2026 (90 days from received)" is literally what the document says).

### 2. NQTL disclosure request — separate, earlier

The disclosure right under 29 CFR § 2590.712(d) has its own implicit timing. There is no statutory deadline for *making* a disclosure request, but there are two practical reasons to do it early:

- The plan must respond within the regulation's reasonable-time framework, and the response (or non-response) informs the appeal argument. So the request needs to be filed early enough that the response (or notable lack of response) is available before the internal appeal is decided.
- A separately-filed disclosure request creates a paper trail independent of the appeal. If the plan ignores both, the user has two grounds for the next step (external review or DOL referral).

The demo schedules this 8 weeks before the internal appeal deadline. The cadence engine surfaces it as `warm` (33 days).

### 3. External review — opens after internal denial

If the internal appeal is denied, the user can request external review by an Independent Review Organization (IRO). For self-funded ERISA plans, the federal external review process applies; for fully-insured plans, the state process applies. **The external review window has its own deadline** — typically four months from the final internal denial.

The demo surfaces this as a third deadline, calibrated to ~120 days after the internal appeal deadline, so the user understands: "you will likely need to file a *second* document, and there is a *second* clock."

---

## What the demo's draft letter actually does

The text in [DraftPreview.tsx](../src/components/oversight/DraftPreview.tsx)'s `draft.body` is doing three things in one filing:

1. **Appeals the denial** on the merits — argues that a blanket CO-50 across 14 sessions without a documented medical-necessity review is itself a parity violation, and asks for reversal.
2. **Requests the NQTL comparative analysis** under 29 CFR § 2590.712(d), with specificity about what the analysis must include (processes, strategies, evidentiary standards, data demonstrating operational parity).
3. **Anchors the request in 2024 tri-agency rule language** — citing the operational-parity standard the final rule introduced, and naming the network-adequacy disparity (the ghost network) as a parity-relevant fact.

The closing sentences serve two purposes:

- They invoke the expedited timeframes from 29 CFR § 2590.715-2719, which constrains the plan's response window.
- They reserve the right to refer non-compliance to the DOL's Employee Benefits Security Administration. That's a credible escalation threat for a self-funded ERISA plan — the DOL is the actual enforcement body, and they have been actively bringing parity enforcement actions since the 2024 rule.

The user, by reading the draft *before* it goes out, knows that all three are being requested in their name. That's the whole product.

---

## Statutes and regulations referenced

| Citation | What it does |
|---|---|
| **29 U.S.C. § 1185a** (ERISA § 712) | MHPAEA — federal parity floor for ERISA-governed group health plans |
| **42 U.S.C. § 300gg-26** (PHSA § 2726) | Parallel MHPAEA provision for non-ERISA plans (individual market, etc.) |
| **45 CFR § 146.136** | HHS implementing regulation for MHPAEA in the group market |
| **29 CFR § 2590.712** | DOL implementing regulation for MHPAEA, including § 2590.712(c)(4) (NQTL parity test) and § 2590.712(d) (disclosure rights) |
| **29 CFR § 2590.715-2719** | ACA claims and appeals procedures (180-day internal appeal floor, external-review process, expedited-review rules) |
| **2024 Final Rule, MHPAEA Implementation** (DOL / HHS / Treasury) | The operational-parity standard, NQTL comparative analysis requirement, ghost-network-as-parity-failure framing |

All citations in the demo are verified as of `2026-05-12` (the value baked into the `verifiedOn` field of each `StatuteAnchor`). In a production system, that date is the output of an automated check against canonical sources (Cornell LII for U.S. Code, eCFR for federal regulations), re-run on a cadence so that stale citations get flagged before they're used in a letter.

---

## Beyond this case

The pattern generalizes. Other "loops" Recourse could open after the canonical mental-health case:

- **Surprise emergency-room out-of-network billing** — different statute (No Surprises Act, 42 U.S.C. § 300gg-111), different timing (federal Independent Dispute Resolution within 30 business days), same UI.
- **Substance-use-disorder denials** — same MHPAEA / NQTL framework, different clinical context.
- **Wegovy / GLP-1 obesity denials** — the operational-parity argument applies if the plan covers obesity surgery but not pharmacotherapy. Active enforcement frontier.
- **Autism / ABA therapy denials** — long-running parity battleground; many state-level statutory anchors layered on top of federal MHPAEA.
- **Continuity-of-care denials** during plan transitions — federal protection under ACA § 2799A-3, but the procedural path is poorly understood.

Each adds a `loopKind` to the type system and a playbook to the classifier. The component layer stays unchanged: same `EOBPaper`, same `CaseClaim`, same cadence engine, different anchors.

---

## A note on what this is and isn't

Recourse, in its current form, is a prototype designed to make the *interaction model* legible. It is **not** legal advice. The statutes and citations are real; the procedural moves described are real; the appeal letter, if filed verbatim, is the kind of letter a sophisticated layperson or paralegal might draft. But the application of these moves to a real person's case requires judgment about facts only that person knows — and, in some cases, judgment a lawyer should make.

The "Ask a lawyer" confidence band, the "you verify" panels, and the unanchored-claim demotion are not UI flourishes. They are the product's posture on its own limits. Building consumer-side legal AI without that posture is how DoNotPay got fined.

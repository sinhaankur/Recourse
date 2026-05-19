# Legal and compliance

Honest accounting of what Recourse is, what it isn't, and where the compliance gaps sit between today and a real product for end users or B2B customers. This page is binding on anyone using the software — the MIT license below disclaims liability, but everyone should understand the legal posture before they rely on it.

> **TL;DR**: Recourse helps you read documents and identify procedural defenses. It is **not legal advice**, does **not create an attorney–client relationship**, and is **not a substitute for a lawyer** in high-stakes situations. For anything where a wrong answer costs you significant money, the loss of a benefit, or impacts a court deadline, get a licensed attorney to review what the tool produced before you act on it.

---

## What Recourse is

A document-reading and analysis tool. It uses a local vision-language model (via Ollama) to:

1. Extract structured fields from a denial letter, EOB, or hospital bill (the *denial-reader* path).
2. Surface procedural patterns in a policy document — what's covered, excluded, vague, silent on, or procedurally gated (the *policy-decoder* path).

It runs on your machine. It does not send your documents anywhere. It does not have an account system. It does not store anything between sessions.

## What Recourse is not

- **Not legal advice.** Recourse does not interpret the law for your specific situation. It identifies patterns and surfaces statutes that *may* be relevant. Whether they apply to your case is a legal judgment only a licensed attorney can make.
- **Not an attorney.** Using Recourse does not create an attorney–client relationship with the author or anyone associated with this project. Conversations through Recourse are not protected by attorney–client privilege.
- **Not a substitute for professional review** when the stakes are high. The "Ask a lawyer" confidence band exists for a reason. Some moves — court filings, six-figure disputes, anything time-critical with statute-of-limitations exposure — require human counsel.
- **Not certified for any compliance regime.** Recourse is not HIPAA-certified, not SOC 2 compliant, not GDPR-audited, and not a HIPAA Business Associate. If you are an entity subject to those regimes (a hospital, an insurer, a covered employer), you must do your own analysis before integrating it.
- **Not a guarantor of accuracy.** The underlying vision models are 7B–11B parameter open-weights models running locally. They make mistakes. The "settled / verify / ask a lawyer" labels on extracted fields are the product's posture on its own limits — *that* posture is the product, not "we got the right answer."

## Unauthorized Practice of Law (UPL)

The practice of law is regulated state-by-state in the United States. **Generating an appeal letter from a template is not the practice of law.** Telling someone "your case will win because of X" is.

Recourse tries to stay on the right side of this line by:

- Surfacing statute references, not legal conclusions.
- Using calibrated language (`settled` / `you verify` / `ask a lawyer`) instead of confident predictions.
- Always flagging when a question depends on jurisdiction or facts the user must verify.
- Never claiming to represent the user.
- Generating draft language the user reviews and signs themselves — Recourse does not send anything on the user's behalf.

This posture is similar to the line that consumer legal tech (LegalZoom, Rocket Lawyer, fightHealthInsurance.com) has historically held. It is not a guarantee that any specific state regulator agrees in every fact pattern. **If you are deploying Recourse commercially, get UPL guidance specific to your state and use case.**

The cautionary tale here is **DoNotPay** — they were fined $193K by the FTC in 2024 after marketing themselves as "the world's first robot lawyer" while not, in fact, providing licensed legal services. The takeaway: don't claim to be a lawyer, don't claim outcomes you can't deliver, don't hide the limits.

## HIPAA and health-information posture

Insurance documents typically contain Protected Health Information (PHI) under HIPAA: claim numbers, dates of service, diagnoses, treatments, provider names, billing codes.

Recourse's posture is **local-only processing**:

- The web app runs in the user's browser. Documents are uploaded, but only into memory, then sent locally to `localhost:11434` (the Ollama daemon on the same machine).
- The MCP server runs in the user's terminal. It reads files from disk and sends them to local Ollama.
- Neither path makes any cloud API call. There is no telemetry. There is no analytics. There is no remote logging.
- Documents are not persisted by Recourse anywhere — when the user closes the tab or kills the MCP process, the document is gone from Recourse's memory.

This is not the same as HIPAA compliance. HIPAA compliance is a regulatory designation that requires:

- A Business Associate Agreement (BAA) between the user/entity and the software vendor.
- Documented administrative, physical, and technical safeguards.
- Breach notification procedures.
- Audit logs and access controls.
- Regular risk assessments.

Recourse, as published, does **not** offer any of these. The local-only posture means a **user acting alone** is not exposing their data to a third party — but if Recourse is deployed inside an entity (a hospital, a billing service, an employer) that handles patients other than itself, the *deploying entity* is responsible for HIPAA compliance of their use of Recourse, just as they would be for any local tool they install.

For **B2B prospects asking about HIPAA**: the honest answer is that Recourse, as an open-source local tool, can be deployed inside a HIPAA-compliant workflow if the deploying entity (a) confines its use to its own systems, (b) does not transmit PHI to any third party as part of using Recourse (it doesn't, by design), and (c) wraps it in their own existing administrative, physical, and technical safeguards. Recourse itself is not the BAA-required vendor in that scenario — the deploying entity is the data controller, and Recourse is a tool they run on their own infrastructure.

If a B2B prospect needs Recourse-the-vendor to sign a BAA, that requires a hosted/SaaS version of the product with the appropriate controls in place, which **does not currently exist**.

## State variance in insurance regulation

Health-insurance regulation in the United States is shared between federal law and state law:

- **Federal** — MHPAEA (mental health parity), ACA (claims and appeals procedures), ERISA (employer plan rules), No Surprises Act, HIPAA, Medicare/Medicaid statutes.
- **State** — fully-insured plan regulation, state parity laws (often broader than federal MHPAEA), external-review procedures, insurance commissioner enforcement, UDAP (Unfair and Deceptive Acts and Practices) statutes used in insurance bad-faith litigation.

This means the same denial in California and Texas can have meaningfully different procedural paths. **Recourse does not currently cross-reference state-mandate floors against the policy** — that's noted as the next layer in the [architecture doc](ARCHITECTURE.md) and the [README](../README.md). Until it does, the user has to verify state-specific procedure separately.

When Recourse adds state cross-reference, the data source will be public statutory text from authoritative sources (each state legislature's posted statutes, eCFR for federal regulations, NAIC model laws). The product will name its source and verification date for every state-specific claim — same `verifiedOn` pattern as federal statutes.

## Compliance gaps before B2B production use

For a B2B prospect (medical billing service, patient advocacy firm, insurance broker, legal-aid clinic) to deploy Recourse in production, the following gaps exist today:

| Gap | Severity | What's needed |
|---|---|---|
| No SOC 2 Type II | High for enterprise contracts | 6–12 month audit cycle, ~$25–50K for a startup |
| No HIPAA BAA available | High for any PHI-handling org | Hosted/SaaS version with appropriate controls; BAA template |
| No GDPR posture | High for EU customers | DPIA, DPA terms, data-subject-access plumbing |
| No CCPA/CPRA posture | Medium for California consumers | Privacy policy update, deletion/access endpoints |
| No audit logs in the engine | High for any regulated workflow | Add structured logging to the MCP server + REST layer (when built) |
| No user-level encryption-at-rest | Medium | Encrypt persisted documents (only relevant if persistence is added) |
| No model card or eval suite | High for compliance review | Document model selection, bias testing, accuracy on representative dataset |
| No DPA / contract templates | High | Data Processing Agreement, Master Services Agreement |

The honest read: **Recourse today is a research/portfolio artifact and a tool individuals can run on their own machines**. Adapting it for B2B production use requires the work listed above, in addition to engineering work on transports, persistence, and integration.

## Statute references

Every statute citation in Recourse — whether in the canonical demo cases or in the prompt output — is a real U.S. statute or regulation. Citations include a `verifiedOn` date that names when the citation was last confirmed against canonical sources (Cornell LII for U.S. Code, eCFR for federal regulations, the issuing state for state statutes).

**Verification posture**:

- In the hand-authored canonical cases (`src/data/`), citations are verified by the author against Cornell LII / eCFR at the date stamped on each `StatuteAnchor`.
- In the upload-mode and decoder outputs, citations are produced by the local language model. The "verified on" date in those outputs reflects the date of the model's training data and is **not** independently verified against current statutes. Treat them as leads, not facts.

If a citation in Recourse output is wrong, stale, or hallucinated, file an issue. Citation accuracy is a first-class quality bar.

## Privacy and data handling

| Question | Answer |
|---|---|
| Does Recourse send my documents to a cloud? | **No.** All vision-LLM calls go to `localhost:11434` (your local Ollama daemon). |
| Does Recourse have analytics or telemetry? | **No.** No `gtag`, no Sentry, no PostHog, no Mixpanel, no anything. |
| Does Recourse store my documents between sessions? | **No.** The web app holds them in memory until the tab closes. The MCP server reads them from disk on each call and never writes them anywhere. |
| Does Recourse log what I ask it? | **No.** Beyond what your operating system or browser does on their own (which is outside Recourse's control), there is no Recourse-side log. |
| Are my documents transmitted to GitHub Pages? | **No.** The static site at `sinhaankur.github.io/Recourse/` is JavaScript that runs locally in your browser. It loads no document data over the network during use. |
| Are documents transmitted to Ollama servers? | **No.** Ollama runs locally on your machine. The `localhost:11434` endpoint is your machine talking to itself. |

The local-only posture is the product's strongest privacy property. It is also a limitation: any feature that would require remote computation (cloud LLM, statute lookup against a remote DB, multi-user collaboration) breaks this posture and would require explicit user opt-in and the compliance work listed above.

## Liability disclaimer

Recourse is distributed **AS IS** under the MIT License (see [`LICENSE`](../LICENSE)). The author and contributors:

- Make no warranty of fitness for any particular purpose.
- Are not liable for any outcome resulting from use of the software, including but not limited to denied appeals, missed deadlines, monetary loss, or adverse legal consequences.
- Do not provide legal services through this software.
- Will not be your lawyer because you used this tool.

If you are facing a serious legal or financial situation, consult a licensed attorney in your jurisdiction.

## Open-source license

[MIT License](../LICENSE). You can use Recourse for personal, commercial, or research purposes, with attribution. The license does not transfer any obligation to provide legal advice and explicitly disclaims warranty.

## Reporting issues

- **Inaccurate statute citation**: open an issue at the repo with the statute, the citation in question, and a link to the authoritative current text.
- **Hallucinated output**: open an issue with the input document type (don't include actual PHI), the model used, and the hallucinated text.
- **Security vulnerability**: report privately via GitHub Security Advisories.

---

This document is informational and reflects the state of Recourse at the time of writing. It is not itself legal advice for the user's specific situation. Last reviewed: 2026-05-18.

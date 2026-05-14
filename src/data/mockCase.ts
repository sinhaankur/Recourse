import type { Case } from "@/types";

/**
 * Canonical demo case — an out-of-network mental health denial with a
 * parity-law attack surface. Picked because:
 *
 * - It maps to current enforcement priorities (DOL + tri-agency rules
 *   on MHPAEA, 2024–2026 enforcement guidance).
 * - The procedural defense is sharp: payers must document parity in their
 *   non-quantitative treatment limitations (NQTL); the disclosure request
 *   itself usually breaks the loop.
 * - It is a story most reviewers recognize — in-network therapists have
 *   months-long waitlists, patients pay out-of-network, then the claim
 *   is denied for "non-medical necessity" with no parity audit.
 *
 * Names and identifiers are fictional. All statutes and codes are real.
 */
export const CANONICAL_CASE: Case = {
  id: "case-mhp-001",
  loopKind: "parity_violation",
  displayName: "Mental-health denial",
  documentTitle: "Explanation of Benefits",
  insurer: "Northshore Health (Plan #N-4218)",
  patientLabel: "M.R. (you)",
  provider: "Dr. Sara Levin, LCSW — out-of-network",
  summary:
    "Northshore denied 14 sessions of out-of-network psychotherapy as 'not medically necessary.' The in-network directory is stale (8 of 10 listed therapists are not accepting patients), and the plan has not produced the parity (NQTL) analysis the rule requires.",
  amountInDispute: 387_600, // $3,876 — 14 sessions at $277/session billed
  recoveryEstimate: 248_500, // $2,485 — plan's stated allowed amount × 14
  receivedAt: "2026-05-08",

  paperMeta: {
    organizationLine: "Northshore Health · Member Services",
    referenceId: "Claim # N-4218-A",
    cornerLabel: "Not a bill",
    cornerSubtitle: "For your records.",
    subjectRows: [
      ["Member", "M.R. ····7421"],
      ["Plan", "Self-funded ERISA group plan"],
      ["Provider", "Dr. Sara Levin, LCSW (OON)"],
      ["Service period", "Feb 4 – Apr 29, 2026 · 14 visits"],
    ],
    columnLabels: {
      description: "Service · CPT",
      col1: "Billed",
      col2: "Allowed",
      col3: "Plan paid",
      col4: "You owe",
    },
    footerHeadline: "Appeal rights.",
    footerBody:
      "You may request an internal appeal of this determination within 180 days. Submit appeals to Northshore Health, Appeals Department, PO Box ····, by certified mail or via the member portal. Internal appeal must be filed by Aug 6, 2026. You may also request the criteria used to make this determination.",
  },

  billLines: [
    {
      id: "ln-1",
      cptCode: "90837",
      description: "Psychotherapy, 60 min",
      dateOfService: "2026-02-04",
      billed: 27_700,
      allowed: 17_750,
      paid: 0,
      patientResponsibility: 27_700,
      denialReason: { code: "CO-50", text: "Not medically necessary" },
      disputeAngle:
        "CO-50 on 90837 across 14 consecutive visits without a medical-necessity review is a classic NQTL flag.",
    },
    {
      id: "ln-2",
      cptCode: "90837",
      description: "Psychotherapy, 60 min",
      dateOfService: "2026-02-11",
      billed: 27_700,
      allowed: 17_750,
      paid: 0,
      patientResponsibility: 27_700,
      denialReason: { code: "CO-50", text: "Not medically necessary" },
    },
    {
      id: "ln-3",
      cptCode: "90837",
      description: "Psychotherapy, 60 min",
      dateOfService: "2026-02-18",
      billed: 27_700,
      allowed: 17_750,
      paid: 0,
      patientResponsibility: 27_700,
      denialReason: { code: "CO-50", text: "Not medically necessary" },
    },
    {
      id: "ln-4",
      cptCode: "90837",
      description: "Psychotherapy, 60 min · (+11 visits collapsed)",
      dateOfService: "2026-04-29",
      billed: 277_000,
      allowed: 177_500,
      paid: 0,
      patientResponsibility: 277_000,
      denialReason: { code: "CO-50", text: "Not medically necessary" },
    },
    {
      id: "ln-5",
      cptCode: "—",
      description: "Patient responsibility (cumulative)",
      dateOfService: "2026-05-08",
      billed: 0,
      allowed: 0,
      paid: 0,
      patientResponsibility: 387_600,
    },
  ],

  extracted: [
    {
      id: "ex-deadline",
      field: "Internal appeal deadline",
      value: "Aug 6, 2026 (90 days from received)",
      bbox: { x: 58, y: 18, w: 38, h: 6 },
      confidence: "settled",
      flags: [],
    },
    {
      id: "ex-amount",
      field: "Amount in dispute",
      value: "$3,876.00",
      bbox: { x: 60, y: 72, w: 30, h: 5 },
      confidence: "settled",
      flags: [],
    },
    {
      id: "ex-denial",
      field: "Denial reason on record",
      value: "CO-50 · Not medically necessary",
      bbox: { x: 8, y: 44, w: 52, h: 5 },
      confidence: "settled",
      flags: [],
    },
    {
      id: "ex-plan-type",
      field: "Plan type",
      value: "Self-funded ERISA group plan",
      bbox: { x: 8, y: 26, w: 36, h: 4 },
      confidence: "verify",
      flags: ["user_dependent"],
    },
    {
      id: "ex-network",
      field: "In-network availability",
      value: "Directory references 10 LCSWs; 8 verified not accepting patients (Mar–Apr 2026)",
      bbox: { x: 8, y: 56, w: 60, h: 5 },
      confidence: "verify",
      flags: ["user_dependent"],
    },
  ],

  claims: [
    {
      id: "cl-1",
      text:
        "Denying 14 consecutive 90837 sessions as 'not medically necessary' without a documented medical-necessity review is a Non-Quantitative Treatment Limitation that triggers a parity disclosure obligation.",
      plainLanguage:
        "They have to show their work. Federal law requires the insurer to prove they apply the same review standard to mental health as they do to physical conditions.",
      confidence: "settled",
      anchors: [
        {
          id: "an-mhpaea",
          citation: "29 U.S.C. § 1185a",
          shortName: "Mental Health Parity and Addiction Equity Act",
          excerpt:
            "A group health plan that provides both medical/surgical benefits and mental health or substance use disorder benefits shall ensure that the treatment limitations applicable to mental health or substance use disorder benefits are no more restrictive than the predominant treatment limitations applied to substantially all medical/surgical benefits.",
          url: "https://www.law.cornell.edu/uscode/text/29/1185a",
          verifiedOn: "2026-05-12",
        },
        {
          id: "an-cms-nqtl",
          citation: "45 CFR § 146.136(c)(4)",
          shortName: "NQTL parity rule",
          excerpt:
            "A plan may not impose a non-quantitative treatment limitation with respect to mental health or substance use disorder benefits in any classification unless ... the processes, strategies, evidentiary standards, and other factors used in applying the limitation … are comparable to, and applied no more stringently than, those used in applying the limitation … to medical/surgical benefits.",
          url: "https://www.ecfr.gov/current/title-45/section-146.136",
          verifiedOn: "2026-05-12",
        },
      ],
      flags: [],
      userVerifies: [
        "Confirm this is a self-funded ERISA plan (says so on your benefits booklet cover or HR portal).",
      ],
    },
    {
      id: "cl-2",
      text:
        "You can compel the insurer to produce its NQTL comparative analysis as part of your appeal. Most plans cannot — and quietly approve the claim instead of producing the document.",
      plainLanguage:
        "The leverage move: ask for their parity homework. They often haven't done it, and would rather pay you than admit that.",
      confidence: "settled",
      anchors: [
        {
          id: "an-cms-disclosure",
          citation: "29 CFR § 2590.712(d)",
          shortName: "MHPAEA disclosure of NQTL analysis",
          excerpt:
            "The plan administrator shall make available to any current or potential participant, beneficiary, or contracting provider … upon request, the criteria for medical necessity determinations made with respect to mental health or substance use disorder benefits.",
          url: "https://www.ecfr.gov/current/title-29/section-2590.712",
          verifiedOn: "2026-05-12",
        },
      ],
      flags: [],
    },
    {
      id: "cl-3",
      text:
        "Your network's stale directory is itself a parity-relevant fact: 'ghost networks' for mental health are an enforcement priority under tri-agency guidance.",
      plainLanguage:
        "If their list of in-network therapists is fake, that's evidence — not just bad luck. The government is currently fining plans for this.",
      confidence: "verify",
      anchors: [
        {
          id: "an-triagency",
          citation:
            "2024 Final Rule, MHPAEA Implementation (DOL/HHS/Treasury)",
          shortName: "2024 tri-agency final rule",
          excerpt:
            "Plans must collect and evaluate data on the operation of NQTLs, including network composition, in-network reimbursement rates, and out-of-network utilization, to ensure parity in operation, not just in design.",
          verifiedOn: "2026-05-12",
        },
      ],
      flags: ["user_dependent"],
      userVerifies: [
        "Save your call logs / directory screenshots — Recourse will attach them to the appeal.",
      ],
    },
    {
      id: "cl-4",
      text:
        "Your state may give you a second window: an external review by an independent reviewer after the internal appeal is exhausted, often with a separate deadline.",
      plainLanguage:
        "If they say no, you usually get to ask an outside reviewer — but only if you don't miss that next deadline.",
      confidence: "lawyer",
      anchors: [],
      flags: ["jurisdiction_unknown"],
      userVerifies: [
        "We need to confirm your state and whether your plan is fully insured or self-funded — the path differs.",
      ],
    },
  ],

  deadlines: [
    {
      id: "dl-1",
      label: "Internal appeal must be filed",
      dueAt: "2026-08-06",
      consequence: "missed_appeal",
    },
    {
      id: "dl-2",
      label: "Parity (NQTL) disclosure request — separate letter",
      dueAt: "2026-06-15",
      consequence: "right_lost",
    },
    {
      id: "dl-3",
      label: "External review window opens after internal denial",
      dueAt: "2026-09-10",
      consequence: "second_window_opens",
    },
  ],

  draft: {
    id: "draft-1",
    kind: "internal_appeal",
    recipient: "Northshore Health, Appeals Department",
    subject: "Internal appeal · Claim #N-4218-A · Parity disclosure requested",
    body: `Dear Appeals Reviewer,

I am appealing the denial of 14 outpatient psychotherapy sessions (CPT 90837) furnished between February 4 and April 29, 2026, by Dr. Sara Levin, LCSW. The denials cite CO-50 — "not medically necessary" — across every session, without a documented medical-necessity review communicated to me.

I request that you (1) overturn the denials, and (2) under 29 CFR § 2590.712(d) and the 2024 MHPAEA Final Rule, produce the plan's Non-Quantitative Treatment Limitation (NQTL) comparative analysis for medical-necessity reviews in the outpatient mental-health classification. This must include:

  · the processes, strategies, evidentiary standards, and other factors used,
  · how the same factors are applied to medical/surgical benefits in that classification,
  · the data demonstrating parity in operation, including network adequacy data.

I have attempted to use the in-network directory. Of the 10 LCSWs listed in zip code 60615, 8 confirmed by phone (March–April 2026) that they are not currently accepting patients on this plan. Records of those calls are attached. Network adequacy in the mental-health classification is a parity-relevant fact under the 2024 tri-agency final rule.

Please process this appeal under the expedited timeframes in 29 CFR § 2590.715-2719 and provide a written determination within the required window. I reserve the right to request external review and to refer non-compliance with the disclosure obligation to the Department of Labor's Employee Benefits Security Administration.

Sincerely,
M.R.
(Member ID withheld in this draft; Recourse will fill it from your portal before sending.)`,
    anchors: [
      {
        id: "an-mhpaea",
        citation: "29 U.S.C. § 1185a",
        shortName: "MHPAEA",
        excerpt: "...treatment limitations no more restrictive...",
        verifiedOn: "2026-05-12",
      },
      {
        id: "an-cms-disclosure",
        citation: "29 CFR § 2590.712(d)",
        shortName: "NQTL disclosure",
        excerpt: "...criteria for medical necessity determinations...",
        verifiedOn: "2026-05-12",
      },
    ],
  },
};

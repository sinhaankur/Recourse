import type { Case } from "@/types";

/**
 * Second canonical case — a surprise out-of-network ER balance bill that
 * is illegal under the No Surprises Act (NSA, in force since 2022).
 *
 * The story: patient went to an in-network hospital ER and was treated
 * by an emergency physician who is not contracted with the patient's
 * insurer. The physician group sent a balance bill for the difference
 * between their charge and what insurance allowed. The NSA bars this
 * outright — for emergency services, the patient owes only in-network
 * cost-sharing, period. There is no notice-and-consent waiver for
 * emergency services.
 *
 * Picked as the second canonical case because:
 *
 * - Different statute (No Surprises Act / Public Health Service Act
 *   § 2799A-1) from the first case — proves the framework generalizes
 *   without re-using MHPAEA infrastructure.
 * - Different document type — a provider bill, not an insurer EOB —
 *   stress-tests the EOBPaper renderer's parameterization.
 * - Different leverage shape — the first case's lever is forcing a
 *   disclosure; this case's lever is invoking a federal prohibition.
 *   Same UI primitives carry both.
 * - Different recovery economics — $2,120 wiped from the patient's
 *   liability, not recovered as a payment. The "recoveryEstimate"
 *   field semantically means "what this fight is worth to you."
 *
 * Names and identifiers are fictional. All statutes and codes are real.
 */
export const SURPRISE_BILL_CASE: Case = {
  id: "case-nsa-001",
  loopKind: "surprise_bill",
  displayName: "Surprise ER balance bill",
  documentTitle: "Patient Statement",
  insurer: "(insurer paid; this is the provider's separate bill)",
  patientLabel: "J.K. (you)",
  provider: "West End Emergency Physicians Group",
  summary:
    "J.K. went to an in-network hospital ER. The treating emergency physician was out-of-network. Their billing group sent a $2,120 'balance bill' for the difference between their charge and what insurance allowed — a practice the No Surprises Act made illegal for emergency services in 2022.",
  amountInDispute: 212_000, // $2,120 — the illegal balance bill
  recoveryEstimate: 212_000, // recovery here = the whole bill wiped
  receivedAt: "2026-04-22",

  paperMeta: {
    organizationLine: "West End Emergency Physicians Group · Patient Billing",
    referenceId: "Statement # WE-ER-58291",
    cornerLabel: "Amount due",
    cornerSubtitle: "Jun 21, 2026",
    subjectRows: [
      ["Patient", "J.K. ····9183"],
      ["Service location", "ABC Medical Center (in-network hospital)"],
      ["Treating provider", "Dr. R. Calderón, MD (out-of-network)"],
      ["Date of service", "Mar 22, 2026 · single ER visit"],
    ],
    columnLabels: {
      description: "Service · CPT",
      col1: "Charge",
      col2: "—",
      col3: "Insurance paid",
      col4: "Balance due",
    },
    footerHeadline: "Pay this bill.",
    footerBody:
      "This statement reflects the balance owed after insurance payment. Payment is due Jun 21, 2026. After that date a late fee of 1.5% per month will apply. To set up a payment plan, contact our billing office at the number above. Disputes must be submitted in writing within 30 days.",
    hideAllowedColumn: true,
  },

  billLines: [
    {
      id: "ln-1",
      cptCode: "99284",
      description: "Emergency dept visit, moderate complexity",
      dateOfService: "2026-03-22",
      billed: 168_000,
      allowed: 54_000,
      paid: 42_000,
      patientResponsibility: 126_000,
    },
    {
      id: "ln-2",
      cptCode: "71046",
      description: "Chest X-ray, 2 views",
      dateOfService: "2026-03-22",
      billed: 47_000,
      allowed: 16_000,
      paid: 12_500,
      patientResponsibility: 34_500,
    },
    {
      id: "ln-3",
      cptCode: "80048",
      description: "Basic metabolic panel",
      dateOfService: "2026-03-22",
      billed: 28_000,
      allowed: 12_000,
      paid: 9_500,
      patientResponsibility: 18_500,
    },
    {
      id: "ln-4",
      cptCode: "93010",
      description: "Electrocardiogram interpretation",
      dateOfService: "2026-03-22",
      billed: 41_000,
      allowed: 14_000,
      paid: 11_000,
      patientResponsibility: 30_000,
    },
    {
      id: "ln-5",
      cptCode: "—",
      description: "Balance due — pay by Jun 21, 2026",
      dateOfService: "2026-04-22",
      billed: 0,
      allowed: 0,
      paid: 0,
      patientResponsibility: 212_000,
    },
  ],

  extracted: [
    {
      id: "ex-er-flag",
      field: "Service category",
      value: "Emergency services (CPT 99284) — NSA-protected",
      bbox: { x: 8, y: 38, w: 60, h: 4 },
      confidence: "settled",
      flags: [],
    },
    {
      id: "ex-balance",
      field: "Balance billed to patient",
      value: "$2,120.00 (illegal under No Surprises Act)",
      bbox: { x: 60, y: 72, w: 30, h: 5 },
      confidence: "settled",
      flags: [],
    },
    {
      id: "ex-pay-date",
      field: "Provider's payment deadline",
      value: "Jun 21, 2026 (you do not owe this)",
      bbox: { x: 78, y: 12, w: 18, h: 7 },
      confidence: "settled",
      flags: [],
    },
    {
      id: "ex-provider-status",
      field: "Provider network status",
      value: "Out-of-network physician at in-network facility — NSA trigger",
      bbox: { x: 8, y: 26, w: 64, h: 5 },
      confidence: "settled",
      flags: [],
    },
    {
      id: "ex-insurer-eob",
      field: "Whether insurer applied in-network cost-share",
      value: "Need to confirm against your EOB from your health plan",
      bbox: { x: 8, y: 78, w: 60, h: 4 },
      confidence: "verify",
      flags: ["user_dependent"],
    },
  ],

  claims: [
    {
      id: "cl-1",
      text:
        "Under the No Surprises Act, out-of-network providers cannot bill you more than your in-network cost-share for emergency services. This balance bill is prohibited by federal law and unenforceable.",
      plainLanguage:
        "This bill is illegal. Emergency-room doctors can't charge you their full rate just because they're not in your insurance network — federal law settled this in 2022.",
      confidence: "settled",
      anchors: [
        {
          id: "an-nsa-core",
          citation: "42 U.S.C. § 300gg-111 (PHSA § 2799A-1)",
          shortName: "No Surprises Act — emergency services protection",
          excerpt:
            "In the case of emergency services furnished by a nonparticipating provider with respect to a participant of a group health plan, the cost-sharing requirement shall not be greater than the requirement that would apply if such services were provided by a participating provider; and the participant shall not be liable for any amount in excess of such cost-sharing requirement.",
          url: "https://www.law.cornell.edu/uscode/text/42/300gg-111",
          verifiedOn: "2026-05-13",
        },
        {
          id: "an-nsa-cfr",
          citation: "45 CFR § 149.110",
          shortName: "Emergency services definition (HHS)",
          excerpt:
            "An emergency medical condition is a medical condition manifesting itself by acute symptoms of sufficient severity such that a prudent layperson, who possesses an average knowledge of health and medicine, could reasonably expect the absence of immediate medical attention to result in serious jeopardy to the health of the individual.",
          url: "https://www.ecfr.gov/current/title-45/section-149.110",
          verifiedOn: "2026-05-13",
        },
      ],
      flags: [],
    },
    {
      id: "cl-2",
      text:
        "The notice-and-consent exception that lets some OON providers bill patients does not apply to emergency services. Even a signed waiver is unenforceable in this context.",
      plainLanguage:
        "Even if you signed something at intake, it doesn't matter. Federal law specifically says you can't sign away the emergency-services protection.",
      confidence: "settled",
      anchors: [
        {
          id: "an-nsa-no-consent",
          citation: "45 CFR § 149.410(b)(2)(i)",
          shortName: "Emergency services excluded from notice-and-consent",
          excerpt:
            "A nonparticipating provider may not seek written notice and consent under this section with respect to items or services that are emergency services.",
          url: "https://www.ecfr.gov/current/title-45/section-149.410",
          verifiedOn: "2026-05-13",
        },
      ],
      flags: [],
    },
    {
      id: "cl-3",
      text:
        "Your health plan was required to apply your in-network deductible and coinsurance to these services. Confirm your EOB shows in-network cost-share applied — if not, the insurer is also in violation and owes you a separate adjustment.",
      plainLanguage:
        "Your insurance was supposed to treat this as if the doctor was in-network. If their EOB shows you a higher cost-share, the insurer broke the same law — that's two separate fights, not one.",
      confidence: "verify",
      anchors: [
        {
          id: "an-nsa-cost-share",
          citation: "26 CFR § 54.9816-4T",
          shortName: "Cost-sharing protections (Treasury)",
          excerpt:
            "The cost-sharing requirement applicable to a participant for emergency services furnished by a nonparticipating provider must be calculated as if such services were furnished by a participating provider in accordance with this section.",
          verifiedOn: "2026-05-13",
        },
      ],
      flags: ["user_dependent"],
      userVerifies: [
        "Pull the EOB from your health plan for the Mar 22, 2026 ER visit and confirm the 'patient responsibility' line uses in-network rates.",
        "If the EOB shows OON cost-share, screenshot it — that's the evidence for the insurer-side complaint.",
      ],
    },
    {
      id: "cl-4",
      text:
        "If West End Emergency refuses to withdraw the bill after the federal demand, you may have separate claims under state Unfair and Deceptive Acts and Practices (UDAP) law and the federal Fair Debt Collection Practices Act if they refer the bill to collections.",
      plainLanguage:
        "If they ignore the federal law and try to collect anyway, you may be able to sue them — but the strongest moves vary by state and are worth running by a lawyer before you escalate.",
      confidence: "lawyer",
      anchors: [],
      flags: ["jurisdiction_unknown"],
      userVerifies: [
        "Note your state — UDAP statutes vary widely; some allow treble damages and attorneys' fees for the consumer.",
        "If the bill goes to collections, save every notice — FDCPA gives you separate federal protections.",
      ],
    },
  ],

  deadlines: [
    {
      id: "dl-1",
      label: "File complaint with CMS No Surprises Help Desk",
      dueAt: "2026-06-12",
      consequence: "right_lost",
    },
    {
      id: "dl-2",
      label: "Request itemized statement (federal Hospital Price Transparency right)",
      dueAt: "2026-05-27",
      consequence: "right_lost",
    },
    {
      id: "dl-3",
      label: "Open negotiation window — insurer can drive provider-side resolution",
      dueAt: "2026-07-04",
      consequence: "second_window_opens",
    },
  ],

  draft: {
    id: "draft-1",
    kind: "no_surprises_dispute",
    recipient: "West End Emergency Physicians Group, Patient Billing",
    subject: "Notice — Statement # WE-ER-58291 is prohibited by federal No Surprises Act",
    body: `To the Billing Department,

This letter is formal notice that Statement # WE-ER-58291 for $2,120.00, dated April 22, 2026, is prohibited by the federal No Surprises Act and is not a debt I owe.

The services on this statement are emergency services (CPT 99284, 71046, 80048, 93010) furnished on March 22, 2026, at ABC Medical Center — an in-network facility under my health plan. Dr. R. Calderón is, by your billing's own designation, a non-participating provider with respect to my plan. 42 U.S.C. § 300gg-111 (PHSA § 2799A-1) and the implementing regulations at 45 CFR Part 149 prohibit a non-participating provider of emergency services from billing a participant for more than the in-network cost-sharing amount.

The notice-and-consent exception at 45 CFR § 149.410 does not apply: subsection (b)(2)(i) explicitly excludes emergency services from any waiver permitted by that section. Any consent form I signed at intake does not authorize this bill.

I demand that you (1) withdraw this statement in full and confirm in writing that the balance is $0.00, and (2) confirm that no portion has been or will be referred to a collection agency or reported to any consumer reporting agency.

If this matter is not resolved within 30 days, I will:

  · file a complaint with the CMS No Surprises Help Desk at 1-800-985-3059,
  · file a complaint with my state insurance commissioner,
  · pursue any state-law remedies available, including under the relevant UDAP statute.

Copies of this letter will be sent to my health plan and retained for my records.

Sincerely,
J.K.
(Member ID and contact information on file — Recourse will fill them from your portal before sending.)`,
    anchors: [
      {
        id: "an-nsa-core",
        citation: "42 U.S.C. § 300gg-111",
        shortName: "No Surprises Act",
        excerpt: "...participant shall not be liable for any amount in excess of in-network cost-sharing...",
        verifiedOn: "2026-05-13",
      },
      {
        id: "an-nsa-no-consent",
        citation: "45 CFR § 149.410(b)(2)(i)",
        shortName: "No-consent for emergency services",
        excerpt: "...may not seek written notice and consent...with respect to items or services that are emergency services.",
        verifiedOn: "2026-05-13",
      },
    ],
  },
};

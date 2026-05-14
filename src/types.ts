/* Recourse types — anchored on the EOB and the dispute it triggers. */

export type LoopKind =
  | "insurance_denial"
  | "balance_billing"
  | "surprise_bill"
  | "parity_violation"
  | "coding_error";

/** Calibrated confidence — non-expert facing.
 * "settled"  — the AI has high confidence and the basis is checkable;
 * "verify"   — needs the user to confirm against their lived facts (dates, dx);
 * "lawyer"   — beyond what a confidence number should claim alone. */
export type ConfidenceLabel = "settled" | "verify" | "lawyer";

export type FlagKind =
  | "fabricated"        // AI made up a statute / citation that doesn't exist
  | "stale_statute"     // citation is real but superseded
  | "user_dependent"    // the answer depends on facts only the user knows
  | "jurisdiction_unknown" // can't resolve state-specific procedure yet
  | "policy_specific";  // depends on the user's specific plan documents

export interface StatuteAnchor {
  id: string;
  citation: string;          // e.g. "29 U.S.C. § 1185a" or "45 CFR § 147.160"
  shortName: string;         // e.g. "Mental Health Parity Act"
  excerpt: string;           // the operative language
  url?: string;              // canonical public source
  verifiedOn: string;        // ISO date the AI last checked the citation is live
}

/** A single charge line lifted from the EOB. */
export interface BillLine {
  id: string;
  cptCode: string;           // e.g. "90837"
  description: string;       // e.g. "Psychotherapy, 60 min"
  dateOfService: string;     // ISO
  billed: number;            // cents
  allowed: number;           // cents
  paid: number;              // cents
  patientResponsibility: number; // cents
  denialReason?: {
    code: string;            // payer's reason code
    text: string;            // payer's reason text
  };
  /** What Recourse thinks is actually wrong here, separate from the
   *  payer's stated reason. */
  disputeAngle?: string;
}

export interface ExtractedEntity {
  id: string;
  field: string;             // e.g. "Appeal deadline"
  value: string;             // e.g. "June 14, 2026"
  /** Where on the EOB the AI pulled this from — used for the scan reveal */
  bbox: { x: number; y: number; w: number; h: number }; // % of paper
  confidence: ConfidenceLabel;
  flags: FlagKind[];
}

/** One AI-generated claim about the case — analogous to Sentinel's AIClaim
 * but framed for a non-expert audience. */
export interface CaseClaim {
  id: string;
  /** Plain-language statement of what the AI is saying */
  text: string;
  /** One-line "in other words" that a 13-year-old would understand */
  plainLanguage?: string;
  confidence: ConfidenceLabel;
  /** Statutes the claim rests on. Empty = unanchored. */
  anchors: StatuteAnchor[];
  flags: FlagKind[];
  /** What the user should personally verify before relying on this */
  userVerifies?: string[];
}

export interface Deadline {
  id: string;
  label: string;
  dueAt: string;             // ISO
  /** "missed" actions are unrecoverable — usually statute of limitations */
  consequence: "missed_appeal" | "right_lost" | "second_window_opens";
}

export interface DraftResponse {
  id: string;
  kind: "internal_appeal" | "external_review" | "parity_disclosure_request" | "no_surprises_dispute";
  recipient: string;
  subject: string;
  body: string;
  /** Statute and policy citations embedded in the draft body */
  anchors: StatuteAnchor[];
}

/** Everything the EOBPaper renderer needs that varies per document type. */
export interface PaperMeta {
  /** Top-of-page line over the title — e.g. "Northshore Health · Member Services" */
  organizationLine: string;
  /** Identifier shown beneath the title — e.g. "Claim # N-4218-A" */
  referenceId: string;
  /** Top-right corner labels — e.g. "Not a bill" / "For your records" */
  cornerLabel?: string;
  cornerSubtitle?: string;
  /** Subject-block key/value pairs */
  subjectRows: Array<[string, string]>;
  /** Headers for the charge table */
  columnLabels: { description: string; col1: string; col2: string; col3: string; col4: string };
  /** Footer notice block */
  footerHeadline: string;
  footerBody: string;
  /** Whether to show the "Allowed" middle column or merge it */
  hideAllowedColumn?: boolean;
}

export interface Case {
  id: string;
  loopKind: LoopKind;
  /** Short label for the case switcher — e.g. "Mental-health denial" */
  displayName: string;
  /** Genre label for the document — drives the EOB header */
  documentTitle: string;     // e.g. "Explanation of Benefits" | "Hospital Bill"
  insurer: string;
  patientLabel: string;      // e.g. "M.R. (you)" — never the real name in demo
  provider: string;
  /** Three-line story the user can recognize themselves in */
  summary: string;
  amountInDispute: number;   // cents
  /** Best-case recovery if the appeal wins */
  recoveryEstimate: number;  // cents
  receivedAt: string;        // ISO — when the EOB arrived
  paperMeta: PaperMeta;
  billLines: BillLine[];
  extracted: ExtractedEntity[];
  claims: CaseClaim[];
  deadlines: Deadline[];
  draft: DraftResponse;
}

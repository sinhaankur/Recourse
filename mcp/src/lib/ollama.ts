import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { z } from "zod";

/**
 * Node-side Ollama client. Mirrors the browser client in src/lib/ollama.ts
 * but reads image files from disk and uses Node's global fetch.
 *
 * The two ship as separate files (rather than a shared lib) because the
 * runtime constraints are different: the browser version takes a data URL
 * already in memory; the Node version reads a path from the filesystem and
 * base64-encodes it. Trying to share would require an awkward common
 * "image source" abstraction that's not worth the indirection.
 */

export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

const VISION_MARKERS = ["vision", "llava", "bakllava", "moondream", "minicpm"];

export interface OllamaModel {
  name: string;
  vision: boolean;
}

export interface OllamaProbeResult {
  reachable: boolean;
  models: OllamaModel[];
  error?: string;
}

export async function probeOllama(
  baseUrl: string = OLLAMA_BASE_URL,
): Promise<OllamaProbeResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        reachable: false,
        models: [],
        error: `Ollama responded ${res.status}`,
      };
    }
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const models: OllamaModel[] = (data.models ?? []).map((m) => {
      const lower = m.name.toLowerCase();
      return {
        name: m.name,
        vision: VISION_MARKERS.some((marker) => lower.includes(marker)),
      };
    });
    return { reachable: true, models };
  } catch (err) {
    return {
      reachable: false,
      models: [],
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Read an image file from disk and return a base64 string ready for
 * Ollama's images[] field. PNG / JPG / WebP all supported by the daemon
 * — content type doesn't need to match the extension.
 */
export async function readImageAsBase64(path: string): Promise<string> {
  const ext = extname(path).toLowerCase();
  const allowed = [".png", ".jpg", ".jpeg", ".webp"];
  if (!allowed.includes(ext)) {
    throw new Error(
      `Unsupported image extension '${ext}'. MCP server v1 accepts ${allowed.join(", ")} only. Convert PDFs to images first (see README).`,
    );
  }
  const buf = await readFile(path);
  return buf.toString("base64");
}

// ---------------------------------------------------------------------------
// Schemas (mirror the browser side)
// ---------------------------------------------------------------------------

export const ExtractionResponseSchema = z.object({
  documentKind: z.string(),
  fields: z.array(
    z.object({
      field: z.string(),
      value: z.string(),
      confidence: z.enum(["settled", "verify", "lawyer"]),
      reasoning: z.string().optional(),
    }),
  ),
});

export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>;

export const PolicyAnnotationSchema = z.object({
  kind: z.enum(["covered", "excluded", "limit", "vague", "silent", "procedure"]),
  topic: z.string(),
  excerpt: z.string(),
  impact: z.enum(["low", "medium", "high"]),
  note: z.string(),
});

export const PolicyPageResponseSchema = z.object({
  annotations: z.array(PolicyAnnotationSchema),
});

export type PolicyPageResponse = z.infer<typeof PolicyPageResponseSchema>;

// ---------------------------------------------------------------------------
// Prompts (kept verbatim from the browser side — same model, same task)
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You are an expert at reading U.S. healthcare and insurance documents (Explanations of Benefits, denial letters, hospital bills, surprise-billing statements).

Read the attached document image and extract the following fields. Return STRICT JSON matching this schema, with no prose before or after:

{
  "documentKind": "<EOB | hospital bill | denial letter | unknown>",
  "fields": [
    {
      "field": "<field name>",
      "value": "<value as it appears on the document>",
      "confidence": "<settled | verify | lawyer>",
      "reasoning": "<one sentence; optional>"
    }
  ]
}

Confidence rules:
- "settled" — the value is plainly printed on the document and there is no ambiguity.
- "verify" — the value depends on user-side facts (their plan, their dates) or is partially obscured.
- "lawyer" — the value implies a legal conclusion that should be checked with counsel.

Always try to extract these fields when present:
- Insurer / payer name
- Member / patient name (mask all but initials)
- Claim or statement number
- Statement date or service date
- Plan type (ERISA self-funded, fully insured, Medicare, etc.)
- Provider name and network status (in / out of network)
- Total amount billed
- Total patient responsibility or amount due
- Denial reason code and text, if any
- Appeal deadline or payment deadline

If a field is not on the document, omit it. Do not invent values.`;

const POLICY_DECODER_PROMPT = `You are reading one page of a health insurance plan document (Summary Plan Description, Evidence of Coverage, or Certificate of Insurance).

Your job is NOT to summarize. Your job is to surface what a user reading this page would miss — the adversarial patterns insurers use to limit coverage.

For each meaningful passage on this page, return one annotation with one of these kinds:

- "covered"   — A specific benefit is clearly available. Note what it covers.
- "excluded"  — A specific benefit is clearly NOT covered. Note what's excluded.
- "limit"     — A numeric cap (visits per year, dollar maximum, days of coverage).
- "vague"     — Language with high financial impact that is undefined or open to insurer interpretation. WATCH especially for: "medically necessary," "experimental," "investigational," "usual and customary," "reasonable and customary," "appropriate level of care," "covered when authorized." For each, explain how the insurer might use the vagueness against the user.
- "silent"    — Something a reasonable person would expect to be addressed in this section but isn't. Silence usually means the insurer reserves the right to deny later.
- "procedure" — A procedural requirement (prior authorization, step therapy, referral, network restrictions, timing windows). Failure to follow these is the #1 cause of "valid" denials.

For impact:
- "low"    — affects routine, low-cost care
- "medium" — affects regular care that adds up
- "high"   — affects expensive care or could cause total denial

Return STRICT JSON:

{
  "annotations": [
    {
      "kind": "<covered|excluded|limit|vague|silent|procedure>",
      "topic": "<what the passage is about>",
      "excerpt": "<the policy's exact language, or '[not addressed]' for silent>",
      "impact": "<low|medium|high>",
      "note": "<plain English: why this matters, what to watch for>"
    }
  ]
}

If this page has no annotatable content (table of contents, blank, regulatory boilerplate), return {"annotations": []}.`;

// ---------------------------------------------------------------------------
// Generation calls
// ---------------------------------------------------------------------------

interface GenerateArgs {
  baseUrl?: string;
  model: string;
  prompt: string;
  imageBase64: string;
  numPredict?: number;
}

interface GenerateResult {
  raw: string;
  durationMs: number;
}

async function generate(args: GenerateArgs): Promise<GenerateResult> {
  const started = performance.now();
  const baseUrl = args.baseUrl ?? OLLAMA_BASE_URL;
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: args.model,
      prompt: args.prompt,
      images: [args.imageBase64],
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: args.numPredict ?? 1024,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama /api/generate returned ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { response?: string };
  return {
    raw: json.response ?? "",
    durationMs: Math.round(performance.now() - started),
  };
}

function stripPossibleProse(raw: string): string {
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last <= first) return raw;
  return raw.slice(first, last + 1);
}

export async function extractDenialLetter(opts: {
  model: string;
  imagePath: string;
  baseUrl?: string;
}): Promise<{
  parsed?: ExtractionResponse;
  raw: string;
  parseError?: string;
  durationMs: number;
}> {
  const imageBase64 = await readImageAsBase64(opts.imagePath);
  const { raw, durationMs } = await generate({
    baseUrl: opts.baseUrl,
    model: opts.model,
    prompt: EXTRACTION_PROMPT,
    imageBase64,
    numPredict: 1024,
  });
  try {
    const parsed = ExtractionResponseSchema.parse(JSON.parse(stripPossibleProse(raw)));
    return { parsed, raw, durationMs };
  } catch (err) {
    return {
      raw,
      durationMs,
      parseError:
        err instanceof Error ? err.message : "Failed to parse model output",
    };
  }
}

export async function decodePolicyPage(opts: {
  model: string;
  imagePath: string;
  baseUrl?: string;
}): Promise<{
  parsed?: PolicyPageResponse;
  raw: string;
  parseError?: string;
  durationMs: number;
}> {
  const imageBase64 = await readImageAsBase64(opts.imagePath);
  const { raw, durationMs } = await generate({
    baseUrl: opts.baseUrl,
    model: opts.model,
    prompt: POLICY_DECODER_PROMPT,
    imageBase64,
    numPredict: 1536,
  });
  try {
    const parsed = PolicyPageResponseSchema.parse(JSON.parse(stripPossibleProse(raw)));
    return { parsed, raw, durationMs };
  } catch (err) {
    return {
      raw,
      durationMs,
      parseError:
        err instanceof Error ? err.message : "Failed to parse model output",
    };
  }
}

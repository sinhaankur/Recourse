import { z } from "zod";

/**
 * Thin client for a locally-running Ollama daemon. The daemon listens on
 * http://localhost:11434 by default. For the browser to call it, Ollama
 * must be started with the OLLAMA_ORIGINS environment variable set
 * (e.g. `OLLAMA_ORIGINS="*" ollama serve`) — otherwise CORS blocks the
 * fetch. The setup banner in the UI shows that exact command.
 */

export const OLLAMA_BASE_URL = "http://localhost:11434";

/** Vision-capable model name fragments. We auto-detect a usable model
 * by scanning the installed list for any of these substrings. */
const VISION_MARKERS = ["vision", "llava", "bakllava", "moondream", "minicpm"];

export interface OllamaModel {
  name: string;
  /** Whether the model can accept images (best-effort heuristic on the name) */
  vision: boolean;
}

export type OllamaStatus = "unknown" | "ready" | "unreachable" | "no_vision_models";

export interface OllamaProbeResult {
  status: OllamaStatus;
  models: OllamaModel[];
  /** Human-readable error if status is "unreachable" */
  error?: string;
}

/**
 * Ping the local Ollama daemon. Returns the status + the installed models.
 * Times out at 1500ms — we never want to block the UI more than that to
 * decide whether Ollama is there.
 */
export async function probeOllama(
  baseUrl: string = OLLAMA_BASE_URL
): Promise<OllamaProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    if (!res.ok) {
      return {
        status: "unreachable",
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
    const anyVision = models.some((m) => m.vision);
    return {
      status: anyVision ? "ready" : models.length > 0 ? "no_vision_models" : "no_vision_models",
      models,
    };
  } catch (err) {
    return {
      status: "unreachable",
      models: [],
      error: err instanceof Error ? err.message : "Network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Strip a data URL prefix (e.g. "data:image/png;base64,") to get just the
 * base64 payload, which is what Ollama's /api/generate expects in `images[]`.
 */
function stripDataUrl(dataUrl: string): string {
  const i = dataUrl.indexOf(",");
  return i === -1 ? dataUrl : dataUrl.slice(i + 1);
}

/**
 * The JSON schema we want the model to return. Mirrors ExtractedEntity[]
 * from the existing app, minus the bbox (no model reliably returns pixel
 * coordinates for arbitrary documents).
 */
export const ExtractionResponseSchema = z.object({
  documentKind: z.string().describe('e.g. "EOB", "hospital bill", "denial letter"'),
  fields: z.array(
    z.object({
      field: z.string(),
      value: z.string(),
      /** "settled" | "verify" | "lawyer" — the same confidence vocabulary as the rest of Recourse */
      confidence: z.enum(["settled", "verify", "lawyer"]),
      reasoning: z.string().optional(),
    })
  ),
});

export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>;

/**
 * The system+user prompt for vision extraction. Kept tight on purpose:
 * - Asks for strict JSON with a fixed schema
 * - Names the confidence vocabulary
 * - Lists the canonical fields we care about (so the model doesn't free-form)
 */
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
- Any references to specific statutes (rare)

If a field is not on the document, omit it from the array. Do not invent values.`;

export interface GenerateOptions {
  baseUrl?: string;
  model: string;
  /** PNG data URL of the rendered document page */
  image: string;
  /** Optional abort signal */
  signal?: AbortSignal;
  /** Optional progress callback fired on each token chunk while streaming */
  onToken?: (chunk: string, total: string) => void;
}

export interface GenerateResult {
  /** The model's raw text response */
  raw: string;
  /** The parsed structured response, if parseable */
  parsed?: ExtractionResponse;
  /** If parsing failed, the error that resulted */
  parseError?: string;
  /** Wall-clock duration of the request, ms */
  durationMs: number;
}

/**
 * Call Ollama's /api/generate with a vision model. Streams tokens so the
 * UI can show progress. When the stream ends, attempts to parse the
 * accumulated text as ExtractionResponse JSON.
 *
 * Notes on robustness:
 * - Models often emit prose before/after JSON despite the prompt. We strip
 *   anything before the first `{` and anything after the matching `}`.
 * - On parse failure, we still return the raw text so the caller can show it.
 */
export async function generateExtraction({
  baseUrl = OLLAMA_BASE_URL,
  model,
  image,
  signal,
  onToken,
}: GenerateOptions): Promise<GenerateResult> {
  const started = performance.now();

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model,
      prompt: EXTRACTION_PROMPT,
      images: [stripDataUrl(image)],
      stream: true,
      options: {
        temperature: 0.1, // we want deterministic structured output
        num_predict: 1024,
      },
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Ollama returned ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const chunk = JSON.parse(line) as { response?: string; done?: boolean };
        if (chunk.response) {
          raw += chunk.response;
          onToken?.(chunk.response, raw);
        }
      } catch {
        // Ollama occasionally emits a partial line at the very end of stream;
        // ignore — the loop will exit on done.
      }
    }
  }

  const durationMs = Math.round(performance.now() - started);

  // Try to parse — model output often has prose around the JSON.
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return { raw, parseError: "No JSON object found in model output", durationMs };
  }
  const jsonText = raw.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = ExtractionResponseSchema.parse(JSON.parse(jsonText));
    return { raw, parsed, durationMs };
  } catch (err) {
    return {
      raw,
      parseError:
        err instanceof Error ? err.message : "Failed to parse model response",
      durationMs,
    };
  }
}

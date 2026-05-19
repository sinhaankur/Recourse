#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  decodePolicyPage,
  extractDenialLetter,
  probeOllama,
  OLLAMA_BASE_URL,
} from "./lib/ollama.js";

/**
 * Recourse MCP server. Exposes the same Ollama-backed extractors that
 * the Recourse web app uses, but as MCP tools any MCP-compatible client
 * (Claude Desktop, Claude Code, any future agent) can call against a
 * user's local insurance documents.
 *
 * Communication is over stdio — the client spawns this process and
 * pipes JSON-RPC over its stdin/stdout. No network listener. The user
 * configures their MCP client via a `claude_desktop_config.json` entry
 * (see README.md).
 *
 * Tools are deliberately stateless: each call reads a file from disk,
 * runs one Ollama call, returns the result. No caching, no session.
 * This keeps the tool composable — an agent can run hundreds of calls
 * against different files without leaking state between them.
 */

const server = new McpServer(
  {
    name: "recourse",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ---------------------------------------------------------------------------
// Tool 1 — list_vision_models
// ---------------------------------------------------------------------------
server.registerTool(
  "list_vision_models",
  {
    title: "List vision models",
    description:
      "Check whether a local Ollama daemon is reachable and list the installed models that support vision (image input). Call this first to verify setup before running extraction tools.",
    inputSchema: {},
  },
  async () => {
    const probe = await probeOllama();
    if (!probe.reachable) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Ollama not reachable at ${OLLAMA_BASE_URL}. ${
              probe.error ?? ""
            }\n\nStart it with: OLLAMA_ORIGINS="*" ollama serve`,
          },
        ],
        isError: true,
      };
    }
    const visionModels = probe.models.filter((m) => m.vision);
    const text = [
      `Ollama reachable at ${OLLAMA_BASE_URL}.`,
      `${probe.models.length} total model(s), ${visionModels.length} vision-capable:`,
      ...visionModels.map((m) => `  • ${m.name}`),
      visionModels.length === 0
        ? `\nNo vision model installed. Run: ollama pull llava (or llama3.2-vision)`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    return {
      content: [{ type: "text" as const, text }],
    };
  },
);

// ---------------------------------------------------------------------------
// Tool 2 — extract_denial_letter
// ---------------------------------------------------------------------------
server.registerTool(
  "extract_denial_letter",
  {
    title: "Read a denial letter or EOB",
    description:
      "Given a path to a single-page image (PNG/JPG/WebP) of a denial letter, EOB, or hospital bill, extract structured fields: insurer, claim ID, deadlines, denial code, plan type, amount, network status. Each field is labeled with a confidence band — 'settled' (clearly on the document), 'verify' (depends on user-side facts), or 'lawyer' (legal conclusion territory). PDFs must be converted to images first; see the MCP server README for the one-liner.",
    inputSchema: {
      imagePath: z
        .string()
        .describe(
          "Absolute path to a PNG, JPG, or WebP file. Must be a single-page image of the document.",
        ),
      model: z
        .string()
        .optional()
        .describe(
          "Ollama vision model name (e.g. 'llava', 'llama3.2-vision'). If omitted, the server picks the first vision model it finds via list_vision_models.",
        ),
    },
  },
  async ({ imagePath, model }) => {
    const chosenModel = await resolveVisionModel(model);
    if (!chosenModel.ok) return chosenModel.errorResult;

    try {
      const result = await extractDenialLetter({
        imagePath,
        model: chosenModel.name,
      });
      if (!result.parsed) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Extraction parse failed (${result.parseError ?? "unknown reason"}).\n\nRaw model output:\n${result.raw}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: formatExtraction(result.parsed, result.durationMs, chosenModel.name),
          },
        ],
        structuredContent: {
          documentKind: result.parsed.documentKind,
          fields: result.parsed.fields,
          durationMs: result.durationMs,
          model: chosenModel.name,
        },
      };
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Tool 3 — decode_policy_page
// ---------------------------------------------------------------------------
server.registerTool(
  "decode_policy_page",
  {
    title: "Decode one page of a health insurance policy",
    description:
      "Given a path to a single-page image of a policy document (SPD, EOC, Certificate of Insurance), surface what's covered, excluded, deliberately vague (loopholes), silent (gaps), or procedurally required. Returns annotations the user can scan to find what the insurer might exploit later. Run once per page; an agent that wants to decode a whole policy should loop. PDFs must be converted to images first.",
    inputSchema: {
      imagePath: z
        .string()
        .describe(
          "Absolute path to a single-page image of the policy document (PNG/JPG/WebP).",
        ),
      model: z.string().optional().describe("Ollama vision model name."),
    },
  },
  async ({ imagePath, model }) => {
    const chosenModel = await resolveVisionModel(model);
    if (!chosenModel.ok) return chosenModel.errorResult;

    try {
      const result = await decodePolicyPage({
        imagePath,
        model: chosenModel.name,
      });
      if (!result.parsed) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Decoder parse failed (${result.parseError ?? "unknown reason"}).\n\nRaw model output:\n${result.raw}`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: formatAnnotations(result.parsed.annotations, result.durationMs, chosenModel.name),
          },
        ],
        structuredContent: {
          annotations: result.parsed.annotations,
          durationMs: result.durationMs,
          model: chosenModel.name,
        },
      };
    } catch (err) {
      return errorResult(err);
    }
  },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ModelResolve =
  | { ok: true; name: string }
  | { ok: false; errorResult: { content: Array<{ type: "text"; text: string }>; isError: true } };

async function resolveVisionModel(requested: string | undefined): Promise<ModelResolve> {
  const probe = await probeOllama();
  if (!probe.reachable) {
    return {
      ok: false,
      errorResult: {
        content: [
          {
            type: "text" as const,
            text: `Ollama not reachable at ${OLLAMA_BASE_URL}. ${probe.error ?? ""}\n\nStart it with: OLLAMA_ORIGINS="*" ollama serve`,
          },
        ],
        isError: true,
      },
    };
  }
  const visionModels = probe.models.filter((m) => m.vision);
  if (visionModels.length === 0) {
    return {
      ok: false,
      errorResult: {
        content: [
          {
            type: "text" as const,
            text: `No vision model installed. Run: ollama pull llava (or llama3.2-vision)`,
          },
        ],
        isError: true,
      },
    };
  }
  if (requested) {
    const found = visionModels.find((m) => m.name === requested);
    if (!found) {
      return {
        ok: false,
        errorResult: {
          content: [
            {
              type: "text" as const,
              text: `Requested model '${requested}' not found among vision-capable models. Available: ${visionModels.map((m) => m.name).join(", ")}`,
            },
          ],
          isError: true,
        },
      };
    }
    return { ok: true, name: found.name };
  }
  // Auto-pick first vision model — never undefined because we've already
  // checked length above, but TypeScript doesn't know that under
  // noUncheckedIndexedAccess.
  const first = visionModels[0];
  if (!first) {
    return {
      ok: false,
      errorResult: {
        content: [
          { type: "text" as const, text: "No vision model resolvable." },
        ],
        isError: true,
      },
    };
  }
  return { ok: true, name: first.name };
}

function errorResult(err: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: err instanceof Error ? err.message : String(err),
      },
    ],
    isError: true as const,
  };
}

function formatExtraction(
  parsed: { documentKind: string; fields: Array<{ field: string; value: string; confidence: string; reasoning?: string }> },
  durationMs: number,
  model: string,
): string {
  const lines = [
    `Document kind: ${parsed.documentKind}`,
    `Model: ${model} · ${(durationMs / 1000).toFixed(1)}s`,
    `Fields (${parsed.fields.length}):`,
    "",
    ...parsed.fields.map(
      (f) =>
        `  [${f.confidence}] ${f.field}: ${f.value}${
          f.reasoning ? `\n      reasoning: ${f.reasoning}` : ""
        }`,
    ),
  ];
  return lines.join("\n");
}

function formatAnnotations(
  annotations: Array<{ kind: string; topic: string; excerpt: string; impact: string; note: string }>,
  durationMs: number,
  model: string,
): string {
  if (annotations.length === 0) {
    return `No annotatable content found on this page (likely a table of contents, blank page, or boilerplate).\nModel: ${model} · ${(durationMs / 1000).toFixed(1)}s`;
  }
  const grouped: Record<string, typeof annotations> = {};
  for (const a of annotations) {
    if (!grouped[a.kind]) grouped[a.kind] = [];
    grouped[a.kind]!.push(a);
  }
  const lines = [
    `Model: ${model} · ${(durationMs / 1000).toFixed(1)}s · ${annotations.length} annotation(s)`,
    "",
  ];
  for (const [kind, items] of Object.entries(grouped)) {
    lines.push(`## ${kind.toUpperCase()} (${items.length})`);
    for (const a of items) {
      lines.push(`  • [${a.impact}] ${a.topic}`);
      if (a.excerpt && a.excerpt !== "[not addressed]") {
        lines.push(`      excerpt: "${a.excerpt}"`);
      }
      lines.push(`      note: ${a.note}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr (stdout is reserved for JSON-RPC messages)
  process.stderr.write("Recourse MCP server running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});

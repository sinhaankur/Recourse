import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Case } from "@/types";
import {
  decodePolicyPage,
  generateExtraction,
  probeOllama,
  type ExtractionResponse,
  type OllamaModel,
  type OllamaStatus,
  type PolicyAnnotation,
} from "@/lib/ollama";
import {
  renderImageToDataUrl,
  renderPdfAllPages,
  renderPdfPageToImage,
  type RenderedPdfPage,
} from "@/lib/pdf";

export type FlowStage = "landing" | "scanning" | "extracted" | "strategy" | "draft";

/** Top-level mode — which "shape" of demo the user is in. */
export type DemoMode = "canonical" | "upload";

/** Which Ollama-backed task the user is running in upload mode. */
export type UploadTask = "denial" | "decoder";

/** Per-extraction lifecycle. Independent of the canonical-case FlowStage. */
export type ExtractionStatus =
  | "idle"           // no doc uploaded
  | "rendering"      // PDF/image being rasterized
  | "ready"          // doc rendered, awaiting "Extract" click
  | "extracting"     // Ollama call in flight
  | "done"           // extraction succeeded
  | "failed";        // extraction failed (network, parse, abort)

export interface UploadedDoc {
  file: File;
  rendered: RenderedPdfPage;
  extractionStatus: ExtractionStatus;
  extraction?: ExtractionResponse;
  /** Raw model output, useful when parse fails */
  rawResponse?: string;
  /** Live token-by-token text while streaming, so the UI can show progress */
  streamingText?: string;
  /** Error message if extractionStatus is "failed" */
  extractionError?: string;
  /** Wall-clock duration of the last extraction (ms) */
  durationMs?: number;
}

/** Decoder lifecycle is multi-stage because a policy is multi-page. */
export type DecoderStatus =
  | "idle"
  | "rendering"      // turning all pages into images
  | "ready"          // images ready, awaiting "Analyze"
  | "analyzing"      // page-by-page Ollama in flight
  | "done"
  | "aborted"
  | "failed";

export interface DecoderPageState {
  page: RenderedPdfPage;
  status: "queued" | "running" | "complete" | "failed" | "skipped";
  annotations: PolicyAnnotation[];
  error?: string;
  durationMs?: number;
}

export interface DecoderState {
  file: File;
  status: DecoderStatus;
  pages: DecoderPageState[];
  /** 1-indexed page currently running, or null when no page running */
  currentPage: number | null;
  /** Total pages successfully analyzed */
  pagesComplete: number;
  /** Global error if rendering failed before any page ran */
  error?: string;
}

interface RecourseState {
  // Existing canonical-case state ----------------------------------------
  cases: Case[];
  activeCase: Case;
  setActiveCase: (id: string) => void;
  stage: FlowStage;
  setStage: (s: FlowStage) => void;
  focusedEntityId: string | null;
  setFocusedEntityId: (id: string | null) => void;
  reset: () => void;

  // Upload-mode state ----------------------------------------------------
  mode: DemoMode;
  setMode: (m: DemoMode) => void;

  /** Status of the local Ollama daemon. Re-probed on demand. */
  ollamaStatus: OllamaStatus;
  ollamaModels: OllamaModel[];
  ollamaError?: string;
  /** Re-run the probe (after user starts Ollama) */
  reprobeOllama: () => void;

  /** Which model the user picked (defaults to first vision-capable) */
  selectedModel: string | null;
  setSelectedModel: (m: string) => void;

  uploadedDoc: UploadedDoc | null;
  /** Hand a File to the provider — it renders + readies for extraction */
  loadFile: (f: File) => Promise<void>;
  /** Run Ollama extraction against the currently loaded doc */
  runExtraction: () => Promise<void>;
  /** Abort an in-flight extraction */
  cancelExtraction: () => void;
  /** Clear the uploaded doc, reset upload flow to dropzone */
  clearUpload: () => void;

  // Which upload-mode task the user is running
  uploadTask: UploadTask;
  setUploadTask: (t: UploadTask) => void;

  // Policy decoder state (independent lifecycle from single-doc denial flow)
  decoder: DecoderState | null;
  loadPolicyFile: (f: File) => Promise<void>;
  runDecoder: () => Promise<void>;
  cancelDecoder: () => void;
  clearDecoder: () => void;
}

const Ctx = createContext<RecourseState | null>(null);

export function RecourseProvider({
  children,
  cases,
}: {
  children: ReactNode;
  cases: Case[];
}) {
  if (cases.length === 0) {
    throw new Error("RecourseProvider requires at least one case");
  }

  // Canonical-case state
  const [activeCaseId, setActiveCaseId] = useState<string>(cases[0].id);
  const [stage, setStage] = useState<FlowStage>("landing");
  const [focusedEntityId, setFocusedEntityId] = useState<string | null>(null);

  // Upload-mode state
  const [mode, setMode] = useState<DemoMode>("canonical");
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>("unknown");
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaError, setOllamaError] = useState<string | undefined>(undefined);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDoc | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Upload-mode task + decoder state
  const [uploadTask, setUploadTask] = useState<UploadTask>("denial");
  const [decoder, setDecoder] = useState<DecoderState | null>(null);
  const decoderAbortRef = useRef<AbortController | null>(null);
  // Mutable "should we keep analyzing pages" flag. We set this to false
  // on cancel so the page loop exits cleanly between pages without
  // depending on a setState round-trip.
  const decoderRunningRef = useRef<boolean>(false);

  const activeCase = useMemo(
    () => cases.find((c) => c.id === activeCaseId) ?? cases[0],
    [cases, activeCaseId]
  );

  const setActiveCase = useCallback((id: string) => {
    setActiveCaseId(id);
    setStage("landing");
    setFocusedEntityId(null);
  }, []);

  const reset = useCallback(() => {
    setStage("landing");
    setFocusedEntityId(null);
  }, []);

  const reprobeOllama = useCallback(() => {
    let cancelled = false;
    probeOllama().then((result) => {
      if (cancelled) return;
      setOllamaStatus(result.status);
      setOllamaModels(result.models);
      setOllamaError(result.error);
      // Auto-select first vision model if none selected, or selected is gone
      const visionModels = result.models.filter((m) => m.vision);
      setSelectedModel((prev) => {
        if (prev && result.models.some((m) => m.name === prev)) return prev;
        return visionModels[0]?.name ?? null;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Probe Ollama once when the user first switches into upload mode.
  // Don't probe on initial mount — keeps the landing fast and avoids a
  // failed-fetch in the console for users who never open upload mode.
  const probedRef = useRef(false);
  useEffect(() => {
    if (mode === "upload" && !probedRef.current) {
      probedRef.current = true;
      reprobeOllama();
    }
  }, [mode, reprobeOllama]);

  const loadFile = useCallback(async (f: File) => {
    setUploadedDoc({
      file: f,
      rendered: {} as RenderedPdfPage, // placeholder; replaced below
      extractionStatus: "rendering",
    });
    try {
      const isPdf =
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      const rendered = isPdf
        ? await renderPdfPageToImage(f)
        : await renderImageToDataUrl(f);
      setUploadedDoc({
        file: f,
        rendered,
        extractionStatus: "ready",
      });
    } catch (err) {
      setUploadedDoc({
        file: f,
        rendered: {} as RenderedPdfPage,
        extractionStatus: "failed",
        extractionError:
          err instanceof Error
            ? err.message
            : "Could not render the document",
      });
    }
  }, []);

  const runExtraction = useCallback(async () => {
    setUploadedDoc((doc) => {
      if (!doc || doc.extractionStatus === "rendering") return doc;
      const model = selectedModel;
      if (!model) {
        return {
          ...doc,
          extractionStatus: "failed",
          extractionError: "No model selected",
        };
      }
      // Kick off the call asynchronously; we'll write back via setUploadedDoc.
      abortRef.current = new AbortController();
      generateExtraction({
        model,
        image: doc.rendered.dataUrl,
        signal: abortRef.current.signal,
        onToken: (_, total) =>
          setUploadedDoc((d) =>
            d ? { ...d, streamingText: total } : d
          ),
      })
        .then((result) => {
          setUploadedDoc((d) =>
            d
              ? {
                  ...d,
                  extractionStatus: result.parsed ? "done" : "failed",
                  extraction: result.parsed,
                  rawResponse: result.raw,
                  extractionError: result.parseError,
                  durationMs: result.durationMs,
                  streamingText: undefined,
                }
              : d
          );
        })
        .catch((err) => {
          if (abortRef.current?.signal.aborted) {
            setUploadedDoc((d) =>
              d
                ? {
                    ...d,
                    extractionStatus: "failed",
                    extractionError: "Cancelled",
                  }
                : d
            );
            return;
          }
          setUploadedDoc((d) =>
            d
              ? {
                  ...d,
                  extractionStatus: "failed",
                  extractionError:
                    err instanceof Error
                      ? err.message
                      : "Extraction failed",
                }
              : d
          );
        });
      return {
        ...doc,
        extractionStatus: "extracting",
        streamingText: "",
        extraction: undefined,
        extractionError: undefined,
      };
    });
  }, [selectedModel]);

  const cancelExtraction = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearUpload = useCallback(() => {
    abortRef.current?.abort();
    setUploadedDoc(null);
  }, []);

  // ---- Policy decoder methods ----------------------------------------

  const loadPolicyFile = useCallback(async (f: File) => {
    setDecoder({
      file: f,
      status: "rendering",
      pages: [],
      currentPage: null,
      pagesComplete: 0,
    });
    try {
      const collected: DecoderPageState[] = [];
      // Stream pages into state as they render so the user sees the
      // thumbnails populating instead of waiting for all 25 pages.
      for await (const page of renderPdfAllPages(f)) {
        collected.push({ page, status: "queued", annotations: [] });
        setDecoder((d) =>
          d ? { ...d, pages: [...collected] } : d
        );
      }
      setDecoder((d) =>
        d ? { ...d, status: "ready" } : d
      );
    } catch (err) {
      setDecoder((d) =>
        d
          ? {
              ...d,
              status: "failed",
              error:
                err instanceof Error
                  ? err.message
                  : "Could not render the policy document",
            }
          : d
      );
    }
  }, []);

  const runDecoder = useCallback(async () => {
    // Snapshot guard rails — model + decoder must both be ready
    if (!selectedModel) {
      setDecoder((d) =>
        d
          ? { ...d, status: "failed", error: "No vision model selected" }
          : d
      );
      return;
    }
    decoderRunningRef.current = true;
    setDecoder((d) =>
      d
        ? {
            ...d,
            status: "analyzing",
            pages: d.pages.map((p) =>
              p.status === "complete" || p.status === "failed"
                ? p
                : { ...p, status: "queued", annotations: [] }
            ),
            pagesComplete: d.pages.filter((p) => p.status === "complete").length,
          }
        : d
    );

    // Pull a fresh snapshot of pages to iterate. Each iteration awaits
    // its own Ollama call; cancellation flips decoderRunningRef.current.
    let snapshot: DecoderPageState[] = [];
    setDecoder((d) => {
      snapshot = d?.pages ?? [];
      return d;
    });
    // setState above is synchronous in capturing the ref — but to be
    // safe, fall through with a microtask yield so React commits.
    await Promise.resolve();

    for (let i = 0; i < snapshot.length; i++) {
      if (!decoderRunningRef.current) break;
      const ps = snapshot[i];
      if (ps.status === "complete") continue;

      decoderAbortRef.current = new AbortController();
      setDecoder((d) =>
        d
          ? {
              ...d,
              currentPage: ps.page.pageNumber,
              pages: d.pages.map((p) =>
                p.page.pageNumber === ps.page.pageNumber
                  ? { ...p, status: "running" }
                  : p
              ),
            }
          : d
      );

      try {
        const result = await decodePolicyPage({
          model: selectedModel,
          image: ps.page.dataUrl,
          signal: decoderAbortRef.current.signal,
        });
        setDecoder((d) =>
          d
            ? {
                ...d,
                pagesComplete: d.pagesComplete + (result.annotations ? 1 : 0),
                pages: d.pages.map((p) =>
                  p.page.pageNumber === ps.page.pageNumber
                    ? {
                        ...p,
                        status: result.annotations ? "complete" : "failed",
                        annotations: result.annotations ?? [],
                        error: result.parseError,
                        durationMs: result.durationMs,
                      }
                    : p
                ),
              }
            : d
        );
      } catch (err) {
        const aborted = decoderAbortRef.current?.signal.aborted;
        setDecoder((d) =>
          d
            ? {
                ...d,
                pages: d.pages.map((p) =>
                  p.page.pageNumber === ps.page.pageNumber
                    ? {
                        ...p,
                        status: aborted ? "skipped" : "failed",
                        error: aborted
                          ? "Cancelled"
                          : err instanceof Error
                          ? err.message
                          : "Page analysis failed",
                      }
                    : p
                ),
              }
            : d
        );
        if (aborted) break;
      }
    }

    decoderRunningRef.current = false;
    setDecoder((d) =>
      d
        ? {
            ...d,
            currentPage: null,
            status: d.pages.every(
              (p) => p.status === "complete" || p.status === "skipped"
            )
              ? "done"
              : decoderRunningRef.current
              ? "analyzing"
              : "done",
          }
        : d
    );
  }, [selectedModel]);

  const cancelDecoder = useCallback(() => {
    decoderRunningRef.current = false;
    decoderAbortRef.current?.abort();
    setDecoder((d) => (d ? { ...d, status: "aborted" } : d));
  }, []);

  const clearDecoder = useCallback(() => {
    decoderRunningRef.current = false;
    decoderAbortRef.current?.abort();
    setDecoder(null);
  }, []);

  const value = useMemo<RecourseState>(
    () => ({
      cases,
      activeCase,
      setActiveCase,
      stage,
      setStage,
      focusedEntityId,
      setFocusedEntityId,
      reset,
      mode,
      setMode,
      ollamaStatus,
      ollamaModels,
      ollamaError,
      reprobeOllama,
      selectedModel,
      setSelectedModel,
      uploadedDoc,
      loadFile,
      runExtraction,
      cancelExtraction,
      clearUpload,
      uploadTask,
      setUploadTask,
      decoder,
      loadPolicyFile,
      runDecoder,
      cancelDecoder,
      clearDecoder,
    }),
    [
      cases,
      activeCase,
      setActiveCase,
      stage,
      focusedEntityId,
      reset,
      mode,
      ollamaStatus,
      ollamaModels,
      ollamaError,
      reprobeOllama,
      selectedModel,
      uploadedDoc,
      loadFile,
      runExtraction,
      cancelExtraction,
      clearUpload,
      uploadTask,
      decoder,
      loadPolicyFile,
      runDecoder,
      cancelDecoder,
      clearDecoder,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecourse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRecourse must be used within RecourseProvider");
  return ctx;
}

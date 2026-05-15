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
  generateExtraction,
  probeOllama,
  type ExtractionResponse,
  type OllamaModel,
  type OllamaStatus,
} from "@/lib/ollama";
import {
  renderImageToDataUrl,
  renderPdfPageToImage,
  type RenderedPdfPage,
} from "@/lib/pdf";

export type FlowStage = "landing" | "scanning" | "extracted" | "strategy" | "draft";

/** Top-level mode — which "shape" of demo the user is in. */
export type DemoMode = "canonical" | "upload";

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
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecourse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRecourse must be used within RecourseProvider");
  return ctx;
}

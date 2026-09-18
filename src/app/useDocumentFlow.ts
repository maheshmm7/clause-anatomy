import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { ExplanationLanguage } from '../../shared/languages';
import { LIMITS } from '../../shared/limits';
import { redact } from '../../shared/redact';
import type { AnalysisResult } from '../../shared/schema';
import { ApiClientError, api } from '../api/client';
import { ReadError, readDocumentFile } from '../features/input/readers';
import type { MessageKey } from '../i18n/messages/en';
import { sha256Hex } from '../lib/browser';
import { applyTexts, collectTexts } from '../lib/translatable';
import { SAMPLES, type SampleId } from '../samples';
import {
  flowReducer,
  initialFlowState,
  type FlowError,
  type LoadedDocument,
  type PendingUpload,
} from './flow';

class FlowFailure extends Error {
  readonly error: FlowError;

  constructor(error: FlowError) {
    super(error.key);
    this.error = error;
  }
}

function toFlowError(error: unknown): FlowError | null {
  if (error instanceof FlowFailure) return error.error;
  if (error instanceof ReadError) return { key: error.messageKey };
  if (error instanceof ApiClientError) {
    if (error.code === 'cancelled') return null;
    return { key: `error_${error.code}` as MessageKey };
  }
  return { key: 'error_internal' };
}

export interface DocumentFlowOptions {
  explanationLanguage: ExplanationLanguage;
  aiAvailable: boolean;
  /** Called when an open paper has been explained again in another language. */
  onReplaced?: (docId: string, loaded: LoadedDocument) => void;
  /** Receives every finished analysis (the workspace adds it to the library). */
  onLoaded: (document: LoadedDocument) => void;
}

/**
 * Orchestrates reading → redacting → analysing, with cancellation and an in-memory
 * cache (same text + language never costs a second AI call during a visit).
 */
export function useDocumentFlow({
  explanationLanguage,
  aiAvailable,
  onLoaded,
  onReplaced,
}: DocumentFlowOptions) {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);
  const controllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(new Map<string, AnalysisResult>());
  const onLoadedRef = useRef(onLoaded);
  const onReplacedRef = useRef(onReplaced);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
    onReplacedRef.current = onReplaced;
  }, [onLoaded, onReplaced]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  // Photo previews are object URLs: release them when no longer shown.
  const pendingPreview = state.stage === 'idle' ? state.pending?.previewUrl : null;
  useEffect(
    () => () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    },
    [pendingPreview],
  );

  /** A task returns the paper to add to the library, or `null` if it updated one in place. */
  const run = useCallback(async (task: (signal: AbortSignal) => Promise<LoadedDocument | null>) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const document = await task(controller.signal);
      if (controller.signal.aborted) return;
      dispatch({ type: 'finished' });
      if (document) onLoadedRef.current(document);
    } catch (error) {
      if (controller.signal.aborted) return;
      const flowError = toFlowError(error);
      dispatch(flowError ? { type: 'failed', error: flowError } : { type: 'finished' });
    }
  }, []);

  /**
   * Shows a paper already in the library in another language. The paper is never
   * analysed again: a language seen before is reused instantly, an example uses the
   * translation it ships with, and otherwise only the explanation texts are translated
   * (from the original analysis, so every language shows exactly the same clauses).
   */
  const explainAgain = useCallback(
    (docId: string, loaded: LoadedDocument, language: ExplanationLanguage) => {
      const sourceLanguage = loaded.sourceLanguage ?? loaded.analysis.language;
      const known: Partial<Record<ExplanationLanguage, AnalysisResult>> = {
        ...loaded.translations,
        [loaded.analysis.language]: loaded.analysis,
      };
      const withAnalysis = (analysis: AnalysisResult): LoadedDocument => ({
        ...loaded,
        analysis,
        languageFallback: false,
        sourceLanguage,
        translations: { ...known, [language]: analysis },
      });

      const cached = known[language];
      if (cached) {
        onReplacedRef.current?.(docId, withAnalysis(cached));
        return Promise.resolve();
      }

      return run(async (signal) => {
        dispatch({ type: 'progress', step: 'translating' });
        const sample = loaded.sampleId
          ? SAMPLES.find((candidate) => candidate.id === loaded.sampleId)
          : undefined;
        let analysis = sample ? (await sample.load()).analyses[language] : undefined;
        if (!analysis) {
          const source = known[sourceLanguage] ?? loaded.analysis;
          const { items } = await api.translate({ language, items: collectTexts(source) }, signal);
          analysis = applyTexts(source, items, language);
        }
        onReplacedRef.current?.(docId, withAnalysis(analysis));
        // The paper stays in place; nothing new is added to the library.
        return null;
      });
    },
    [run],
  );

  const analyze = useCallback(
    async (rawText: string, signal: AbortSignal, partialRead = false): Promise<LoadedDocument> => {
      dispatch({ type: 'progress', step: 'protecting' });
      const { text, total } = redact(rawText.trim());
      if (text.length < LIMITS.minDocumentChars) throw new FlowFailure({ key: 'error_tooShort' });
      if (text.length > LIMITS.maxDocumentChars) {
        throw new FlowFailure({ key: 'error_tooLong', values: { max: LIMITS.maxDocumentChars } });
      }

      dispatch({ type: 'progress', step: 'explaining' });
      const cacheKey = await sha256Hex(`${explanationLanguage}\n${text}`);
      let analysis = cacheRef.current.get(cacheKey);
      if (!analysis) {
        analysis = await api.analyze({ text, language: explanationLanguage }, signal);
        cacheRef.current.set(cacheKey, analysis);
      }
      return {
        text,
        analysis,
        origin: 'user',
        redactions: total,
        partialRead,
        languageFallback: false,
      };
    },
    [explanationLanguage],
  );

  const submitText = useCallback(
    (text: string) => run((signal) => analyze(text, signal)),
    [analyze, run],
  );

  const submitFile = useCallback(
    async (file: File) => {
      dispatch({ type: 'progress', step: 'reading' });
      try {
        const result = await readDocumentFile(file);
        if (result.kind === 'visual') {
          const { kind, ...pending } = result;
          dispatch({ type: 'needsConsent', pending });
          return;
        }
        await run((signal) => analyze(result.text, signal));
      } catch (error) {
        const flowError = toFlowError(error);
        dispatch(flowError ? { type: 'failed', error: flowError } : { type: 'finished' });
      }
    },
    [analyze, run],
  );

  const confirmConsent = useCallback(
    (pending: PendingUpload) =>
      run(async (signal) => {
        dispatch({ type: 'progress', step: 'reading' });
        const extraction = await api.extract(
          { mimeType: pending.mimeType, data: pending.data },
          signal,
        );
        if (extraction.quality === 'unreadable') throw new FlowFailure({ key: 'error_unreadable' });
        return analyze(extraction.text, signal, extraction.quality === 'partial');
      }),
    [analyze, run],
  );

  const loadSample = useCallback(
    (id: SampleId) =>
      run(async (signal) => {
        dispatch({ type: 'progress', step: 'reading' });
        const sample = SAMPLES.find((candidate) => candidate.id === id);
        if (!sample) throw new FlowFailure({ key: 'error_not_found' });
        const data = await sample.load();
        const precomputed = data.analyses[explanationLanguage];
        if (precomputed || !aiAvailable) {
          const { text, total } = redact(data.text);
          const analysis = precomputed ?? data.analyses.en;
          if (!analysis) throw new FlowFailure({ key: 'error_not_found' });
          return {
            text,
            analysis,
            origin: 'sample',
            sampleId: id,
            redactions: total,
            partialRead: false,
            languageFallback: !precomputed,
          };
        }
        return { ...(await analyze(data.text, signal)), origin: 'sample', sampleId: id };
      }),
    [aiAvailable, analyze, explanationLanguage, run],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    dispatch({ type: 'finished' });
  }, []);

  const cancelConsent = useCallback(() => dispatch({ type: 'consentCancelled' }), []);

  return {
    state,
    submitText,
    submitFile,
    confirmConsent,
    cancelConsent,
    loadSample,
    explainAgain,
    cancel,
  };
}

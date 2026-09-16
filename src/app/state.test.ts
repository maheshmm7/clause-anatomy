import { describe, expect, it } from 'vitest';
import { RENTAL_SAMPLE } from '../samples/rental';
import { initialResultState, resultReducer } from '../features/result/resultState';
import { flowReducer, initialFlowState, type LoadedDocument, type PendingUpload } from './flow';

const pending: PendingUpload = {
  mimeType: 'image/jpeg',
  data: 'abc',
  previewUrl: null,
  fileName: 'page.jpg',
};
const document: LoadedDocument = {
  text: 'text',
  analysis: RENTAL_SAMPLE.analyses.en!,
  origin: 'sample',
  redactions: 0,
  partialRead: false,
  languageFallback: false,
};

describe('flowReducer', () => {
  it('walks the happy path: input → working → result → reset', () => {
    let state = flowReducer(initialFlowState, { type: 'progress', step: 'reading' });
    expect(state).toEqual({ stage: 'working', step: 'reading' });
    state = flowReducer(state, { type: 'progress', step: 'explaining' });
    state = flowReducer(state, { type: 'succeeded', document });
    expect(state).toEqual({ stage: 'result', document });
    expect(flowReducer(state, { type: 'reset' })).toEqual(initialFlowState);
  });

  it('asks for consent before sending photos, and can cancel it', () => {
    const asking = flowReducer(initialFlowState, { type: 'needsConsent', pending });
    expect(asking).toEqual({ stage: 'input', error: null, pending });
    expect(flowReducer(asking, { type: 'consentCancelled' })).toEqual(initialFlowState);
  });

  it('ignores consent cancellation outside the input stage', () => {
    const working = flowReducer(initialFlowState, { type: 'progress', step: 'reading' });
    expect(flowReducer(working, { type: 'consentCancelled' })).toBe(working);
  });

  it('returns to input with a message on failure, and clears it on cancel', () => {
    const failed = flowReducer(
      { stage: 'working', step: 'explaining' },
      { type: 'failed', error: { key: 'error_ai_busy' } },
    );
    expect(failed).toEqual({ stage: 'input', error: { key: 'error_ai_busy' }, pending: null });
    expect(flowReducer(failed, { type: 'cancelled' })).toEqual(initialFlowState);
  });
});

describe('resultReducer', () => {
  it('switches tabs and perspective', () => {
    let state = resultReducer(initialResultState, { type: 'setTab', tab: 'ask' });
    state = resultReducer(state, { type: 'setPerspective', perspective: 'lessee' });
    expect(state).toMatchObject({ tab: 'ask', perspective: 'lessee' });
  });

  it('records teach-back outcomes', () => {
    const state = resultReducer(initialResultState, {
      type: 'recordCheck',
      pointId: 'p1',
      outcome: 'unsure',
    });
    expect(state.checks).toEqual({ p1: 'unsure' });
  });

  it('tracks questions from loading to answered or failed, newest first', () => {
    let state = resultReducer(initialResultState, {
      type: 'askStarted',
      id: 'a1',
      question: 'First?',
    });
    state = resultReducer(state, { type: 'askStarted', id: 'a2', question: 'Second?' });
    state = resultReducer(state, {
      type: 'askFinished',
      id: 'a1',
      result: { basis: 'none', answer: 'Ask a lawyer', quotes: [] },
    });
    state = resultReducer(state, { type: 'askFailed', id: 'a2', errorKey: 'error_network' });
    expect(state.asks.map((entry) => [entry.id, entry.status])).toEqual([
      ['a2', 'error'],
      ['a1', 'done'],
    ]);
  });

  it('opens a point in the list or in the original text', () => {
    expect(resultReducer(initialResultState, { type: 'openPoint', pointId: 'p3' })).toMatchObject({
      tab: 'points',
      selectedPointId: 'p3',
    });
    expect(
      resultReducer(initialResultState, { type: 'showInOriginal', pointId: 'p3' }),
    ).toMatchObject({
      tab: 'original',
      selectedPointId: 'p3',
    });
  });
});

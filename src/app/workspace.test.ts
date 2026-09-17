import { describe, expect, it } from 'vitest';
import { RENTAL_B_SAMPLE } from '../samples/rental-b';
import { RENTAL_SAMPLE } from '../samples/rental';
import { flowReducer, initialFlowState, type LoadedDocument, type PendingUpload } from './flow';
import { parseRoute, readRouteDocId, routeToHash, type Route } from './navigation';
import {
  activeDoc,
  initialWorkspace,
  MAX_LIBRARY_SIZE,
  workspaceReducer,
  type WorkspaceAction,
  type WorkspaceState,
} from './workspace';

const loaded = (analysis = RENTAL_SAMPLE.analyses.en!): LoadedDocument => ({
  text: RENTAL_SAMPLE.text,
  analysis,
  origin: 'sample',
  redactions: 0,
  partialRead: false,
  languageFallback: false,
});

const run = (actions: WorkspaceAction[], state: WorkspaceState = initialWorkspace) =>
  actions.reduce(workspaceReducer, state);

const withTwoPapers = () =>
  run([
    { type: 'addDocument', id: 'a', loaded: loaded() },
    { type: 'addDocument', id: 'b', loaded: loaded(RENTAL_B_SAMPLE.analyses.en!) },
  ]);

describe('workspace reducer', () => {
  it('opens a new paper on its overview with the first clause selected', () => {
    const state = run([{ type: 'addDocument', id: 'a', loaded: loaded() }]);
    expect(state.view).toBe('overview');
    expect(state.activeId).toBe('a');
    expect(activeDoc(state)).toMatchObject({ perspective: null, selectedPointId: 'p1' });
    expect(state.compareIds).toEqual(['a', null]);
  });

  it('keeps a bounded library, newest first, and fills both compare slots', () => {
    const state = withTwoPapers();
    expect(state.docs.map((doc) => doc.id)).toEqual(['b', 'a']);
    expect(state.compareIds).toEqual(['a', 'b']);

    const many = run(
      Array.from({ length: MAX_LIBRARY_SIZE + 2 }, (_, index) => ({
        type: 'addDocument' as const,
        id: `d${index}`,
        loaded: loaded(),
      })),
    );
    expect(many.docs).toHaveLength(MAX_LIBRARY_SIZE);
    expect(many.docs[0]?.id).toBe(`d${MAX_LIBRARY_SIZE + 1}`);
  });

  it('guards sections that need a paper or two papers', () => {
    expect(run([{ type: 'navigate', view: 'clauses' }]).view).toBe('home');
    const one = run([
      { type: 'addDocument', id: 'a', loaded: loaded() },
      { type: 'navigate', view: 'compare' },
    ]);
    expect(one.view).toBe('home');
    expect(run([{ type: 'navigate', view: 'compare' }], withTwoPapers()).view).toBe('compare');
    expect(run([{ type: 'navigate', view: 'risks', docId: 'a' }], withTwoPapers())).toMatchObject({
      view: 'risks',
      activeId: 'a',
    });
  });

  it('ignores unknown papers', () => {
    const state = withTwoPapers();
    expect(workspaceReducer(state, { type: 'openDocument', id: 'missing' })).toBe(state);
    expect(
      workspaceReducer(state, { type: 'navigate', view: 'plan', docId: 'missing' }).activeId,
    ).toBe('b');
  });

  it('removing the open paper returns home; removing another keeps the section', () => {
    const state = run([{ type: 'openDocument', id: 'a', view: 'clauses' }], withTwoPapers());
    expect(workspaceReducer(state, { type: 'removeDocument', id: 'b' })).toMatchObject({
      view: 'clauses',
      activeId: 'a',
      compareIds: ['a', null],
    });
    expect(workspaceReducer(state, { type: 'removeDocument', id: 'a' })).toMatchObject({
      view: 'home',
      activeId: null,
    });
    const comparing = run([{ type: 'navigate', view: 'compare' }], state);
    expect(workspaceReducer(comparing, { type: 'removeDocument', id: 'b' }).view).toBe('home');
  });

  it('records role, checks, notes and flags per paper', () => {
    const state = run(
      [
        { type: 'setPerspective', perspective: 'lessee' },
        { type: 'recordCheck', pointId: 'p1', outcome: 'unsure' },
        { type: 'setNote', pointId: 'p1', note: 'Grace period?' },
        { type: 'toggleFlag', pointId: 'p1' },
        { type: 'toggleFlag', pointId: 'p2' },
        { type: 'toggleFlag', pointId: 'p2' },
        { type: 'selectPoint', pointId: 'p3', view: 'document' },
      ],
      withTwoPapers(),
    );
    const doc = activeDoc(state);
    expect(doc).toMatchObject({
      id: 'b',
      perspective: 'lessee',
      checks: { p1: 'unsure' },
      notes: { p1: 'Grace period?' },
      flags: { p1: true, p2: false },
      selectedPointId: 'p3',
    });
    expect(state.view).toBe('document');
    expect(state.docs.find((candidate) => candidate.id === 'a')?.flags).toEqual({});
  });

  it('tracks questions for the paper they were asked about, even after switching', () => {
    const answer = { basis: 'document' as const, answer: 'Rs. 200 a day.', quotes: [] };
    const state = run(
      [
        { type: 'askStarted', docId: 'b', id: 'q1', question: 'Late fee?' },
        { type: 'askStarted', docId: 'b', id: 'q2', question: 'Pets?' },
        { type: 'openDocument', id: 'a' },
        { type: 'askFinished', docId: 'b', id: 'q1', result: answer },
        { type: 'askFailed', docId: 'b', id: 'q2', errorKey: 'error_ai_busy' },
      ],
      withTwoPapers(),
    );
    expect(state.docs.find((doc) => doc.id === 'b')?.asks).toEqual([
      { id: 'q1', question: 'Late fee?', status: 'done', result: answer },
      { id: 'q2', question: 'Pets?', status: 'error', errorKey: 'error_ai_busy' },
    ]);
    expect(activeDoc(state)?.asks).toEqual([]);
  });

  it('lets the reader choose which papers to compare', () => {
    const state = run([{ type: 'setCompare', slot: 0, id: 'b' }], withTwoPapers());
    expect(state.compareIds).toEqual(['b', 'b']);
  });
});

describe('document flow reducer', () => {
  const pending: PendingUpload = {
    mimeType: 'image/jpeg',
    data: 'x',
    previewUrl: null,
    fileName: 'page.jpg',
  };

  it('moves through consent, work and completion', () => {
    const asking = flowReducer(initialFlowState, { type: 'needsConsent', pending });
    expect(asking).toEqual({ stage: 'idle', error: null, pending });
    expect(flowReducer(asking, { type: 'consentCancelled' })).toEqual(initialFlowState);
    const working = flowReducer(asking, { type: 'progress', step: 'explaining' });
    expect(working).toEqual({ stage: 'working', step: 'explaining' });
    expect(flowReducer(working, { type: 'consentCancelled' })).toBe(working);
    expect(flowReducer(working, { type: 'finished' })).toEqual(initialFlowState);
  });

  it('keeps the error for the reader and clears pending uploads', () => {
    const failed = flowReducer(
      { stage: 'idle', error: null, pending },
      { type: 'failed', error: { key: 'error_unreadable' } },
    );
    expect(failed).toEqual({ stage: 'idle', error: { key: 'error_unreadable' }, pending: null });
  });
});

describe('routes', () => {
  it('reads pages from the URL hash and falls back safely', () => {
    expect(parseRoute('')).toEqual({ page: 'landing' });
    expect(parseRoute('#/')).toEqual({ page: 'landing' });
    expect(parseRoute('#/privacy')).toEqual({ page: 'legal', doc: 'privacy' });
    expect(parseRoute('#/workspace')).toEqual({ page: 'app', view: 'home' });
    expect(parseRoute('#/workspace/risks')).toEqual({ page: 'app', view: 'risks' });
    expect(parseRoute('#/workspace/toString')).toEqual({ page: 'app', view: 'home' });
    expect(parseRoute('#/nowhere')).toEqual({ page: 'landing' });
    expect(parseRoute('#main')).toEqual({ page: 'landing' });
  });

  it('writes every route back to the same hash', () => {
    const routes: Route[] = [
      { page: 'landing' },
      { page: 'legal', doc: 'accessibility' },
      { page: 'app', view: 'home' },
      { page: 'app', view: 'compare' },
    ];
    for (const route of routes) expect(parseRoute(routeToHash(route))).toEqual(route);
    expect(routeToHash({ page: 'app', view: 'home' })).toBe('#/workspace');
  });

  it('keeps the open paper id out of the URL, in history state only', () => {
    expect(readRouteDocId({ clauseAnatomyDoc: 'paper-1' })).toBe('paper-1');
    expect(readRouteDocId({ clauseAnatomyDoc: 7 })).toBeNull();
    expect(readRouteDocId(null)).toBeNull();
  });
});

import type { AnswerResult } from '../../shared/schema';
import type { MessageKey } from '../i18n/messages/en';
import type { CheckOutcome } from '../lib/brief';
import type { Perspective } from '../lib/perspective';
import type { LoadedDocument } from './flow';

/**
 * The legal intelligence workspace: a small in-memory library of analysed papers
 * (nothing is persisted), the section being viewed, and everything the reader does
 * per paper — role, understanding checks, notes, lawyer flags and questions.
 * Pure reducer, fully unit-tested.
 */

export const VIEWS = [
  'home',
  'overview',
  'clauses',
  'document',
  'risks',
  'whatif',
  'ask',
  'glossary',
  'plan',
  'compare',
] as const;
export type View = (typeof VIEWS)[number];

/** Sections that need an open paper. */
export const DOCUMENT_VIEWS = [
  'overview',
  'clauses',
  'document',
  'risks',
  'whatif',
  'ask',
  'glossary',
  'plan',
] as const satisfies readonly View[];

export const MAX_LIBRARY_SIZE = 6;

export interface AskEntry {
  id: string;
  question: string;
  status: 'loading' | 'done' | 'error';
  result?: AnswerResult;
  errorKey?: MessageKey;
}

export interface WorkspaceDoc {
  id: string;
  loaded: LoadedDocument;
  perspective: Perspective;
  checks: Record<string, CheckOutcome>;
  notes: Record<string, string>;
  flags: Record<string, boolean>;
  asks: AskEntry[];
  selectedPointId: string | null;
}

export interface WorkspaceState {
  docs: WorkspaceDoc[];
  activeId: string | null;
  view: View;
  compareIds: [string | null, string | null];
}

export type WorkspaceAction =
  | { type: 'addDocument'; id: string; loaded: LoadedDocument }
  | { type: 'removeDocument'; id: string }
  | { type: 'openDocument'; id: string; view?: View }
  | { type: 'replaceAnalysis'; id: string; loaded: LoadedDocument }
  | { type: 'navigate'; view: View; docId?: string | null }
  | { type: 'setPerspective'; perspective: Perspective }
  | { type: 'recordCheck'; pointId: string; outcome: CheckOutcome }
  | { type: 'setNote'; pointId: string; note: string }
  | { type: 'toggleFlag'; pointId: string }
  | { type: 'selectPoint'; pointId: string; view?: View }
  | { type: 'askStarted'; docId: string; id: string; question: string }
  | { type: 'askFinished'; docId: string; id: string; result: AnswerResult }
  | { type: 'askFailed'; docId: string; id: string; errorKey: MessageKey }
  | { type: 'setCompare'; slot: 0 | 1; id: string | null };

export const initialWorkspace: WorkspaceState = {
  docs: [],
  activeId: null,
  view: 'home',
  compareIds: [null, null],
};

export function isDocumentView(view: View): boolean {
  return (DOCUMENT_VIEWS as readonly View[]).includes(view);
}

export function activeDoc(state: WorkspaceState): WorkspaceDoc | null {
  return state.docs.find((doc) => doc.id === state.activeId) ?? null;
}

function updateDoc(
  state: WorkspaceState,
  id: string | null,
  change: (doc: WorkspaceDoc) => WorkspaceDoc,
): WorkspaceState {
  if (!id) return state;
  return { ...state, docs: state.docs.map((doc) => (doc.id === id ? change(doc) : doc)) };
}

function updateAsk(
  doc: WorkspaceDoc,
  id: string,
  change: (entry: AskEntry) => AskEntry,
): WorkspaceDoc {
  return { ...doc, asks: doc.asks.map((entry) => (entry.id === id ? change(entry) : entry)) };
}

/** Keeps compare slots valid: filled with the two most recent papers when possible. */
function normaliseCompare(
  docs: WorkspaceDoc[],
  ids: [string | null, string | null],
): [string | null, string | null] {
  const exists = (id: string | null): id is string =>
    id !== null && docs.some((doc) => doc.id === id);
  const first = exists(ids[0]) ? ids[0] : (docs[0]?.id ?? null);
  const second =
    exists(ids[1]) && ids[1] !== first
      ? ids[1]
      : (docs.find((doc) => doc.id !== first)?.id ?? null);
  return [first, second];
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'addDocument': {
      const doc: WorkspaceDoc = {
        id: action.id,
        loaded: action.loaded,
        perspective: null,
        checks: {},
        notes: {},
        flags: {},
        asks: [],
        selectedPointId: action.loaded.analysis.points[0]?.id ?? null,
      };
      const docs = [doc, ...state.docs].slice(0, MAX_LIBRARY_SIZE);
      return {
        ...state,
        docs,
        activeId: doc.id,
        view: 'overview',
        compareIds: normaliseCompare(docs, state.compareIds),
      };
    }
    case 'removeDocument': {
      const docs = state.docs.filter((doc) => doc.id !== action.id);
      const removedActive = state.activeId === action.id;
      return {
        docs,
        activeId: removedActive ? null : state.activeId,
        view: removedActive || (state.view === 'compare' && docs.length < 2) ? 'home' : state.view,
        compareIds: normaliseCompare(docs, state.compareIds),
      };
    }
    case 'replaceAnalysis': {
      // The reader's own work (role, checks, notes, flags, questions) is kept.
      const points = action.loaded.analysis.points;
      return updateDoc(state, action.id, (doc) => ({
        ...doc,
        loaded: action.loaded,
        selectedPointId: points.some((point) => point.id === doc.selectedPointId)
          ? doc.selectedPointId
          : (points[0]?.id ?? null),
      }));
    }
    case 'openDocument':
      if (!state.docs.some((doc) => doc.id === action.id)) return state;
      return { ...state, activeId: action.id, view: action.view ?? 'overview' };
    case 'navigate': {
      const activeId =
        action.docId !== undefined && state.docs.some((doc) => doc.id === action.docId)
          ? action.docId
          : state.activeId;
      if (isDocumentView(action.view) && !activeId) return { ...state, view: 'home' };
      if (action.view === 'compare' && state.docs.length < 2) return { ...state, view: 'home' };
      return { ...state, activeId, view: action.view };
    }
    case 'setPerspective':
      return updateDoc(state, state.activeId, (doc) => ({
        ...doc,
        perspective: action.perspective,
      }));
    case 'recordCheck':
      return updateDoc(state, state.activeId, (doc) => ({
        ...doc,
        checks: { ...doc.checks, [action.pointId]: action.outcome },
      }));
    case 'setNote':
      return updateDoc(state, state.activeId, (doc) => ({
        ...doc,
        notes: { ...doc.notes, [action.pointId]: action.note },
      }));
    case 'toggleFlag':
      return updateDoc(state, state.activeId, (doc) => ({
        ...doc,
        flags: { ...doc.flags, [action.pointId]: !doc.flags[action.pointId] },
      }));
    case 'selectPoint':
      return {
        ...updateDoc(state, state.activeId, (doc) => ({ ...doc, selectedPointId: action.pointId })),
        view: action.view ?? state.view,
      };
    case 'askStarted':
      return updateDoc(state, action.docId, (doc) => ({
        ...doc,
        asks: [...doc.asks, { id: action.id, question: action.question, status: 'loading' }],
      }));
    case 'askFinished':
      return updateDoc(state, action.docId, (doc) =>
        updateAsk(doc, action.id, (entry) => ({ ...entry, status: 'done', result: action.result })),
      );
    case 'askFailed':
      return updateDoc(state, action.docId, (doc) =>
        updateAsk(doc, action.id, (entry) => ({
          ...entry,
          status: 'error',
          errorKey: action.errorKey,
        })),
      );
    case 'setCompare': {
      const compareIds: [string | null, string | null] = [...state.compareIds];
      compareIds[action.slot] = action.id;
      return { ...state, compareIds };
    }
  }
}

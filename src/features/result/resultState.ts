import type { AnswerResult } from '../../../shared/schema';
import type { MessageKey } from '../../i18n/messages/en';
import type { CheckOutcome } from '../../lib/brief';
import type { Perspective } from '../../lib/perspective';

export const RESULT_TABS = ['points', 'whatif', 'ask', 'next', 'original'] as const;
export type ResultTab = (typeof RESULT_TABS)[number];

export interface AskEntry {
  id: string;
  question: string;
  status: 'loading' | 'done' | 'error';
  result?: AnswerResult;
  errorKey?: MessageKey;
}

export interface ResultState {
  tab: ResultTab;
  perspective: Perspective;
  checks: Record<string, CheckOutcome>;
  asks: AskEntry[];
  /** Point highlighted in the key points list and in the original text. */
  selectedPointId: string | null;
}

export type ResultAction =
  | { type: 'setTab'; tab: ResultTab }
  | { type: 'setPerspective'; perspective: Perspective }
  | { type: 'recordCheck'; pointId: string; outcome: CheckOutcome }
  | { type: 'askStarted'; id: string; question: string }
  | { type: 'askFinished'; id: string; result: AnswerResult }
  | { type: 'askFailed'; id: string; errorKey: MessageKey }
  | { type: 'openPoint'; pointId: string }
  | { type: 'showInOriginal'; pointId: string };

export const initialResultState: ResultState = {
  tab: 'points',
  perspective: null,
  checks: {},
  asks: [],
  selectedPointId: null,
};

export function resultReducer(state: ResultState, action: ResultAction): ResultState {
  switch (action.type) {
    case 'setTab':
      return { ...state, tab: action.tab };
    case 'setPerspective':
      return { ...state, perspective: action.perspective };
    case 'recordCheck':
      return { ...state, checks: { ...state.checks, [action.pointId]: action.outcome } };
    case 'askStarted':
      return {
        ...state,
        asks: [{ id: action.id, question: action.question, status: 'loading' }, ...state.asks],
      };
    case 'askFinished':
      return {
        ...state,
        asks: state.asks.map((entry) =>
          entry.id === action.id ? { ...entry, status: 'done', result: action.result } : entry,
        ),
      };
    case 'askFailed':
      return {
        ...state,
        asks: state.asks.map((entry) =>
          entry.id === action.id ? { ...entry, status: 'error', errorKey: action.errorKey } : entry,
        ),
      };
    case 'openPoint':
      return { ...state, tab: 'points', selectedPointId: action.pointId };
    case 'showInOriginal':
      return { ...state, tab: 'original', selectedPointId: action.pointId };
  }
}

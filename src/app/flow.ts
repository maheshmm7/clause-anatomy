import type { UploadMimeType } from '../../shared/limits';
import type { AnalysisResult } from '../../shared/schema';
import type { MessageValues } from '../i18n/format';
import type { MessageKey } from '../i18n/messages/en';

/**
 * Reading a new paper as an explicit state machine:
 *   idle → (consent for photos) → working → idle
 * A finished analysis is handed to the workspace, so the flow is ready for the next
 * paper straight away. Pure reducer: every transition is unit-tested.
 */

export type WorkingStep = 'reading' | 'protecting' | 'explaining';

export interface FlowError {
  key: MessageKey;
  values?: MessageValues;
}

export interface PendingUpload {
  mimeType: UploadMimeType;
  data: string;
  previewUrl: string | null;
  fileName: string;
}

export interface LoadedDocument {
  /** Set for built-in examples, so they can be re-explained without an AI call. */
  sampleId?: string;
  /** Redacted text: the only version of the document the app keeps in memory. */
  text: string;
  analysis: AnalysisResult;
  origin: 'sample' | 'user';
  redactions: number;
  partialRead: boolean;
  /** The example is shown in English because live AI could not translate it. */
  languageFallback: boolean;
}

export type FlowState =
  | { stage: 'idle'; error: FlowError | null; pending: PendingUpload | null }
  | { stage: 'working'; step: WorkingStep };

export type FlowAction =
  | { type: 'needsConsent'; pending: PendingUpload }
  | { type: 'consentCancelled' }
  | { type: 'progress'; step: WorkingStep }
  | { type: 'failed'; error: FlowError }
  | { type: 'finished' };

export const initialFlowState: FlowState = { stage: 'idle', error: null, pending: null };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'needsConsent':
      return { stage: 'idle', error: null, pending: action.pending };
    case 'consentCancelled':
      return state.stage === 'idle' ? { ...state, pending: null } : state;
    case 'progress':
      return { stage: 'working', step: action.step };
    case 'failed':
      return { stage: 'idle', error: action.error, pending: null };
    case 'finished':
      return initialFlowState;
  }
}

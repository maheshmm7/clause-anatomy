import type { UploadMimeType } from '../../shared/limits';
import type { AnalysisResult } from '../../shared/schema';
import type { MessageValues } from '../i18n/format';
import type { MessageKey } from '../i18n/messages/en';

/**
 * The app's main journey as an explicit state machine:
 *   input → (consent for photos) → working → result
 * Pure reducer: every transition is unit-tested without rendering.
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
  | { stage: 'input'; error: FlowError | null; pending: PendingUpload | null }
  | { stage: 'working'; step: WorkingStep }
  | { stage: 'result'; document: LoadedDocument };

export type FlowAction =
  | { type: 'needsConsent'; pending: PendingUpload }
  | { type: 'consentCancelled' }
  | { type: 'progress'; step: WorkingStep }
  | { type: 'failed'; error: FlowError }
  | { type: 'cancelled' }
  | { type: 'succeeded'; document: LoadedDocument }
  | { type: 'reset' };

export const initialFlowState: FlowState = { stage: 'input', error: null, pending: null };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'needsConsent':
      return { stage: 'input', error: null, pending: action.pending };
    case 'consentCancelled':
      return state.stage === 'input' ? { ...state, pending: null } : state;
    case 'progress':
      return { stage: 'working', step: action.step };
    case 'failed':
      return { stage: 'input', error: action.error, pending: null };
    case 'cancelled':
      return initialFlowState;
    case 'succeeded':
      return { stage: 'result', document: action.document };
    case 'reset':
      return initialFlowState;
  }
}

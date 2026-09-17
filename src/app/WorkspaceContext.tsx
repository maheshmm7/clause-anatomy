import { createContext, useContext, type Dispatch } from 'react';
import type { View, WorkspaceAction, WorkspaceDoc, WorkspaceState } from './workspace';

/**
 * What every workspace view needs, without prop drilling: the state, the open paper,
 * navigation that also records browser history, and asynchronous "ask".
 */
export interface WorkspaceApi {
  state: WorkspaceState;
  doc: WorkspaceDoc | null;
  aiAvailable: boolean;
  dispatch: Dispatch<WorkspaceAction>;
  go: (view: View, options?: { docId?: string; pointId?: string }) => void;
  ask: (question: string) => void;
  askDraft: string;
  setAskDraft: (question: string) => void;
}

export const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside the workspace shell');
  return value;
}

/** For views that only render with an open paper (the shell guarantees one). */
export function useActiveDoc(): WorkspaceApi & { doc: WorkspaceDoc } {
  const api = useWorkspace();
  if (!api.doc) throw new Error('This view needs an open paper');
  return api as WorkspaceApi & { doc: WorkspaceDoc };
}

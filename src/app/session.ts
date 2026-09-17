import type { WorkspaceDoc, WorkspaceState } from './workspace';
import { initialWorkspace, MAX_LIBRARY_SIZE } from './workspace';

/**
 * Keeps the open papers alive across a page refresh, using sessionStorage: the data
 * belongs to this browser tab only, never goes to a server, and the browser clears it
 * when the tab is closed. Restoring is best-effort — anything unexpected is ignored and
 * the workspace simply starts empty.
 */

const KEY = 'clause-anatomy:session';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function isDoc(value: unknown): value is WorkspaceDoc {
  if (!isObject(value) || typeof value.id !== 'string' || !isObject(value.loaded)) return false;
  const { loaded } = value;
  return (
    typeof loaded.text === 'string' &&
    isObject(loaded.analysis) &&
    Array.isArray(loaded.analysis.points) &&
    typeof loaded.analysis.language === 'string'
  );
}

export function readSession(): WorkspaceState | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || !Array.isArray(parsed.docs)) return null;
    const docs = parsed.docs.filter(isDoc).slice(0, MAX_LIBRARY_SIZE);
    if (docs.length === 0) return null;
    const activeId = docs.some((doc) => doc.id === parsed.activeId)
      ? (parsed.activeId as string)
      : (docs[0]?.id ?? null);
    return { ...initialWorkspace, docs, activeId };
  } catch {
    return null;
  }
}

export function writeSession(state: WorkspaceState): void {
  try {
    if (state.docs.length === 0) {
      window.sessionStorage.removeItem(KEY);
      return;
    }
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({ docs: state.docs, activeId: state.activeId }),
    );
  } catch {
    // Storage can be full or blocked; the workspace still works for this page view.
  }
}

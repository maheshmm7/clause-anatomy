import type { Scenario, ScenarioNode, ScenarioOutcome } from './schema.js';

/**
 * What-if simulator engine.
 *
 * The model proposes small Yes/No decision trees grounded in the document. This
 * module never trusts that structure: it validates ids, removes dangling point
 * references, rejects cycles and over-deep trees, and then walks the tree
 * deterministically from the user's answers. No AI is involved at walk time, so
 * the same answers always lead to the same outcome.
 */

export const MAX_SCENARIO_DEPTH = 6;

export type ScenarioAnswer = 'yes' | 'no';

export type ScenarioValidation = { ok: true } | { ok: false; reason: string };

export type ScenarioStep =
  | { kind: 'question'; node: ScenarioNode; depth: number }
  | { kind: 'outcome'; outcome: ScenarioOutcome; depth: number };

function indexScenario(scenario: Scenario): {
  nodes: Map<string, ScenarioNode>;
  outcomes: Map<string, ScenarioOutcome>;
} {
  return {
    nodes: new Map(scenario.nodes.map((node) => [node.id, node])),
    outcomes: new Map(scenario.outcomes.map((outcome) => [outcome.id, outcome])),
  };
}

/** Checks that the tree is well-formed: unique ids, valid links, no cycles, bounded depth. */
export function validateScenario(scenario: Scenario): ScenarioValidation {
  const ids = [...scenario.nodes, ...scenario.outcomes].map((item) => item.id);
  if (new Set(ids).size !== ids.length) return { ok: false, reason: 'duplicate ids' };
  if (scenario.outcomes.length === 0) return { ok: false, reason: 'no outcomes' };

  const { nodes, outcomes } = indexScenario(scenario);
  const exists = (id: string): boolean => nodes.has(id) || outcomes.has(id);

  if (!exists(scenario.startId)) return { ok: false, reason: 'missing start' };
  for (const node of scenario.nodes) {
    if (!exists(node.yes) || !exists(node.no)) {
      return { ok: false, reason: `dangling link from ${node.id}` };
    }
  }

  // Depth-first search: detects cycles and measures the longest path.
  const visiting = new Set<string>();
  const done = new Map<string, number>();

  const depthOf = (id: string): number => {
    if (outcomes.has(id)) return 0;
    const cached = done.get(id);
    if (cached !== undefined) return cached;
    const node = nodes.get(id);
    if (!node) return 0;
    if (visiting.has(id)) return Number.POSITIVE_INFINITY;
    visiting.add(id);
    const depth = 1 + Math.max(depthOf(node.yes), depthOf(node.no));
    visiting.delete(id);
    done.set(id, depth);
    return depth;
  };

  const depth = depthOf(scenario.startId);
  if (!Number.isFinite(depth)) return { ok: false, reason: 'cycle' };
  if (depth > MAX_SCENARIO_DEPTH) return { ok: false, reason: 'too deep' };
  return { ok: true };
}

/**
 * Keeps only valid scenarios and strips references to points that do not exist
 * (for example, points dropped because their quote could not be verified).
 */
export function sanitizeScenarios(
  scenarios: Scenario[],
  knownPointIds: ReadonlySet<string>,
): Scenario[] {
  const keepKnown = (ids: string[]): string[] => ids.filter((id) => knownPointIds.has(id));
  return scenarios
    .map((scenario) => ({
      ...scenario,
      nodes: scenario.nodes.map((node) => ({ ...node, pointIds: keepKnown(node.pointIds) })),
      outcomes: scenario.outcomes.map((outcome) => ({
        ...outcome,
        pointIds: keepKnown(outcome.pointIds),
      })),
    }))
    .filter((scenario) => validateScenario(scenario).ok);
}

/**
 * Follows `answers` from the start of a (validated) scenario and returns the
 * current step. Extra answers after reaching an outcome are ignored.
 */
export function walkScenario(scenario: Scenario, answers: readonly ScenarioAnswer[]): ScenarioStep {
  const { nodes, outcomes } = indexScenario(scenario);
  let currentId = scenario.startId;

  for (let depth = 0; depth <= MAX_SCENARIO_DEPTH; depth += 1) {
    const outcome = outcomes.get(currentId);
    if (outcome) return { kind: 'outcome', outcome, depth };

    const node = nodes.get(currentId);
    if (!node) throw new Error(`Scenario "${scenario.id}" references unknown id "${currentId}"`);

    const answer = answers[depth];
    if (answer === undefined) return { kind: 'question', node, depth };
    currentId = answer === 'yes' ? node.yes : node.no;
  }
  throw new Error(`Scenario "${scenario.id}" exceeds maximum depth`);
}

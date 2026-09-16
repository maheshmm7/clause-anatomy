import { describe, expect, it } from 'vitest';
import type { Scenario } from './schema.js';
import { sanitizeScenarios, validateScenario, walkScenario } from './scenario.js';

function leaveEarly(): Scenario {
  return {
    id: 's1',
    title: 'What if I want to leave early?',
    startId: 'q1',
    nodes: [
      { id: 'q1', question: 'Have you stayed 11 months?', yes: 'o1', no: 'q2', pointIds: ['p1'] },
      {
        id: 'q2',
        question: 'Will you give 2 months notice?',
        yes: 'o2',
        no: 'o3',
        pointIds: ['p2', 'ghost'],
      },
    ],
    outcomes: [
      { id: 'o1', text: 'You can leave; full deposit back.', tone: 'good', pointIds: ['p1'] },
      { id: 'o2', text: 'You can leave after the notice.', tone: 'caution', pointIds: ['p2'] },
      { id: 'o3', text: 'You may lose one month of deposit.', tone: 'bad', pointIds: ['p3'] },
    ],
  };
}

describe('validateScenario', () => {
  it('accepts a well-formed tree', () => {
    expect(validateScenario(leaveEarly())).toEqual({ ok: true });
  });

  it('rejects cycles', () => {
    const scenario = leaveEarly();
    scenario.nodes[1]!.no = 'q1';
    expect(validateScenario(scenario)).toEqual({ ok: false, reason: 'cycle' });
  });

  it('rejects dangling links, a missing start, duplicates and trees without outcomes', () => {
    const dangling = leaveEarly();
    dangling.nodes[0]!.yes = 'nowhere';
    expect(validateScenario(dangling).ok).toBe(false);

    const noStart = { ...leaveEarly(), startId: 'x' };
    expect(validateScenario(noStart)).toEqual({ ok: false, reason: 'missing start' });

    const duplicate = leaveEarly();
    duplicate.outcomes[0]!.id = 'q1';
    expect(validateScenario(duplicate)).toEqual({ ok: false, reason: 'duplicate ids' });

    expect(validateScenario({ ...leaveEarly(), outcomes: [] })).toEqual({
      ok: false,
      reason: 'no outcomes',
    });
  });

  it('rejects trees deeper than the limit', () => {
    const nodes = Array.from({ length: 7 }, (_, i) => ({
      id: `q${i}`,
      question: `Question ${i}?`,
      yes: i === 6 ? 'o1' : `q${i + 1}`,
      no: 'o1',
      pointIds: [],
    }));
    const deep: Scenario = {
      id: 'deep',
      title: 'Deep',
      startId: 'q0',
      nodes,
      outcomes: [{ id: 'o1', text: 'End', tone: 'good', pointIds: [] }],
    };
    expect(validateScenario(deep)).toEqual({ ok: false, reason: 'too deep' });
  });
});

describe('sanitizeScenarios', () => {
  it('removes unknown point ids and drops invalid scenarios', () => {
    const broken = { ...leaveEarly(), id: 's2', startId: 'missing' };
    const result = sanitizeScenarios([leaveEarly(), broken], new Set(['p1', 'p2']));
    expect(result).toHaveLength(1);
    expect(result[0]!.nodes[1]!.pointIds).toEqual(['p2']);
    expect(result[0]!.outcomes[2]!.pointIds).toEqual([]);
  });
});

describe('walkScenario', () => {
  const scenario = leaveEarly();

  it('starts at the first question', () => {
    const step = walkScenario(scenario, []);
    expect(step).toMatchObject({ kind: 'question', depth: 0, node: { id: 'q1' } });
  });

  it('follows answers deterministically to an outcome', () => {
    expect(walkScenario(scenario, ['no', 'no'])).toMatchObject({
      kind: 'outcome',
      outcome: { id: 'o3', tone: 'bad' },
      depth: 2,
    });
    expect(walkScenario(scenario, ['yes'])).toMatchObject({
      kind: 'outcome',
      outcome: { id: 'o1' },
    });
  });

  it('ignores extra answers after an outcome', () => {
    expect(walkScenario(scenario, ['yes', 'no', 'no'])).toMatchObject({ outcome: { id: 'o1' } });
  });

  it('throws on a tree that was not validated', () => {
    expect(() => walkScenario({ ...scenario, startId: 'missing' }, [])).toThrow(/unknown id/);
  });
});

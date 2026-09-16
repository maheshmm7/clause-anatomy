import type { Party, Rule, VerifiedPoint } from '../../shared/schema';

/**
 * "Who are you in this paper?" — the same analysis is re-labelled for each reader
 * without another AI call: "You must…" for the reader, "Landlord must…" for others,
 * and risk flags depend on who the point favours.
 */

/** Party id of the reader, or `null` when they are "just reading". */
export type Perspective = string | null;

export function partyLabel(parties: readonly Party[], partyId: string): string {
  const party = parties.find((candidate) => candidate.id === partyId);
  if (party) return party.role || party.name;
  return partyId.charAt(0).toUpperCase() + partyId.slice(1);
}

export function isGoodForReader(point: VerifiedPoint, perspective: Perspective): boolean {
  return perspective !== null && point.favours === perspective;
}

/** True when a point deserves the reader's careful attention. */
export function needsAttention(point: VerifiedPoint, perspective: Perspective): boolean {
  if (perspective === null) return point.importance === 'high';
  if (point.importance === 'low') return false;
  const bindsReader = point.rules.some(
    (rule) => rule.partyId === perspective && rule.type !== 'may',
  );
  const favoursOther = !['both', 'neutral', perspective].includes(point.favours);
  return bindsReader || favoursOther;
}

export interface DutyItem {
  pointId: string;
  partyId: string;
  action: string;
}

export interface DutyGroups {
  youMust: DutyItem[];
  youMustNot: DutyItem[];
  youMay: DutyItem[];
  othersMust: DutyItem[];
}

/** Groups every rule in the paper into a checklist from the reader's point of view. */
export function groupDuties(
  points: readonly VerifiedPoint[],
  perspective: Perspective,
): DutyGroups {
  const groups: DutyGroups = { youMust: [], youMustNot: [], youMay: [], othersMust: [] };
  if (perspective === null) return groups;

  const add = (point: VerifiedPoint, rule: Rule): void => {
    const item = { pointId: point.id, partyId: rule.partyId, action: rule.action };
    if (rule.partyId !== perspective) {
      if (rule.type === 'must') groups.othersMust.push(item);
      return;
    }
    if (rule.type === 'must') groups.youMust.push(item);
    else if (rule.type === 'mustNot') groups.youMustNot.push(item);
    else groups.youMay.push(item);
  };

  for (const point of points) {
    for (const rule of point.rules) add(point, rule);
  }
  return groups;
}

import { describe, expect, it } from 'vitest';
import { redact } from '../../shared/redact';
import { validateScenario } from '../../shared/scenario';
import { analysisResultSchema } from '../../shared/schema';
import { isQuoteGrounded, prepareSource } from '../../shared/verifyQuote';
import { SAMPLES } from './index';

describe.each(SAMPLES.map((sample) => [sample.id, sample] as const))(
  'sample "%s"',
  (_id, sample) => {
    it('passes the same checks as live AI output', async () => {
      const data = await sample.load();
      const { text, total } = redact(data.text);
      expect(total).toBeGreaterThan(0); // Examples demonstrate privacy redaction.
      const prepared = prepareSource(text);

      const analyses = Object.values(data.analyses);
      expect(analyses.length).toBeGreaterThan(0);
      for (const analysis of analyses) {
        expect(() => analysisResultSchema.parse(analysis)).not.toThrow();
        const ids = new Set(analysis.points.map((point) => point.id));
        expect(ids.size).toBe(analysis.points.length);
        for (const point of analysis.points) {
          expect(
            isQuoteGrounded(prepared, point.quote),
            `${analysis.language} ${point.id} quote`,
          ).toBe(true);
          for (const related of point.relatedPointIds) expect(ids.has(related)).toBe(true);
          for (const rule of point.rules) {
            expect(analysis.parties.some((party) => party.id === rule.partyId)).toBe(true);
          }
        }
        for (const scenario of analysis.scenarios) {
          expect(validateScenario(scenario), `${analysis.language} ${scenario.id}`).toEqual({
            ok: true,
          });
        }
      }
    });

    it('keeps the same structure in every language', async () => {
      const data = await sample.load();
      const shapes = Object.values(data.analyses).map((analysis) =>
        JSON.stringify(
          analysis.points.map((point) => [
            point.id,
            point.quote,
            point.rules.length,
            point.check?.answer,
          ]),
        ),
      );
      expect(new Set(shapes).size).toBe(1);
    });
  },
);

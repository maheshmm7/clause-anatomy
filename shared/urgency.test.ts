import { describe, expect, it } from 'vitest';
import { detectUrgencySignals, maxUrgency, resolveUrgency } from './urgency.js';

describe('detectUrgencySignals', () => {
  it('flags arrest warrants and summons as urgent', () => {
    expect(detectUrgencySignals('A non-bailable WARRANT has been issued').level).toBe('urgent');
    expect(detectUrgencySignals('You are hereby served this summons').level).toBe('urgent');
  });

  it('flags Hindi and Telugu urgent terms', () => {
    expect(detectUrgencySignals('आपको गिरफ्तार किया जा सकता है').level).toBe('urgent');
    expect(detectUrgencySignals('మీకు సమన్లు జారీ చేయబడ్డాయి').level).toBe('urgent');
  });

  it('flags short deadlines as soon', () => {
    const result = detectUrgencySignals('Pay the amount within 15 (fifteen) days of receipt.');
    expect(result.level).toBe('soon');
    expect(result.matches[0]).toContain('15');
    expect(detectUrgencySignals('15 दिनों के भीतर भुगतान करें').level).toBe('soon');
    expect(detectUrgencySignals('15 రోజుల్లో చెల్లించండి').level).toBe('soon');
  });

  it('ignores long deadlines and ordinary text', () => {
    expect(detectUrgencySignals('Renew within 90 days').level).toBe('none');
    expect(detectUrgencySignals('The rent is due every month.').level).toBe('none');
  });

  it('does not match terms inside other words', () => {
    expect(detectUrgencySignals('Unwarranted delays are regretted').level).toBe('none');
  });
});

describe('resolveUrgency', () => {
  it('raises the model rating for notices with urgent signals', () => {
    expect(resolveUrgency('none', 'notice', 'Eviction proceedings will begin')).toBe('urgent');
  });

  it('never lowers the model rating', () => {
    expect(resolveUrgency('urgent', 'court', 'Hello')).toBe('urgent');
  });

  it('trusts the model for agreements that merely mention eviction', () => {
    expect(resolveUrgency('none', 'contract', 'The Lessor may evict the Lessee on default')).toBe(
      'none',
    );
  });
});

describe('maxUrgency', () => {
  it('returns the more severe level', () => {
    expect(maxUrgency('soon', 'urgent')).toBe('urgent');
    expect(maxUrgency('soon', 'none')).toBe('soon');
  });
});

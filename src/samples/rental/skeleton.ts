import type { SampleSkeleton } from '../build';

export const RENTAL_SKELETON: SampleSkeleton = {
  category: 'contract',
  urgency: 'none',
  hasNotice: false,
  parties: [
    { id: 'lessor', name: 'Mr. K. Srinivas Reddy (Lessor)' },
    { id: 'lessee', name: 'Ms. Priya Sharma (Lessee)' },
  ],
  points: [
    {
      id: 'p1',
      sourceLabel: 'Clause 2',
      quote:
        'The Lessee shall pay a monthly rent of Rs. 22,000 (Rupees Twenty-Two Thousand only) on or before the 5th day of every English calendar month.',
      importance: 'high',
      favours: 'lessor',
      rules: [{ partyId: 'lessee', type: 'must' }],
      relatedPointIds: ['p3'],
      terms: [{ term: 'calendar month', source: 'document' }],
      checkAnswer: 'yes',
    },
    {
      id: 'p2',
      sourceLabel: 'Clause 7',
      quote:
        'If the Lessee vacates the Premises during the lock-in period, the Lessee shall pay rent for the remaining months of the lock-in period.',
      importance: 'high',
      favours: 'lessor',
      rules: [
        { partyId: 'lessee', type: 'mustNot' },
        { partyId: 'lessor', type: 'mustNot' },
      ],
      relatedPointIds: ['p5'],
      terms: [
        { term: 'lock-in period', source: 'document' },
        { term: 'terminate', source: 'document' },
      ],
      checkAnswer: 'yes',
    },
    {
      id: 'p3',
      sourceLabel: 'Clause 3',
      quote:
        'The deposit shall be refunded within 30 days of the Lessee vacating the Premises, after deducting any unpaid rent, unpaid utility bills and the cost of repairing damage beyond normal wear and tear.',
      importance: 'high',
      favours: 'both',
      rules: [
        { partyId: 'lessor', type: 'must' },
        { partyId: 'lessor', type: 'may' },
      ],
      relatedPointIds: ['p4'],
      terms: [
        { term: 'interest-free', source: 'document' },
        { term: 'wear and tear', source: 'document' },
      ],
      checkAnswer: 'no',
    },
    {
      id: 'p4',
      sourceLabel: 'Clause 6',
      quote:
        'the Lessee shall not sublet, assign or part with the possession of the Premises or any part thereof without the prior written consent of the Lessor, failing which the security deposit shall stand forfeited.',
      importance: 'high',
      favours: 'lessor',
      rules: [{ partyId: 'lessee', type: 'mustNot' }],
      relatedPointIds: ['p5', 'p3'],
      terms: [
        { term: 'Notwithstanding', source: 'document' },
        { term: 'sublet', source: 'document' },
        { term: 'forfeited', source: 'document' },
      ],
      checkAnswer: 'no',
    },
    {
      id: 'p5',
      sourceLabel: 'Clause 9',
      quote:
        "After the lock-in period, either party may terminate this agreement by giving 2 (two) months' notice in writing to the other party.",
      importance: 'high',
      favours: 'both',
      rules: [
        { partyId: 'lessee', type: 'may' },
        { partyId: 'lessor', type: 'may' },
      ],
      relatedPointIds: ['p2'],
      terms: [{ term: 'notice in writing', source: 'document' }],
      checkAnswer: 'no',
    },
    {
      id: 'p6',
      sourceLabel: 'Clause 1',
      quote:
        'The tenancy shall be for a period of 11 (eleven) months commencing from 1st August 2026 and ending on 30th June 2027.',
      importance: 'medium',
      favours: 'neutral',
      rules: [],
      relatedPointIds: ['p7'],
      terms: [{ term: 'tenancy', source: 'document' }],
      checkAnswer: 'yes',
    },
    {
      id: 'p7',
      sourceLabel: 'Clause 5',
      quote:
        'Upon renewal of this agreement, the rent may be increased by up to 5% (five percent) of the last paid rent.',
      importance: 'medium',
      favours: 'lessor',
      rules: [{ partyId: 'lessor', type: 'may' }],
      relatedPointIds: ['p6'],
      terms: [{ term: 'renewal', source: 'document' }],
      checkAnswer: 'no',
    },
    {
      id: 'p8',
      sourceLabel: 'Clause 4',
      quote:
        'The Lessee shall pay the electricity and water charges as per actual consumption and the society maintenance charges of Rs. 2,500 per month.',
      importance: 'medium',
      favours: 'neutral',
      rules: [
        { partyId: 'lessee', type: 'must' },
        { partyId: 'lessor', type: 'must' },
      ],
      relatedPointIds: [],
      terms: [{ term: 'utilities', source: 'document' }],
      checkAnswer: 'no',
    },
    {
      id: 'p9',
      sourceLabel: 'Clause 11',
      quote:
        "The Lessee shall indemnify the Lessor against any loss or damage caused to the Premises by the negligence of the Lessee or the Lessee's guests.",
      importance: 'medium',
      favours: 'lessor',
      rules: [{ partyId: 'lessee', type: 'must' }],
      relatedPointIds: ['p3'],
      terms: [
        { term: 'indemnify', source: 'document' },
        { term: 'negligence', source: 'document' },
      ],
      checkAnswer: 'yes',
    },
    {
      id: 'p10',
      sourceLabel: 'Clause 10',
      quote:
        "The Lessor may inspect the Premises at reasonable hours after giving at least 24 hours' prior notice to the Lessee.",
      importance: 'low',
      favours: 'both',
      rules: [{ partyId: 'lessor', type: 'may' }],
      relatedPointIds: [],
      terms: [{ term: 'inspect', source: 'document' }],
      checkAnswer: 'no',
    },
    {
      id: 'p11',
      sourceLabel: 'Clause 12',
      quote:
        'Any dispute arising out of this agreement shall be subject to the exclusive jurisdiction of the courts at Hyderabad.',
      importance: 'low',
      favours: 'neutral',
      rules: [],
      relatedPointIds: [],
      terms: [{ term: 'jurisdiction', source: 'document' }],
    },
  ],
  keyDates: [
    { date: '2026-08-01', pointId: 'p6' },
    { date: '2027-06-30', pointId: 'p6' },
  ],
  scenarios: [
    {
      id: 'leave-early',
      startId: 'q1',
      nodes: [
        { id: 'q1', yes: 'q2', no: 'o1', pointIds: ['p2'] },
        { id: 'q2', yes: 'o2', no: 'o3', pointIds: ['p5'] },
      ],
      outcomes: [
        { id: 'o1', tone: 'bad', pointIds: ['p2'] },
        { id: 'o2', tone: 'good', pointIds: ['p5', 'p3'] },
        { id: 'o3', tone: 'bad', pointIds: ['p5'] },
      ],
    },
    {
      id: 'friend-stays',
      startId: 'q1',
      nodes: [{ id: 'q1', yes: 'o1', no: 'o2', pointIds: ['p4'] }],
      outcomes: [
        { id: 'o1', tone: 'good', pointIds: ['p4'] },
        { id: 'o2', tone: 'bad', pointIds: ['p4'] },
      ],
    },
    {
      id: 'deposit-kept',
      startId: 'q1',
      nodes: [
        { id: 'q1', yes: 'q2', no: 'o1', pointIds: ['p3'] },
        { id: 'q2', yes: 'o2', no: 'o3', pointIds: ['p3'] },
      ],
      outcomes: [
        { id: 'o1', tone: 'caution', pointIds: ['p3'] },
        { id: 'o2', tone: 'caution', pointIds: ['p3', 'p9'] },
        { id: 'o3', tone: 'bad', pointIds: ['p3'] },
      ],
    },
  ],
};

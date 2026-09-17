import type { SampleSkeleton } from '../build';

export const RENTAL_B_SKELETON: SampleSkeleton = {
  category: 'contract',
  urgency: 'none',
  hasNotice: false,
  parties: [
    { id: 'lessor', name: 'Mrs. Lakshmi Narayan (Lessor)' },
    { id: 'lessee', name: 'Mr. Rahul Menon (Lessee)' },
  ],
  points: [
    {
      id: 'p1',
      sourceLabel: 'Clause 2',
      quote:
        'The Lessee shall pay a monthly rent of Rs. 25,000 (Rupees Twenty-Five Thousand only) on or before the 10th day of every month.',
      importance: 'high',
      favours: 'lessor',
      rules: [{ partyId: 'lessee', type: 'must' }],
      relatedPointIds: ['p2'],
      terms: [{ term: 'per annum', source: 'document' }],
      checkAnswer: 'yes',
    },
    {
      id: 'p2',
      sourceLabel: 'Clause 3',
      quote:
        'The deposit shall be refunded within 15 days of the Lessee handing over vacant possession, after deducting any dues and the cost of damage.',
      importance: 'high',
      favours: 'both',
      rules: [
        { partyId: 'lessor', type: 'must' },
        { partyId: 'lessor', type: 'may' },
      ],
      relatedPointIds: ['p3'],
      terms: [{ term: 'vacant possession', source: 'document' }],
      checkAnswer: 'no',
    },
    {
      id: 'p3',
      sourceLabel: 'Clause 4',
      quote:
        "one month's rent shall be deducted from the security deposit towards painting charges, irrespective of the condition of the Premises.",
      importance: 'high',
      favours: 'lessor',
      rules: [{ partyId: 'lessor', type: 'may' }],
      relatedPointIds: ['p2'],
      terms: [{ term: 'irrespective of', source: 'document' }],
      checkAnswer: 'yes',
    },
    {
      id: 'p4',
      sourceLabel: 'Clause 7',
      quote:
        "Either party may terminate this agreement at any time by giving 1 (one) month's notice in writing to the other party.",
      importance: 'high',
      favours: 'both',
      rules: [
        { partyId: 'lessee', type: 'may' },
        { partyId: 'lessor', type: 'may' },
      ],
      relatedPointIds: [],
      terms: [{ term: 'terminate', source: 'document' }],
      checkAnswer: 'no',
    },
    {
      id: 'p5',
      sourceLabel: 'Clause 8',
      quote:
        'Upon renewal, the rent shall be increased by 10% (ten percent) of the last paid rent.',
      importance: 'medium',
      favours: 'lessor',
      rules: [{ partyId: 'lessor', type: 'may' }],
      relatedPointIds: ['p6'],
      terms: [{ term: 'renewal', source: 'document' }],
      checkAnswer: 'yes',
    },
    {
      id: 'p6',
      sourceLabel: 'Clause 1',
      quote:
        'The license shall be for a period of 11 (eleven) months commencing from 1st September 2026 and ending on 31st July 2027.',
      importance: 'medium',
      favours: 'neutral',
      rules: [],
      relatedPointIds: ['p5'],
      terms: [{ term: 'license', source: 'document' }],
      checkAnswer: 'yes',
    },
    {
      id: 'p7',
      sourceLabel: 'Clause 5',
      quote: 'The monthly rent includes society maintenance charges.',
      importance: 'medium',
      favours: 'lessee',
      rules: [{ partyId: 'lessee', type: 'must' }],
      relatedPointIds: [],
      terms: [],
      checkAnswer: 'no',
    },
    {
      id: 'p8',
      sourceLabel: 'Clause 6',
      quote: 'The Lessee shall bear the cost of minor repairs up to Rs. 2,000 per repair.',
      importance: 'medium',
      favours: 'lessor',
      rules: [
        { partyId: 'lessee', type: 'must' },
        { partyId: 'lessor', type: 'must' },
      ],
      relatedPointIds: [],
      terms: [{ term: 'bear the cost', source: 'document' }],
      checkAnswer: 'no',
    },
    {
      id: 'p9',
      sourceLabel: 'Clause 9',
      quote:
        'The Lessee shall not sublet the Premises or any part thereof without the prior written consent of the Lessor.',
      importance: 'medium',
      favours: 'lessor',
      rules: [{ partyId: 'lessee', type: 'mustNot' }],
      relatedPointIds: [],
      terms: [{ term: 'sublet', source: 'document' }],
      checkAnswer: 'no',
    },
    {
      id: 'p10',
      sourceLabel: 'Clause 10',
      quote:
        "The Lessor may inspect the Premises after giving at least 48 hours' prior notice to the Lessee.",
      importance: 'low',
      favours: 'both',
      rules: [{ partyId: 'lessor', type: 'may' }],
      relatedPointIds: [],
      terms: [{ term: 'inspect', source: 'document' }],
    },
    {
      id: 'p11',
      sourceLabel: 'Clause 11',
      quote: 'All disputes shall be subject to the jurisdiction of the courts at Bengaluru.',
      importance: 'low',
      favours: 'neutral',
      rules: [],
      relatedPointIds: [],
      terms: [{ term: 'jurisdiction', source: 'document' }],
    },
  ],
  keyDates: [
    { date: '2026-09-01', pointId: 'p6' },
    { date: '2027-07-31', pointId: 'p6' },
  ],
  scenarios: [
    {
      id: 'leave-early',
      startId: 'q1',
      nodes: [{ id: 'q1', yes: 'o1', no: 'o2', pointIds: ['p4'] }],
      outcomes: [
        { id: 'o1', tone: 'good', pointIds: ['p4', 'p2'] },
        { id: 'o2', tone: 'bad', pointIds: ['p4'] },
      ],
    },
    {
      id: 'deposit-kept',
      startId: 'q1',
      nodes: [
        { id: 'q1', yes: 'q2', no: 'o1', pointIds: ['p2'] },
        { id: 'q2', yes: 'o2', no: 'o3', pointIds: ['p2', 'p3'] },
      ],
      outcomes: [
        { id: 'o1', tone: 'caution', pointIds: ['p2'] },
        { id: 'o2', tone: 'caution', pointIds: ['p2', 'p3'] },
        { id: 'o3', tone: 'bad', pointIds: ['p2', 'p3'] },
      ],
    },
  ],
};

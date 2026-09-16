import type { SampleSkeleton } from '../build';

export const NOTICE_SKELETON: SampleSkeleton = {
  category: 'notice',
  urgency: 'soon',
  hasNotice: true,
  parties: [
    { id: 'sender', name: 'M/s Lakshmi Traders (through Adv. R. Meenakshi)' },
    { id: 'recipient', name: 'Mr. Arjun Mehta' },
  ],
  points: [
    {
      id: 'p1',
      sourceLabel: 'Para 5',
      quote:
        'I therefore call upon you to pay the said amount of Rs. 1,20,000 to my client within 15 (fifteen) days of receipt of this notice.',
      importance: 'high',
      favours: 'sender',
      rules: [{ partyId: 'recipient', type: 'must' }],
      relatedPointIds: ['p2'],
      terms: [{ term: 'call upon', source: 'document' }],
      checkAnswer: 'no',
    },
    {
      id: 'p2',
      sourceLabel: 'Para 6',
      quote:
        'my client shall be constrained to initiate criminal proceedings against you under Section 138 of the Negotiable Instruments Act, 1881, and civil proceedings for recovery of the amount with interest and costs',
      importance: 'high',
      favours: 'sender',
      rules: [{ partyId: 'sender', type: 'may' }],
      relatedPointIds: ['p1', 'p6'],
      terms: [
        { term: 'criminal proceedings', source: 'general' },
        { term: 'civil proceedings', source: 'general' },
      ],
      checkAnswer: 'no',
    },
    {
      id: 'p3',
      sourceLabel: 'Para 3',
      quote:
        'The said cheque was presented by my client and was returned unpaid on 1st September 2026 with the remark "Funds Insufficient".',
      importance: 'high',
      favours: 'neutral',
      rules: [],
      relatedPointIds: ['p5'],
      terms: [{ term: 'dishonour of cheque', source: 'document' }],
      checkAnswer: 'no',
    },
    {
      id: 'p4',
      sourceLabel: 'Para 1',
      quote:
        'You purchased goods worth Rs. 1,20,000 (Rupees One Lakh Twenty Thousand only) from my client on 15th July 2026.',
      importance: 'medium',
      favours: 'neutral',
      rules: [],
      relatedPointIds: ['p5'],
      terms: [],
      checkAnswer: 'yes',
    },
    {
      id: 'p5',
      sourceLabel: 'Para 2',
      quote:
        'you issued Cheque No. 004512 dated 20th August 2026 for Rs. 1,20,000 drawn on State Bank of India, Ameerpet Branch',
      importance: 'medium',
      favours: 'neutral',
      rules: [],
      relatedPointIds: ['p3'],
      terms: [{ term: 'drawn on', source: 'document' }],
    },
    {
      id: 'p6',
      sourceLabel: 'Para 4',
      quote:
        'Your act of issuing a cheque without sufficient funds is an offence punishable under Section 138 of the Negotiable Instruments Act, 1881.',
      importance: 'medium',
      favours: 'sender',
      rules: [],
      relatedPointIds: ['p2'],
      terms: [{ term: 'Section 138 of the Negotiable Instruments Act, 1881', source: 'general' }],
      checkAnswer: 'yes',
    },
    {
      id: 'p7',
      sourceLabel: 'Opening',
      quote:
        'Under instructions from my client, M/s Lakshmi Traders, I hereby serve you the following notice',
      importance: 'low',
      favours: 'neutral',
      rules: [],
      relatedPointIds: [],
      terms: [{ term: 'M/s', source: 'general' }],
    },
  ],
  keyDates: [
    { date: '2026-07-15', pointId: 'p4' },
    { date: '2026-08-20', pointId: 'p5' },
    { date: '2026-09-01', pointId: 'p3' },
    { date: '2026-09-10', pointId: 'p1' },
  ],
  scenarios: [
    {
      id: 'cannot-pay',
      startId: 'q1',
      nodes: [
        { id: 'q1', yes: 'o1', no: 'q2', pointIds: ['p1'] },
        { id: 'q2', yes: 'o2', no: 'o3', pointIds: ['p4'] },
      ],
      outcomes: [
        { id: 'o1', tone: 'good', pointIds: ['p1', 'p2'] },
        { id: 'o2', tone: 'caution', pointIds: ['p1', 'p4'] },
        { id: 'o3', tone: 'bad', pointIds: ['p2'] },
      ],
    },
  ],
};

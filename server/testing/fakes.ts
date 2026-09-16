import type { Analysis } from '../../shared/schema.js';
import type { AiClient, GenerateJsonRequest } from '../ai/types.js';

/** Records every AI request and answers with queued replies (or a thrown error). */
export class FakeAiClient implements AiClient {
  readonly requests: GenerateJsonRequest<unknown>[] = [];
  private readonly replies: (unknown | Error)[] = [];

  queue(...replies: (unknown | Error)[]): this {
    this.replies.push(...replies);
    return this;
  }

  async generateJson<T>(request: GenerateJsonRequest<T>): Promise<T> {
    this.requests.push(request as GenerateJsonRequest<unknown>);
    const reply = this.replies.shift();
    if (reply instanceof Error) throw reply;
    if (reply === undefined) throw new Error('FakeAiClient: no reply queued');
    // Validate like the real client does, so tests catch schema drift.
    return request.schema.parse(reply);
  }

  /** All text sent to the model in the last request. */
  lastPromptText(): string {
    const last = this.requests.at(-1);
    return (last?.parts ?? []).map((part) => ('text' in part ? part.text : '')).join('\n');
  }
}

export const RENT_TEXT = `RENT AGREEMENT
This agreement is made on 01-06-2026 between Mr. Suresh Rao (Lessor), phone 9876543210, and Ms. Anita Verma (Lessee).
1. RENT: The Lessee shall pay a monthly rent of Rs. 15,000 on or before the 5th day of every month.
2. DEPOSIT: The Lessee has paid a security deposit of Rs. 45,000, refundable at the end of the tenancy after deducting unpaid dues.
3. SUBLETTING: The Lessee shall not sublet the premises without the prior written consent of the Lessor, failing which the security deposit shall stand forfeited.
4. NOTICE: Either party may terminate this agreement by giving two months' notice in writing.`;

/** A realistic, schema-valid model reply for {@link RENT_TEXT}. */
export function rentAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    category: 'contract',
    documentType: 'Rent agreement',
    summary: 'An agreement to rent a home from Suresh to Anita.',
    parties: [
      { id: 'Lessor', name: 'Mr. Suresh Rao (Lessor)', role: 'Landlord' },
      { id: 'tenant', name: 'Ms. Anita Verma (Lessee)', role: 'Tenant' },
    ],
    urgency: { level: 'none', reason: '' },
    points: [
      {
        id: 'a',
        title: 'Monthly rent',
        sourceLabel: 'Clause 1',
        quote:
          'The Lessee shall pay a monthly rent of Rs. 15,000 on or before the 5th day of every month.',
        simple: 'Pay Rs. 15,000 by the 5th every month.',
        detailed: 'The tenant must pay rent of Rs. 15,000 each month, before the 5th.',
        importance: 'high',
        favours: 'LESSOR',
        rules: [{ partyId: 'tenant', type: 'must', action: 'Pay Rs. 15,000 by the 5th' }],
        conditions: [],
        consequences: [],
        relatedPointIds: ['a', 'b'],
        deadline: '5th of every month',
        terms: [{ term: 'Lessee', meaning: 'The tenant', source: 'document' }],
        check: {
          question: 'Can you pay on the 10th?',
          answer: 'no',
          explanation: 'Rent is due by the 5th.',
        },
      },
      {
        id: 'b',
        title: 'Renting to someone else',
        sourceLabel: 'Clause 3',
        quote:
          'The Lessee shall not sublet the premises without the prior written consent of the Lessor',
        simple: 'Do not rent the house to others without written permission.',
        detailed: 'The tenant cannot sublet without the landlord agreeing in writing first.',
        importance: 'high',
        favours: 'lessor',
        rules: [{ partyId: 'tenant', type: 'mustNot', action: 'Sublet the house' }],
        conditions: ['Unless the landlord agrees in writing first'],
        consequences: ['Security deposit is lost'],
        relatedPointIds: ['c'],
        deadline: '',
        terms: [
          { term: 'forfeited', meaning: 'Lost for good', source: 'document' },
          {
            term: 'Transfer of Property Act',
            meaning: 'A general law on property',
            source: 'document',
          },
        ],
        check: {
          question: 'A phone OK from the landlord is enough?',
          answer: 'no',
          explanation: 'It must be written.',
        },
      },
      {
        id: 'c',
        title: 'Deposit refund with interest',
        sourceLabel: 'Clause 2',
        quote: 'The Lessor shall refund the deposit with 18% annual interest within 7 days.',
        simple: 'You get the deposit back with interest.',
        detailed: 'Fabricated point that is not in the paper.',
        importance: 'medium',
        favours: 'tenant',
        rules: [],
        conditions: [],
        consequences: [],
        relatedPointIds: [],
        deadline: '',
        terms: [],
        check: { question: 'Do you get interest?', answer: 'yes', explanation: 'Made up.' },
      },
    ],
    keyDates: [
      { date: '2026-06-01', label: 'Agreement signed', pointId: 'a' },
      { date: '2026-02-30', label: 'Impossible date', pointId: '' },
      { date: '2026-06-01', label: 'Agreement signed', pointId: 'a' },
    ],
    scenarios: [
      {
        id: 's1',
        title: 'What if I let a friend stay and pay?',
        startId: 'q1',
        nodes: [
          {
            id: 'q1',
            question: 'Did the landlord agree in writing?',
            yes: 'o1',
            no: 'o2',
            pointIds: ['b', 'c'],
          },
        ],
        outcomes: [
          { id: 'o1', text: 'That is allowed.', tone: 'good', pointIds: ['b'] },
          { id: 'o2', text: 'You may lose the deposit.', tone: 'bad', pointIds: ['b'] },
        ],
      },
      {
        id: 's2',
        title: 'Broken tree',
        startId: 'q1',
        nodes: [{ id: 'q1', question: 'Loop?', yes: 'q1', no: 'q1', pointIds: [] }],
        outcomes: [{ id: 'o1', text: 'Never reached', tone: 'good', pointIds: [] }],
      },
    ],
    lawyerQuestions: ['Can the landlord keep the whole deposit for a small breach?'],
    ...overrides,
  };
}

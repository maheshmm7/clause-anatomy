import type { SampleWords } from '../build';

export const NOTICE_EN: SampleWords = {
  documentType: 'Legal notice for a bounced cheque',
  summary:
    'A lawyer for Lakshmi Traders says your cheque for Rs. 1,20,000 bounced. They ask you to pay within 15 days of getting this notice, or they say they will start court cases.',
  urgencyReason: 'You have only 15 days from the day you received this notice.',
  partyRoles: { sender: 'Sender (shop owner)', recipient: 'You (person who got the notice)' },
  notice: {
    sender: 'Advocate R. Meenakshi, on behalf of Lakshmi Traders',
    claim:
      'You bought goods worth Rs. 1,20,000. Your cheque for this amount bounced on 1 September 2026 because there was not enough money in the account.',
    demand: 'Pay Rs. 1,20,000 to Lakshmi Traders.',
    deadline: 'Within 15 days of receiving this notice.',
    ifIgnored:
      'They say they will start a criminal case under Section 138 of the Negotiable Instruments Act and a civil case to get the money back with interest and costs.',
  },
  points: {
    p1: {
      title: 'Pay within 15 days',
      simple: 'You are asked to pay Rs. 1,20,000 within 15 days from the day you got this notice.',
      detailed:
        'The notice formally demands Rs. 1,20,000. The 15 days start from the day you received the notice, not from the date written on it.',
      rules: ['Pay Rs. 1,20,000 within 15 days of receiving the notice'],
      conditions: [],
      consequences: ['If not paid, the sender says court cases will follow'],
      deadline: '15 days from the day you received the notice',
      terms: ['To formally ask or demand.'],
      check: {
        question:
          'You received the notice on 12 September. Do you have until the end of October to pay?',
        explanation: 'No. You have 15 days from receiving it, so until about 27 September.',
      },
    },
    p2: {
      title: 'What happens if you do not pay',
      simple:
        'If you do not pay in 15 days, the sender says they will file a criminal case and a case to get the money back.',
      detailed:
        'The notice warns of two cases: a criminal case for the bounced cheque under Section 138, and a civil case to recover the money with interest and legal costs.',
      rules: ['Start a criminal case and a civil case if not paid in 15 days'],
      conditions: ['Only if the money is not paid within 15 days'],
      consequences: [
        'Criminal case under Section 138',
        'Civil case for the money, interest and costs',
      ],
      deadline: 'After the 15 days end',
      terms: [
        'A case in a criminal court. For a bounced cheque it can lead to a fine or jail if proven.',
        'A case in a civil court to recover money.',
      ],
      check: {
        question:
          'If you pay the full amount within 15 days, does the notice say a criminal case will still be filed?',
        explanation:
          'No. The notice says cases will be started only if you fail to pay within the 15 days.',
      },
    },
    p3: {
      title: 'Why you got this notice',
      simple:
        'Your cheque was returned by the bank on 1 September 2026 because the account did not have enough money.',
      detailed:
        'The shop deposited your cheque. The bank refused to pay it on 1 September 2026 with the reason "Funds Insufficient", meaning low balance.',
      rules: [],
      conditions: [],
      consequences: [],
      deadline: '',
      terms: ['When a bank refuses to pay a cheque ("cheque bounce").'],
      check: {
        question: 'Does the notice say the cheque bounced because the signature did not match?',
        explanation:
          'No. It says the reason was "Funds Insufficient" — not enough money in the account.',
      },
    },
    p4: {
      title: 'What the money is for',
      simple:
        'The notice says you bought goods worth Rs. 1,20,000 from Lakshmi Traders on 15 July 2026.',
      detailed:
        'According to the sender, the debt comes from goods you bought on 15 July 2026. Check your own bills and records to see if this is correct.',
      rules: [],
      conditions: [],
      consequences: [],
      deadline: '',
      terms: [],
      check: {
        question: 'Does the notice say the money is for goods you bought?',
        explanation: 'Yes. Para 1 says you bought goods worth Rs. 1,20,000.',
      },
    },
    p5: {
      title: 'The cheque details',
      simple:
        'The cheque is number 004512, dated 20 August 2026, for Rs. 1,20,000, from State Bank of India, Ameerpet.',
      detailed:
        'Match these details with your cheque book: cheque number 004512, dated 20 August 2026, amount Rs. 1,20,000, from the State Bank of India Ameerpet branch.',
      rules: [],
      conditions: [],
      consequences: [],
      deadline: '',
      terms: ['The bank that should pay the cheque.'],
    },
    p6: {
      title: 'The law they mention',
      simple:
        'The notice says giving a cheque without enough money in the account is a crime under Section 138.',
      detailed:
        'The sender relies on Section 138 of the Negotiable Instruments Act, 1881. Whether it applies depends on facts that a lawyer should check.',
      rules: [],
      conditions: [],
      consequences: [],
      deadline: '',
      terms: [
        'A law that can make a bounced cheque for a debt an offence, if the money is not paid within 15 days after a proper notice.',
      ],
      check: {
        question: 'Does the notice say bouncing this cheque is treated as a crime?',
        explanation: 'Yes. Para 4 calls it an offence under Section 138.',
      },
    },
    p7: {
      title: 'Who sent the notice',
      simple: 'A lawyer, R. Meenakshi, sent this notice for the shop Lakshmi Traders.',
      detailed:
        'The notice comes from Advocate R. Meenakshi, acting for her client Lakshmi Traders.',
      rules: [],
      conditions: [],
      consequences: [],
      deadline: '',
      terms: ['Short form used before the name of a business or firm.'],
    },
  },
  keyDates: [
    'Goods bought (as per the notice)',
    'Date written on the cheque',
    'Cheque returned unpaid by the bank',
    'Date of this notice',
  ],
  scenarios: {
    'cannot-pay': {
      title: 'What if I cannot pay in 15 days?',
      questions: {
        q1: 'Can you pay the full Rs. 1,20,000 within 15 days of getting the notice?',
        q2: 'Do you disagree that you owe this money?',
      },
      outcomes: {
        o1: 'The notice asks only for payment within 15 days. It does not say any case will be filed if you pay in time. Keep proof of your payment.',
        o2: "The notice only tells the sender's side and gives 15 days. To tell your side, talk to a lawyer or free legal aid (15100) before the 15 days end.",
        o3: 'The notice says that if you do not pay within 15 days, the sender will start a criminal case under Section 138 and a civil case to recover the money with interest and costs.',
      },
    },
  },
  lawyerQuestions: [
    'Should I send a written reply to this notice, and what should it say?',
    'Can I ask for more time or pay in instalments?',
    'What proof do I need if I have already paid part of this money?',
    'What can happen in a Section 138 case if it is filed?',
  ],
};

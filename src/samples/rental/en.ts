import type { SampleWords } from '../build';

export const RENTAL_EN: SampleWords = {
  documentType: 'Rent agreement (renting a flat)',
  summary:
    'This is an 11-month agreement to rent Flat 302 in Gachibowli, Hyderabad. Priya Sharma (tenant) pays Rs. 22,000 a month to K. Srinivas Reddy (landlord).',
  urgencyReason: '',
  partyRoles: { lessor: 'Landlord', lessee: 'Tenant' },
  points: {
    p1: {
      title: 'Monthly rent and late fee',
      simple: 'Pay Rs. 22,000 rent by the 5th of every month. Each day late costs Rs. 200 more.',
      detailed:
        'The tenant must pay Rs. 22,000 on or before the 5th of each month. If payment is late, the landlord can charge Rs. 200 for every day after the 5th.',
      rules: ['Pay Rs. 22,000 rent on or before the 5th of every month'],
      conditions: [],
      consequences: ['A late fee of Rs. 200 for each day after the 5th'],
      deadline: 'By the 5th of every month',
      terms: ['A normal month like August or September.'],
      check: {
        question:
          'Your salary comes on the 7th, so you pay rent on the 7th. Will you have to pay extra?',
        explanation:
          'Yes. Rent is due by the 5th, so 2 days late means Rs. 400 extra (Rs. 200 per day).',
      },
    },
    p2: {
      title: 'The first 6 months are locked',
      simple:
        'Nobody can end the agreement in the first 6 months. If you leave early, you still pay rent for those months.',
      detailed:
        'The first 6 months are a "lock-in period". Neither the tenant nor the landlord can end the agreement then. If the tenant moves out during these months, the tenant must still pay rent for the rest of the 6 months.',
      rules: [
        'End the agreement during the first 6 months',
        'End the agreement during the first 6 months',
      ],
      conditions: ['Only applies to the first 6 months'],
      consequences: ['The tenant pays rent for the remaining months of the 6-month period'],
      deadline: 'First 6 months of the agreement',
      terms: ['The first 6 months, when no one can end the agreement.', 'To end the agreement.'],
      check: {
        question:
          'You get a job in another city after 4 months and move out. Do you still have to pay 2 more months of rent?',
        explanation:
          'Yes. You left inside the 6-month lock-in, so you pay rent for the remaining 2 months.',
      },
    },
    p3: {
      title: 'Getting your deposit back',
      simple:
        'Your Rs. 66,000 deposit comes back within 30 days after you move out. Unpaid rent, bills or real damage can be cut from it.',
      detailed:
        'The landlord must return the security deposit within 30 days of the tenant moving out. The landlord may first cut unpaid rent, unpaid electricity or water bills, and the cost of repairing damage that is more than normal use. No interest is paid on the deposit.',
      rules: [
        'Return the deposit within 30 days after the tenant moves out',
        'Cut unpaid rent, unpaid bills and repair costs for real damage from the deposit',
      ],
      conditions: ['Only damage beyond normal wear and tear can be cut'],
      consequences: [],
      deadline: 'Within 30 days after moving out',
      terms: [
        'You do not get any extra money (interest) on your deposit.',
        'Normal ageing from everyday use, like faded paint or small scratches.',
      ],
      check: {
        question:
          'When you leave, the wall paint has faded a little from normal use. Can the landlord cut money from your deposit for this?',
        explanation:
          'No. Fading from normal use is "wear and tear". Only damage beyond that can be cut.',
      },
    },
    p4: {
      title: 'Renting the flat to someone else',
      simple:
        'Do not let someone else live in or rent the flat without the landlord agreeing in writing first. If you do, you lose your whole deposit.',
      detailed:
        'The tenant cannot sublet, hand over, or share possession of the flat unless the landlord has given written permission beforehand. This rule applies even if Clause 9 seems to say something else. Breaking it means the Rs. 66,000 deposit is lost.',
      rules: ['Sublet or hand over the flat (or part of it) to someone else'],
      conditions: ['Unless the landlord agrees in writing, before it happens'],
      consequences: ['The whole security deposit is lost'],
      deadline: '',
      terms: [
        '"Even if another clause says something different." This rule wins over Clause 9.',
        'Renting out your rented home, or part of it, to another person.',
        'Taken away for good.',
      ],
      check: {
        question:
          'A friend stays with you for 3 months and pays part of the rent. The landlord said "OK" on a phone call. Is this safe under the paper?',
        explanation:
          'No. The consent must be in writing and given first. A phone call is not enough.',
      },
    },
    p5: {
      title: 'Ending the agreement with notice',
      simple:
        "After the first 6 months, you or the landlord can end the agreement by giving 2 months' notice in writing.",
      detailed:
        'Once the lock-in period is over, either side can end the agreement. They must tell the other side in writing, 2 months before.',
      rules: [
        "End the agreement after 6 months with 2 months' written notice",
        "End the agreement after 6 months with 2 months' written notice",
      ],
      conditions: ['Only after the 6-month lock-in period', 'The notice must be in writing'],
      consequences: [],
      deadline: "2 months' notice",
      terms: [
        'A written message (letter, email or signed note) saying you want to end the agreement.',
      ],
      check: {
        question:
          'It is month 8. You tell the landlord on a voice call that you are leaving next week. Is that enough?',
        explanation: "No. You need to give 2 months' notice, and it must be in writing.",
      },
    },
    p6: {
      title: 'How long the agreement lasts',
      simple: 'The agreement is for 11 months: from 1 August 2026 to 30 June 2027.',
      detailed:
        'The rental period is 11 months. It starts on 1 August 2026 and ends on 30 June 2027. To stay longer, the agreement has to be renewed.',
      rules: [],
      conditions: [],
      consequences: [],
      deadline: 'Ends on 30 June 2027',
      terms: ['The time you are allowed to live in the flat as a tenant.'],
      check: {
        question: 'Does this agreement end on 30 June 2027?',
        explanation: 'Yes. Clause 1 says it runs from 1 August 2026 to 30 June 2027.',
      },
    },
    p7: {
      title: 'Rent increase when renewing',
      simple: 'If you renew, the rent can go up by at most 5%. That is at most Rs. 23,100.',
      detailed:
        'When the agreement is renewed, the landlord may raise the rent, but only by up to 5% of the last rent paid. From Rs. 22,000, the highest new rent is Rs. 23,100.',
      rules: ['Increase the rent by up to 5% when the agreement is renewed'],
      conditions: ['Only at renewal', 'Not more than 5% of the last rent'],
      consequences: [],
      deadline: '',
      terms: ['Signing the agreement again for a new period.'],
      check: {
        question: 'At renewal, the landlord asks for Rs. 25,000 rent. Does this paper allow that?',
        explanation: 'No. 5% of Rs. 22,000 is Rs. 1,100, so the most allowed is Rs. 23,100.',
      },
    },
    p8: {
      title: 'Bills and maintenance',
      simple:
        'You pay electricity, water and Rs. 2,500 maintenance every month, on top of rent. The landlord pays for big building repairs.',
      detailed:
        "The tenant pays electricity and water for what is used, plus society maintenance of Rs. 2,500 a month. These are extra to the rent. Major structural repairs are the landlord's job.",
      rules: [
        'Pay electricity, water and Rs. 2,500 monthly maintenance',
        'Pay for major structural repairs',
      ],
      conditions: [],
      consequences: [],
      deadline: 'Every month',
      terms: ['Services like electricity and water.'],
      check: {
        question: 'Is the Rs. 2,500 maintenance already included in the Rs. 22,000 rent?',
        explanation:
          'No. Maintenance is a separate charge that the tenant pays in addition to rent.',
      },
    },
    p9: {
      title: 'Paying for damage',
      simple: 'If you or your guests carelessly damage the flat, you must pay for it.',
      detailed:
        "The tenant must cover the landlord's loss if the flat is damaged because of carelessness by the tenant or the tenant's guests.",
      rules: ['Pay for loss or damage caused by carelessness of the tenant or guests'],
      conditions: ['Only for damage caused by carelessness'],
      consequences: ['The tenant pays for the loss'],
      deadline: '',
      terms: ['To pay back someone for a loss.', 'Carelessness.'],
      check: {
        question: 'A guest carelessly breaks the bathroom mirror. Could you have to pay for it?',
        explanation: "Yes. Damage from a guest's carelessness is covered by this clause.",
      },
    },
    p10: {
      title: 'Landlord visits',
      simple:
        'The landlord can check the flat, but must tell you at least 24 hours before and come at a reasonable time.',
      detailed:
        "The landlord may inspect the flat at reasonable hours. The landlord must give at least 24 hours' notice before visiting.",
      rules: ["Inspect the flat with 24 hours' notice, at reasonable hours"],
      conditions: ["At least 24 hours' notice first", 'Only at reasonable hours'],
      consequences: [],
      deadline: '',
      terms: ['To visit and check the condition of the flat.'],
      check: {
        question:
          'The landlord comes to check the flat at 10 pm without telling you. Does the paper allow this?',
        explanation: "No. The landlord must give 24 hours' notice and visit at reasonable hours.",
      },
    },
    p11: {
      title: 'Which court handles disputes',
      simple:
        'If there is a legal fight about this agreement, only courts in Hyderabad can hear it.',
      detailed:
        'Any dispute about this agreement must go to the courts in Hyderabad, and no other city.',
      rules: [],
      conditions: [],
      consequences: [],
      deadline: '',
      terms: ['Which court has the power to hear a case.'],
    },
  },
  keyDates: ['Rent agreement starts', 'Rent agreement ends — renew or move out'],
  scenarios: {
    'leave-early': {
      title: 'What if I want to leave early?',
      questions: {
        q1: 'Have you already stayed more than 6 months?',
        q2: "Will you give the landlord 2 months' notice in writing?",
      },
      outcomes: {
        o1: 'You are still in the 6-month lock-in period. If you leave now, the paper says you must pay rent for the remaining lock-in months.',
        o2: "You can leave when the 2 months' notice ends. Your deposit should come back within 30 days after you move out.",
        o3: "The paper allows ending the agreement only with 2 months' written notice. Leaving without it does not follow the agreement. Talk to the landlord, or ask a lawyer or legal aid first.",
      },
    },
    'friend-stays': {
      title: 'What if a friend wants to stay and share the rent?',
      questions: {
        q1: 'Has the landlord agreed in writing, before your friend moves in?',
      },
      outcomes: {
        o1: 'This is allowed, because the landlord gave written permission first. Keep that written permission safe.',
        o2: 'Without written permission first, this breaks Clause 6. The paper says you can lose your full Rs. 66,000 deposit.',
      },
    },
    'deposit-kept': {
      title: 'What if the landlord does not return my deposit?',
      questions: {
        q1: 'Has it been more than 30 days since you moved out?',
        q2: 'Did you leave unpaid rent, unpaid bills, or damage beyond normal use?',
      },
      outcomes: {
        o1: 'The landlord has up to 30 days after you move out to return the deposit. Wait until the 30 days are over.',
        o2: 'The landlord can cut those amounts from the deposit. The rest of the deposit should still come back to you.',
        o3: 'The paper says the deposit must be returned within 30 days, so the landlord is late. You can remind the landlord in writing, and contact free legal aid (15100) if it is still not paid.',
      },
    },
  },
  lawyerQuestions: [
    'If I must leave during the 6-month lock-in because of a job transfer, can the landlord still ask for all the remaining rent?',
    'Is a late fee of Rs. 200 per day fair and enforceable?',
    'What counts as "normal wear and tear" when the landlord cuts money from my deposit?',
    'Does a family member staying with me count as subletting?',
  ],
};

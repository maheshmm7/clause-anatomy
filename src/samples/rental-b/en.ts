import type { SampleWords } from '../build';

export const RENTAL_B_EN: SampleWords = {
  documentType: 'Rent agreement (Bengaluru flat)',
  summary:
    'An 11-month agreement to rent Flat 1203 in Whitefield, Bengaluru. Rahul Menon (tenant) pays Rs. 25,000 a month to Lakshmi Narayan (landlord), with a large deposit of Rs. 1,50,000.',
  urgencyReason: '',
  partyRoles: { lessor: 'Landlord', lessee: 'Tenant' },
  points: {
    p1: {
      title: 'Monthly rent and interest on delay',
      simple:
        'Pay Rs. 25,000 rent by the 10th of every month. Late rent adds interest at 18% a year.',
      detailed:
        'Rent is Rs. 25,000, due on or before the 10th of every month. Late rent carries interest at 18% per year on the unpaid amount until it is cleared. There is no fixed daily penalty and no grace period.',
      rules: ['Pay Rs. 25,000 rent on or before the 10th of every month'],
      conditions: [],
      consequences: ['Interest at 18% a year on late rent'],
      deadline: 'By the 10th of every month',
      terms: ['For each year.'],
      check: {
        question: 'You pay rent on the 12th. Can the landlord charge interest?',
        explanation: 'Yes. Rent is due by the 10th, and late rent carries 18% yearly interest.',
      },
    },
    p2: {
      title: 'Getting your deposit back',
      simple:
        'Your Rs. 1,50,000 deposit comes back within 15 days after you hand over the empty flat, minus dues and damage.',
      detailed:
        'The Rs. 1,50,000 deposit must come back within 15 days of you handing over the empty flat. Unpaid dues and the cost of damage are deducted first, and so is the painting charge in Clause 3. No interest is paid on the deposit.',
      rules: [
        'Refund the deposit within 15 days of getting the empty flat back',
        'Cut unpaid dues and the cost of damage from the deposit',
      ],
      conditions: ['Only after the flat is handed over empty'],
      consequences: [],
      deadline: 'Within 15 days after handing over the flat',
      terms: ['The flat handed back empty, with nobody living in it.'],
      check: {
        question: 'You hand over the flat on 1 August. Is 30 August a fair time for the refund?',
        explanation: 'No. The paper says the refund must come within 15 days.',
      },
    },
    p3: {
      title: 'Painting charge from your deposit',
      simple:
        "When you leave, one month's rent (Rs. 25,000) is cut from your deposit for painting, even if the walls are fine.",
      detailed:
        "One month's rent, Rs. 25,000, is cut from the deposit for painting when you leave, whatever the condition of the walls. Even a spotless flat loses this amount, so the most you can get back is Rs. 1,25,000 before any other deduction.",
      rules: ["Cut one month's rent from the deposit for painting"],
      conditions: ['Applies even if the flat is in good condition'],
      consequences: ['You get Rs. 25,000 less of your deposit back'],
      deadline: 'When you move out',
      terms: ['No matter what; whatever the situation.'],
      check: {
        question:
          'You leave the flat spotless and freshly cleaned. Will Rs. 25,000 still be cut for painting?',
        explanation: 'Yes. The paper says the painting charge applies irrespective of condition.',
      },
    },
    p4: {
      title: "Ending the agreement with one month's notice",
      simple:
        "You or the landlord can end the agreement at any time by giving one month's notice in writing. There is no lock-in.",
      detailed:
        "Either side may end the agreement at any time with one month's written notice, and there is no lock-in at all. Leaving before the notice period ends means paying rent for the remaining days.",
      rules: [
        "End the agreement with 1 month's written notice",
        "End the agreement with 1 month's written notice",
      ],
      conditions: ['The notice must be in writing'],
      consequences: [],
      deadline: "1 month's notice",
      terms: ['To end the agreement.'],
      check: {
        question: 'In month 3, can the landlord ask you to leave within one week?',
        explanation: "No. Either side must give one month's notice in writing.",
      },
    },
    p5: {
      title: 'Rent increase when renewing',
      simple: 'If you renew, the rent goes up by 10%, to Rs. 27,500.',
      detailed:
        'On renewal the rent rises by a fixed 10% of the last rent, taking Rs. 25,000 to Rs. 27,500 a month, about Rs. 30,000 more over a year. The paper writes this as automatic, not as a maximum.',
      rules: ['Increase the rent by 10% at renewal'],
      conditions: ['Only at renewal'],
      consequences: [],
      deadline: '',
      terms: ['Signing the agreement again for a new period.'],
      check: {
        question: 'Will the rent be Rs. 27,500 after renewal?',
        explanation: 'Yes. 10% of Rs. 25,000 is Rs. 2,500.',
      },
    },
    p6: {
      title: 'How long the agreement lasts',
      simple: 'The agreement is for 11 months: from 1 September 2026 to 31 July 2027.',
      detailed:
        'The agreement runs 11 months, from 1 September 2026 to 31 July 2027, and then ends by itself. Staying on needs a renewal or a fresh agreement.',
      rules: [],
      conditions: [],
      consequences: [],
      deadline: 'Ends on 31 July 2027',
      terms: ['Permission to live in the flat for a fixed time.'],
      check: {
        question: 'Does this agreement end on 31 July 2027?',
        explanation: 'Yes. Clause 1 says it runs until 31 July 2027.',
      },
    },
    p7: {
      title: 'Maintenance is included in rent',
      simple:
        'Society maintenance is already inside the Rs. 25,000 rent. You pay electricity separately.',
      detailed:
        'The Rs. 25,000 rent already covers society maintenance, so there is no separate monthly maintenance to pay. Electricity is paid separately as per the meter reading.',
      rules: ['Pay electricity as per the meter reading'],
      conditions: [],
      consequences: [],
      deadline: 'Every month',
      terms: [],
      check: {
        question: 'Do you pay society maintenance separately on top of rent?',
        explanation: 'No. Maintenance is included in the monthly rent.',
      },
    },
    p8: {
      title: 'Small repairs are your cost',
      simple:
        'You pay for small repairs up to Rs. 2,000 each. The landlord pays for bigger repairs.',
      detailed:
        "You pay for each minor repair up to Rs. 2,000, such as taps, switches or small fittings. Anything above Rs. 2,000 is the landlord's responsibility, so keep the bills as proof for bigger work.",
      rules: [
        'Pay for each minor repair up to Rs. 2,000',
        'Pay for repairs costing more than Rs. 2,000',
      ],
      conditions: ['Only repairs up to Rs. 2,000 each'],
      consequences: [],
      deadline: '',
      terms: ['To pay for something yourself.'],
      check: {
        question: 'A repair costs Rs. 6,000. Do you have to pay all of it?',
        explanation: 'No. Repairs above Rs. 2,000 are paid by the landlord.',
      },
    },
    p9: {
      title: 'Renting the flat to someone else',
      simple: 'Do not rent the flat to others without written permission from the landlord first.',
      detailed:
        'You cannot sublet the flat or any part of it unless the landlord agrees in writing beforehand. Letting a friend or relative stay long term can count as subletting, so ask for written permission first.',
      rules: ['Sublet the flat without written permission'],
      conditions: ['Unless the landlord agrees in writing first'],
      consequences: [],
      deadline: '',
      terms: ['Renting out your rented home, or part of it, to another person.'],
      check: {
        question: 'Is a verbal OK from the landlord enough to sublet a room?',
        explanation: 'No. The consent must be written and given first.',
      },
    },
    p10: {
      title: 'Landlord visits',
      simple: 'The landlord can check the flat, but must tell you at least 48 hours before.',
      detailed:
        'The landlord may inspect the flat but must give at least 48 hours of notice before coming. Entry without that notice is not allowed by this clause.',
      rules: ["Inspect the flat with 48 hours' notice"],
      conditions: ["At least 48 hours' notice first"],
      consequences: [],
      deadline: '',
      terms: ['To visit and check the condition of the flat.'],
    },
    p11: {
      title: 'Which court handles disputes',
      simple: 'Any legal fight about this agreement goes to courts in Bengaluru.',
      detailed:
        'Any legal dispute under this agreement goes only to the courts in Bengaluru. A case cannot be filed in the courts of another city.',
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
      questions: { q1: "Will you give the landlord one month's notice in writing?" },
      outcomes: {
        o1: 'You can leave when the one month of notice ends. There is no lock-in. Your deposit should come back within 15 days, minus the painting charge.',
        o2: "The paper needs one month's written notice. Leaving without it does not follow the agreement. Talk to the landlord or legal aid first.",
      },
    },
    'deposit-kept': {
      title: 'What if the landlord does not return my deposit?',
      questions: {
        q1: 'Has it been more than 15 days since you handed over the empty flat?',
        q2: 'Did you leave unpaid dues or damage?',
      },
      outcomes: {
        o1: 'The landlord has up to 15 days to refund. Wait until then.',
        o2: "The landlord can cut dues, damage and one month's rent for painting. The rest should come back.",
        o3: "The refund is late. The landlord may keep one month's rent for painting, but the rest should have come back. Remind them in writing and contact free legal aid (15100) if needed.",
      },
    },
  },
  lawyerQuestions: [
    "Is a fixed painting charge of one month's rent, whatever the condition, fair and enforceable?",
    'Is 18% yearly interest on late rent allowed?',
    'Is a six-month security deposit normal and can it be negotiated?',
  ],
};

import type { UserInput } from '../types.js';

/**
 * Seed data for the reference persona the design was drawn against.
 *
 * In production this is assembled from linked bank and card feeds, the
 * portfolio aggregator, and the profile screen's own inputs. It lives here so
 * both apps have something real to render, and so the model has a fixture with
 * known-good outputs to test against.
 *
 * Every figure the design shows is either one of these inputs or something
 * `buildSnapshot` derives from them. Nothing in the UI is hardcoded.
 */
export const ANANYA: UserInput = {
  name: 'Ananya Rao',
  city: 'Bengaluru',
  dependents: 2,

  income: {
    monthlyTakeHome: 205_000,
    rentalIncome: 9_000,
    freelanceAndOther: 0,
    expectedAnnualBonus: 320_000,
    bonusMonth: 4,
    stability: 'Salaried, permanent',
    taxRegime: 'Old regime',
  },

  commitments: [
    { id: 'rent', label: 'Rent', monthlyAmount: 46_000 },
    {
      id: 'car-loan',
      label: 'Car loan EMI, 9.4%',
      monthlyAmount: 18_600,
      loan: {
        interestRate: 0.094,
        outstandingPrincipal: 767_000,
        scheduledEnd: '2030-10-01',
      },
    },
    { id: 'school-fees', label: 'School fees', monthlyAmount: 13_500 },
    { id: 'insurance', label: 'Insurance premiums', monthlyAmount: 8_400 },
  ],

  cards: [
    { id: 'aurum', name: 'Aurum', last4: '4412', creditLimit: 400_000, outstanding: 248_000, statementDay: 18 },
    { id: 'blue-metro', name: 'Blue Metro', last4: '9087', creditLimit: 150_000, outstanding: 28_500, statementDay: 2 },
  ],

  accounts: [
    { id: 'hdfc-salary', label: 'Salary account', bank: 'HDFC Bank' },
    { id: 'hdfc-savings', label: 'Savings account', bank: 'HDFC Bank' },
    { id: 'icici-savings', label: 'Savings account', bank: 'ICICI Bank' },
    { id: 'icici-rd', label: 'Recurring deposit', bank: 'ICICI Bank' },
  ],

  holdings: [
    {
      id: 'largecap-a',
      name: 'Large-cap fund A',
      value: 410_000,
      assetClass: 'equity',
      why: 'Lowest cost of the two, better tracking',
    },
    {
      id: 'largecap-b',
      name: 'Large-cap fund B',
      value: 270_000,
      assetClass: 'equity',
      flag: 'overlap',
      why: '71% overlap with fund A. Hold the units, redirect the SIP',
      alert: {
        title: 'Two SIPs hold the same stocks',
        body: '71% overlap between your large-cap funds. Corpus suggests consolidating.',
        severity: 'advisory',
      },
    },
    {
      id: 'sgb',
      name: 'Sovereign gold bonds',
      value: 280_000,
      assetClass: 'gold',
      flag: 'overweight',
      why: 'Above target weight. Let equity dilute it',
    },
    {
      id: 'endowment',
      name: 'Endowment policy',
      value: 140_000,
      assetClass: 'debt',
      flag: 'low-return',
      why: 'Returns near 4.6%. Term cover plus an index fund does more',
    },
    {
      id: 'epf',
      name: 'EPF',
      value: 600_000,
      assetClass: 'debt',
      why: 'Counts as your debt allocation',
    },
    {
      id: 'liquid',
      name: 'Liquid fund',
      value: 184_000,
      assetClass: 'cash',
      excludeFromReview: true,
      why: 'Emergency cover. This month’s plan already tops it up',
    },
  ],

  goals: [
    {
      id: 'emergency',
      label: 'Emergency fund',
      shortLabel: 'emergency',
      current: 820_000,
      target: 1_200_000,
      targetDate: '2027-06-01',
      monthlyShortfall: 0,
      priority: 1,
    },
    {
      id: 'home',
      label: 'Home down payment',
      shortLabel: 'home',
      current: 930_000,
      target: 3_000_000,
      targetDate: '2030-04-01',
      monthlyShortfall: 0,
      priority: 2,
    },
    {
      id: 'retirement',
      label: 'Retirement at 58',
      shortLabel: 'retirement',
      current: 2_860_000,
      target: 13_000_000,
      targetDate: '2044-04-01',
      monthlyShortfall: 22_000,
      priority: 3,
    },
  ],

  portfolio: {
    totalValue: 1_840_000,
    current: { equity: 0.54, debt: 0.21, gold: 0.15, cash: 0.1 },
    target: { equity: 0.62, debt: 0.2, gold: 0.1, cash: 0.08 },
    xirr: 0.118,
    xirrSince: '2022-03-01',
  },

  /**
   * Wider than commitments plus variable spend: it amortises the lumpy annual
   * costs (insurance renewals, school terms, maintenance) the emergency fund
   * would still have to cover if income stopped.
   */
  essentialMonthlyOutgo: 200_000,

  section80CUsed: 104_000,

  annualTravelBudget: 84_000,
  annualTravelSpent: 53_000,

  period: {
    start: '2026-08-01',
    categories: [
      {
        id: 'rent',
        label: 'Rent',
        spent: 46_000,
        limit: 53_500,
        fixed: true,
        inCommitments: true,
        identifiedSaving: 0,
        note: 'Comfortable. Hold this even if your salary rises.',
      },
      {
        id: 'groceries',
        label: 'Groceries',
        spent: 17_700,
        limit: 15_000,
        identifiedSaving: 2_700,
        note: 'Nine orders this month. One weekly bulk run saves ₹2,300.',
        alertBody: 'Four small top-up runs replaced one weekly order. See Where to spend.',
      },
      {
        id: 'eating-out',
        label: 'Eating out and delivery',
        spent: 11_200,
        limit: 8_000,
        identifiedSaving: 3_200,
        note: 'Weekday lunches are 61% of it. Capping them at three saves ₹3,100.',
      },
      {
        id: 'travel',
        label: 'Travel and commute',
        spent: 9_800,
        limit: 12_000,
        identifiedSaving: 1_860,
        note: 'Room for the October trip if you book by 12 September.',
      },
      {
        id: 'utilities',
        label: 'Utilities and bills',
        spent: 6_400,
        limit: 7_000,
        identifiedSaving: 640,
        note: 'Two streaming plans overlap. ₹640 a month.',
      },
      {
        id: 'shopping',
        label: 'Shopping',
        spent: 5_600,
        limit: 9_000,
        identifiedSaving: 1_000,
        note: 'Under limit two months running. Corpus lowered it by ₹1,000.',
      },
      {
        id: 'household',
        label: 'Household help and care',
        spent: 8_400,
        limit: 8_500,
        fixed: true,
        identifiedSaving: 0,
        note: 'Fixed cost. Corpus treats it as a commitment, not discretionary.',
      },
    ],
    /** Spend outside the tracked categories: medical, gifts, one-offs. */
    otherVariableSpend: 16_000,
    variableSpendVolatility: 14_400,
    sixMonthAverageSurplus: 46_300,
  },

  guidance: {
    groups: [
      {
        id: 'groceries',
        title: 'Groceries',
        stat: { kind: 'monthly-saving', amount: 2_300 },
        items: [
          {
            kind: 'best',
            title: 'Freshcart bulk, weekly slot',
            body: 'Your staples are 9% cheaper in 5kg sizes. One Sunday delivery instead of nine top-ups. Pay with the Blue Metro card for 5% back.',
          },
          {
            kind: 'also',
            title: 'Jayanagar wholesale market',
            body: 'Produce and pulses at roughly two-thirds of app prices. Worth one trip a month.',
          },
          {
            kind: 'avoid',
            title: 'Ten-minute delivery apps',
            body: '₹4,100 of your groceries came through these last month, at a 22% premium.',
          },
        ],
      },
      {
        id: 'travel',
        title: 'Travel',
        stat: { kind: 'annual-remaining', amount: 31_000 },
        items: [
          {
            kind: 'best',
            title: 'Coorg, 9 to 13 October',
            body: 'Drive-distance, shoulder season, no flights. Fits the remaining budget with ₹8,000 spare. Book by 12 September.',
          },
          {
            kind: 'also',
            title: 'Pondicherry, 22 to 26 November',
            body: 'Overnight train, ₹18,400 all in. Leaves room for a December trip too.',
          },
          {
            kind: 'card',
            title: 'Book on the Aurum card',
            body: '10x points on travel, and the statement date gives you 47 days to pay.',
          },
        ],
      },
    ],
    routing: [
      {
        label: 'GROCERIES AND BILLS',
        name: 'Blue Metro',
        body: '5% back, capped at ₹500 a month. You hit the cap by the 19th.',
      },
      {
        label: 'TRAVEL AND DINING',
        name: 'Aurum',
        body: '10x points, worth ₹1,900 last year and mostly unredeemed.',
      },
      {
        label: 'RENT AND FEES',
        name: 'Bank transfer',
        body: 'Card rent payments cost 1.8% in fees. Never worth the points.',
      },
    ],
    upsideComponents: [
      { label: 'Cheaper grocery sourcing', annual: 27_600 },
      { label: 'Card routing', annual: 6_000 },
      { label: 'Redeemed points', annual: 1_900 },
      { label: 'Travel booking windows', annual: 6_100 },
    ],
    upsideCopy: 'From cheaper baskets, correct card routing and redeemed points.',
    travelBudgetCopy: 'Enough for the October trip at shoulder-season fares.',
    rentCeilingCopy:
      'The most you can pay in {city} without slowing the home goal. Renewal is due in February.',
    reclaimableCopy: 'Corpus routes it to the retirement gap automatically.',
  },

  lastRunAt: '2026-08-28T06:40:00Z',
};

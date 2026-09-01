import type { CardStatus, ProfileView, SpendGuidance, SyncSummary, UserInput } from '../types.js';
import { inr, list, plural, timestampLabel } from '../format.js';
import { cardinal, capitalise } from './words.js';

/**
 * "Where to spend" — merchant, travel and card-routing guidance.
 *
 * The recommendations themselves come from the recommendations engine (typed as
 * input, see `GuidanceInput`). What this module computes is the stats in the
 * card headers and the annual upside, so those figures always agree with the
 * budget and card data the rest of the product is reading.
 */
export function computeSpendGuidance(user: UserInput): SpendGuidance {
  const annualUpside = user.guidance.upsideComponents.reduce((sum, c) => sum + c.annual, 0);

  return {
    groups: user.guidance.groups.map((group) => ({
      id: group.id,
      title: group.title,
      stat:
        group.stat.kind === 'monthly-saving'
          ? `SAVE ${inr(group.stat.amount)}/MO`
          : `${inr(user.annualTravelBudget - user.annualTravelSpent)} LEFT THIS YEAR`,
      items: group.items,
    })),
    routing: user.guidance.routing,
    annualUpside,
    annualUpsideCopy: user.guidance.upsideCopy,
  };
}

function cardStatus(card: UserInput['cards'][number]): CardStatus {
  const utilisation = card.creditLimit === 0 ? 0 : card.outstanding / card.creditLimit;
  const tone: CardStatus['tone'] = utilisation > 0.6 ? 'negative' : utilisation > 0.3 ? 'warning' : 'positive';

  return {
    id: card.id,
    name: card.name,
    last4: card.last4,
    caption: `Limit ${inr(card.creditLimit)} · statement on the ${ordinalDay(card.statementDay)}`,
    utilisation,
    utilisationLabel: `${Math.round(utilisation * 100)}% used`,
    tone,
  };
}

function ordinalDay(day: number): string {
  const rem100 = day % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function computeProfile(user: UserInput): ProfileView {
  const banks = new Set(user.accounts.map((a) => a.bank));

  return {
    name: user.name,
    city: user.city,
    dependents: user.dependents,
    income: user.income,
    commitments: user.commitments.map((c) => ({
      id: c.id,
      label: c.label,
      monthlyAmount: c.monthlyAmount,
    })),
    commitmentsTotal: user.commitments.reduce((sum, c) => sum + c.monthlyAmount, 0),
    cards: user.cards.map(cardStatus),
    // Deposit accounts are collapsed into one row: the user does not need four
    // near-identical lines to know their banks are connected.
    accounts: [
      {
        id: 'deposits',
        label: 'Salary and savings accounts',
        // Counts inside prose are spelled out: "Two banks", not "2 banks".
        caption: `${capitalise(cardinal(banks.size))} ${banks.size === 1 ? 'bank' : 'banks'}, refreshed this morning`,
        status: 'Linked',
      },
    ],
  };
}

export function computeSync(user: UserInput): SyncSummary {
  const parts = [
    plural(user.accounts.length, 'account'),
    plural(user.cards.length, 'card'),
    plural(user.holdings.length, 'holding'),
  ];

  return {
    lastRunAt: user.lastRunAt,
    accounts: user.accounts.length,
    cards: user.cards.length,
    holdings: user.holdings.length,
    summary: `${list(parts)} in sync.`,
  };
}

export { timestampLabel };

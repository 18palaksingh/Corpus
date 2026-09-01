import type { Alert, UserInput } from '../types.js';
import { dayMonth, inr } from '../format.js';
import { capitalise, cardinal } from './words.js';
import { CARD_BAND_CEILING, CARD_BAND_MARGIN, CARD_GRACE_DAYS, SECTION_80C_CAP } from './constants.js';
import { addDays, dayOfMonth, monthsToFinancialYearEnd } from './dates.js';
import { limitStatus } from './limits.js';

const SEVERITY_ORDER: Record<Alert['severity'], number> = {
  urgent: 0,
  advisory: 1,
  opportunity: 2,
};

/**
 * "Needs your attention".
 *
 * Four rules, each of which only fires when the user can actually do something
 * about it. An alert the user cannot act on is noise, and noise is what makes
 * people stop reading this panel.
 */
export function computeAlerts(user: UserInput): Alert[] {
  const alerts: Alert[] = [
    ...cardUtilisationAlerts(user),
    ...overspendAlerts(user),
    ...holdingAlerts(user),
    ...taxAlerts(user),
  ];

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/**
 * A card sitting above the bureau's comfortable band costs the user a scoring
 * band at statement time. The fix is a payment before the due date, sized to
 * land inside the band with a margin so a pending charge does not undo it.
 */
function cardUtilisationAlerts(user: UserInput): Alert[] {
  return user.cards
    .filter((card) => card.creditLimit > 0 && card.outstanding / card.creditLimit > CARD_BAND_CEILING)
    .map((card) => {
      const utilisation = card.outstanding / card.creditLimit;
      const targetBalance = card.creditLimit * (CARD_BAND_CEILING - CARD_BAND_MARGIN);
      const payment = Math.round(card.outstanding - targetBalance);
      const dueDate = addDays(dayOfMonth(user.period.start, card.statementDay), CARD_GRACE_DAYS);

      return {
        id: `card-utilisation-${card.id}`,
        severity: 'urgent' as const,
        title: `Card utilisation at ${Math.round(utilisation * 100)}%`,
        body: `Pay ${inr(payment)} on the ${card.name} card before ${dayMonth(dueDate)} to keep your score band.`,
        linkTo: 'profile' as const,
      };
    });
}

/**
 * Only categories with a routed alternative on the "Where to spend" screen
 * raise an alert. Going over on something with no cheaper option available is
 * information, not an action.
 */
function overspendAlerts(user: UserInput): Alert[] {
  return user.period.categories
    .filter((c) => c.alertBody && c.limit > 0 && limitStatus(c.spent / c.limit) === 'over')
    .map((c) => {
      const overBy = Math.round((c.spent / c.limit - 1) * 100);
      return {
        id: `overspend-${c.id}`,
        severity: 'advisory' as const,
        title: `${c.label} ${overBy}% over limit`,
        body: c.alertBody!,
        linkTo: 'spend' as const,
      };
    });
}

function holdingAlerts(user: UserInput): Alert[] {
  return user.holdings
    .filter((h) => h.alert)
    .map((h) => ({
      id: `holding-${h.id}`,
      severity: h.alert!.severity,
      title: h.alert!.title,
      body: h.alert!.body,
      linkTo: 'plan' as const,
    }));
}

/**
 * Unused 80C headroom is free money, but only while there is time to spread it.
 * The alert is an opportunity in September and would be an urgent one in
 * February — the point is to avoid the March scramble.
 */
function taxAlerts(user: UserInput): Alert[] {
  const remaining = SECTION_80C_CAP - user.section80CUsed;
  if (remaining <= 0) return [];

  const months = monthsToFinancialYearEnd(user.period.start);
  if (months <= 0) return [];

  return [
    {
      id: 'section-80c',
      severity: months >= 4 ? ('opportunity' as const) : ('urgent' as const),
      title: `${inr(remaining)} of 80C left`,
      body: `${capitalise(cardinal(months))} months to fill it without a March scramble.`,
      linkTo: 'plan' as const,
    },
  ];
}

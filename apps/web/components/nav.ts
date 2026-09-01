/**
 * The five screens, in sidebar order.
 *
 * Routes rather than a single `screen` state, so screens are linkable and the
 * back button works — see the interaction notes in the design handoff.
 */
export const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/plan', label: 'Investment plan' },
  { href: '/limits', label: 'Spending limits' },
  { href: '/spend', label: 'Where to spend' },
  { href: '/profile', label: 'Your profile' },
] as const;

export type NavHref = (typeof NAV)[number]['href'];

/** Alert `linkTo` keys map onto routes. */
export const SCREEN_HREF = {
  dashboard: '/dashboard',
  plan: '/plan',
  limits: '/limits',
  spend: '/spend',
  profile: '/profile',
} as const;

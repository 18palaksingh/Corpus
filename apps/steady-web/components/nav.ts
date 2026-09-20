/**
 * The five destinations.
 *
 * One per move in the deck's solution — notice, unstick, recover, reach out —
 * plus the account. Care is last and always present: the crisis line lives
 * behind it, and a destination that appears only when things are bad is one
 * people have to go looking for on the day they have least capacity to look.
 */
export interface NavItem {
  href: string;
  label: string;
  /** The move from the pitch deck this destination serves. */
  move: 'notice' | 'unstick' | 'recover' | 'reach out' | 'account';
}

export const NAV: readonly NavItem[] = [
  { href: '/today', label: 'Today', move: 'notice' },
  { href: '/week', label: 'Your week', move: 'notice' },
  { href: '/unfreeze', label: 'Unfreeze', move: 'unstick' },
  { href: '/reset', label: 'Reset', move: 'recover' },
  { href: '/care', label: 'Support', move: 'reach out' },
];

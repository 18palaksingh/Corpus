import { Reset } from '@/components/Reset';

export const dynamic = 'force-dynamic';

export default function ResetPage(): React.ReactElement {
  // No user lookup: the reset needs nothing about the person, and the group
  // layout has already established there is a session.
  return <Reset />;
}

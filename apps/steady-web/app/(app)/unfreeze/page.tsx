import { Unfreezer } from '@/components/Unfreezer';
import { requirePageUser } from '@/lib/page';

export const dynamic = 'force-dynamic';

export default async function UnfreezePage(): Promise<React.ReactElement> {
  // Gate the page even though the layout already does: this route accepts free
  // text and writes rows, and defence in depth is cheap here.
  await requirePageUser();
  return <Unfreezer />;
}

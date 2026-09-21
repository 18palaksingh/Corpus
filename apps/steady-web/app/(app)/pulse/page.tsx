import { PulseForm } from '@/components/PulseForm';
import { Stack } from '@/components/ui';
import { requirePageUser } from '@/lib/page';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Today's check-in.
 *
 * If there is already one for today it is loaded into the form rather than
 * starting blank — someone who comes back has come back to change an answer,
 * not to be asked from scratch.
 */
export default async function PulsePage(): Promise<React.ReactElement> {
  const { userId, today } = await requirePageUser();

  const existing = await prisma.checkIn.findUnique({
    where: { userId_date: { userId, date: today } },
    select: {
      energy: true,
      detachment: true,
      effectiveness: true,
      sleepHours: true,
      bodyPain: true,
      workedLate: true,
    },
  });

  return (
    <Stack>
      <PulseForm
        day={today}
        existing={
          existing
            ? {
                energy: existing.energy as 1 | 2 | 3 | 4 | 5,
                detachment: existing.detachment as 1 | 2 | 3 | 4 | 5,
                effectiveness: existing.effectiveness as 1 | 2 | 3 | 4 | 5,
                sleepHours: existing.sleepHours,
                bodyPain: existing.bodyPain,
                workedLate: existing.workedLate,
              }
            : null
        }
      />
    </Stack>
  );
}

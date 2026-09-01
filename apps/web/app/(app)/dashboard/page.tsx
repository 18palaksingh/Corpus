import type { Metadata } from 'next';

import { planHeaderNote } from '@corpus/core';

import { AlertsCard } from '@/components/AlertsCard';
import { GoalsCard } from '@/components/GoalsCard';
import { PlanCard } from '@/components/PlanCard';
import { PortfolioCard } from '@/components/PortfolioCard';
import { ScoreCard } from '@/components/ScoreCard';
import { SurplusCard } from '@/components/SurplusCard';
import p from '@/components/primitives.module.css';
import { getSnapshot } from '@/lib/snapshot';

export const metadata: Metadata = { title: 'Dashboard · Corpus' };

/**
 * The hero screen: where the user stands, and what to do this month. Sized to
 * answer both without scrolling past the fold on a 1440px display.
 */
export default async function DashboardPage() {
  const { score, cashflow, portfolio, plan, alerts, goals } = await getSnapshot();

  return (
    <main className={p.screen}>
      <div className={p.gridHero}>
        <ScoreCard score={score} />
        <SurplusCard cashflow={cashflow} />
        <PortfolioCard portfolio={portfolio} />
      </div>

      <div className={p.gridSplit}>
        <PlanCard plan={plan} headerNote={planHeaderNote(plan)} />
        <AlertsCard alerts={alerts} />
      </div>

      <GoalsCard goals={goals} />
    </main>
  );
}

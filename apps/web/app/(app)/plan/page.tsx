import type { Metadata } from 'next';

import { color, inr, inrCompact } from '@corpus/core';
import type { HoldingActionKind } from '@corpus/core';

import { AllocationCard } from '@/components/AllocationCard';
import p from '@/components/primitives.module.css';
import s from '@/components/PlanScreen.module.css';
import { getSnapshot } from '@/lib/snapshot';

export const metadata: Metadata = { title: 'Investment plan · Corpus' };

/** "Keep" reads as reassurance, "Stop SIP" and "Review" as things to act on. */
const ACTION_COLOR: Record<HoldingActionKind, string> = {
  keep: color.positive,
  'stop-sip': color.negative,
  hold: color.muted,
  review: color.negative,
};

export default async function PlanPage() {
  const snapshot = await getSnapshot();
  const { plan, allocation, allocationNote, holdings } = snapshot;

  return (
    <main className={p.screen}>
      <header className={p.pageHeader}>
        <h1 className="pageTitle">Your investment plan</h1>
        <p className="pageSubhead">
          Built from your income stability, age, dependents, existing holdings and loan rates.
          Corpus rebalances every quarter and tells you what changed.
        </p>
      </header>

      <div className={p.gridHalves}>
        <AllocationCard rows={allocation} note={allocationNote} />

        <section className={`${p.cardDark} ${s.darkCard}`} aria-label="Where the money goes">
          <h2 className="cardHeading" style={{ margin: 0 }}>
            Where the {inr(plan.investable)} goes
          </h2>

          <div className={s.darkList}>
            {plan.actions.map((action) => (
              <div key={action.kind} className={s.darkRow}>
                <div className={s.darkRowText}>
                  <div className={s.darkRowTitle}>{action.detailTitle}</div>
                  <div className={s.darkRowCaption}>{action.caption}</div>
                </div>
                <div className={s.darkRowAmount}>{inr(action.amount)}</div>
              </div>
            ))}
          </div>

          <div className={s.darkFooter}>
            <div className="microLabel microLabelOnDark">IF YOU HOLD THIS FOR 12 MONTHS</div>
            <p className={p.bodyOnDark} style={{ margin: 0 }}>
              {plan.twelveMonthOutlook}
            </p>
          </div>
        </section>
      </div>

      <section className={`${p.card} ${p.cardFlush}`} aria-label="Changes to what you already hold">
        <div className={p.cardHeader}>
          <h2 className="cardHeading" style={{ margin: 0 }}>
            Changes to what you already hold
          </h2>
        </div>

        <div
          className={`microLabel microLabelTable ${p.tableHeader} ${s.holdingsGrid} ${s.holdingsHeader}`}
        >
          <div>HOLDING</div>
          <div>VALUE</div>
          <div>ACTION</div>
          <div>WHY</div>
        </div>

        {holdings.map((holding) => (
          <div key={holding.id} className={`${p.tableRow} ${s.holdingsGrid}`}>
            <div className={p.tableCellTitle}>{holding.name}</div>
            <div className={p.tableCellMono}>
              {inrCompact(holding.value, { keepTrailingZero: true })}
            </div>
            <div className={s.action} style={{ color: ACTION_COLOR[holding.actionKind] }}>
              {holding.action}
            </div>
            <div className={p.tableCellNote}>{holding.why}</div>
          </div>
        ))}
      </section>
    </main>
  );
}

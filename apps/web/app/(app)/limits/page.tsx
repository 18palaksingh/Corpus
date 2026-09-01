import type { Metadata } from 'next';

import { barHeight, clampFill, color, inr } from '@corpus/core';
import type { LimitStatus } from '@corpus/core';

import p from '@/components/primitives.module.css';
import s from '@/components/LimitsScreen.module.css';
import { getSnapshot } from '@/lib/snapshot';

export const metadata: Metadata = { title: 'Spending limits · Corpus' };

/** Under the limit is green, right up against it amber, over it red. */
const BAR_COLOR: Record<LimitStatus, string> = {
  under: color.positive,
  at: color.warning,
  over: color.negative,
};

export default async function LimitsPage() {
  const { limits } = await getSnapshot();

  return (
    <main className={p.screen}>
      <header className={s.header}>
        <div className={`${p.pageHeader} ${p.pageHeaderWide}`}>
          <h1 className="pageTitle">Spending limits</h1>
          <p className="pageSubhead">
            Set against your take-home, your city and your goals, not a generic rule of thumb.
          </p>
        </div>

        <div className={s.stats}>
          <div className={s.stat}>
            <div className={`microLabel ${s.statLabel}`}>WITHIN LIMIT</div>
            <div className={s.statValue}>
              {limits.withinLimit} of {limits.totalCategories}
            </div>
          </div>
          <div className={s.stat}>
            <div className={`microLabel ${s.statLabel}`}>RECLAIMABLE</div>
            <div className={`${s.statValue} ${p.accentText}`}>{inr(limits.reclaimablePerMonth)}</div>
          </div>
        </div>
      </header>

      <section className={`${p.card} ${p.cardFlush}`} aria-label="Spending by category">
        <div
          className={`microLabel microLabelTable ${p.tableHeader} ${s.limitsGrid} ${s.limitsHeader}`}
        >
          <div>CATEGORY</div>
          <div>YOU SPENT</div>
          <div>LIMIT</div>
          <div>USE</div>
          <div>WHAT TO DO</div>
        </div>

        {limits.rows.map((row) => (
          <div key={row.id} className={`${p.tableRow} ${p.tableRowTall} ${s.limitsGrid}`}>
            <div className={p.tableCellTitle}>{row.label}</div>
            <div className={p.tableCellMono}>{inr(row.spent)}</div>
            <div className={`${p.tableCellMono} ${s.limitMuted}`}>{inr(row.limit)}</div>

            <div className={s.usage}>
              <div
                className={`${p.track} ${s.usageTrack}`}
                style={{ height: barHeight.goal }}
                role="progressbar"
                aria-label={`${row.label} usage`}
                aria-valuenow={Math.round(row.usage * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={p.fill}
                  style={{ width: clampFill(row.fill), background: BAR_COLOR[row.status] }}
                />
              </div>
              <span
                className={s.usagePct}
                style={{ color: row.status === 'over' ? color.negative : color.muted }}
              >
                {row.usageLabel}
              </span>
            </div>

            <div className={p.tableCellNote}>{row.note}</div>
          </div>
        ))}
      </section>

      <div className={p.gridThirds}>
        {limits.highlights.map((highlight) => (
          <section key={highlight.label} className={`${p.card} ${p.cardCompact}`}>
            <div className="microLabel">{highlight.label}</div>
            <div className={`${p.secondaryMetric} ${highlight.accent ? p.accentText : ''}`}>
              {highlight.value}
            </div>
            <p className={p.body} style={{ margin: 0 }}>
              {highlight.copy}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}

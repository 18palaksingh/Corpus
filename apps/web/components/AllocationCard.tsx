import type { AllocationRow } from '@corpus/core';
import { allocationBarColor, barHeight, clampFill } from '@corpus/core';

import p from './primitives.module.css';
import s from './PlanScreen.module.css';

/**
 * Target allocation.
 *
 * The bar is filled to the *target*, not the current weight — the point of the
 * card is where the portfolio is going, with the current weight shown beside it
 * for reference.
 */
export function AllocationCard({ rows, note }: { rows: AllocationRow[]; note: string }) {
  return (
    <section className={`${p.card} ${p.cardPadded} ${s.allocationCard}`} aria-label="Target allocation">
      <h2 className="cardHeading" style={{ margin: 0 }}>
        Target allocation
      </h2>

      <div className={s.bars}>
        {rows.map((row) => (
          <div key={row.assetClass} className={s.bar}>
            <div className={s.barHeader}>
              <span className={s.barName}>{row.label}</span>
              <span className={s.barShift}>{row.shiftLabel}</span>
            </div>
            <div
              className={p.track}
              style={{ height: barHeight.allocation, borderRadius: 4 }}
              role="progressbar"
              aria-label={`${row.label} target`}
              aria-valuenow={Math.round(row.target * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={p.fill}
                style={{
                  width: clampFill(row.target),
                  background: allocationBarColor[row.assetClass],
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className={s.footnote}>{note}</p>
    </section>
  );
}

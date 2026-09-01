import type { CashflowSummary } from '@corpus/core';
import { inr, inrDelta } from '@corpus/core';

import p from './primitives.module.css';
import s from './Dashboard.module.css';

/** Where the month's money went, and what is left over. */
export function SurplusCard({ cashflow }: { cashflow: CashflowSummary }) {
  const up = cashflow.surplusVsAverage >= 0;

  return (
    <section className={`${p.card} ${p.cardPadded} ${s.metricCard}`} aria-label="Monthly surplus">
      <div className="microLabel">MONTHLY SURPLUS</div>
      <div className={p.cardMetric}>{inr(cashflow.surplus)}</div>
      <div className={`${s.metricDelta} ${up ? p.positive : p.negative}`}>
        {inrDelta(cashflow.surplusVsAverage)} vs. your six-month average
      </div>

      <dl className={s.breakdown}>
        <Row label="Take-home" value={inr(cashflow.totalIncome)} />
        <Row label="Fixed commitments" value={inr(cashflow.fixedCommitments)} />
        <Row label="Variable spend" value={inr(cashflow.variableSpend)} />
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.breakdownRow}>
      <dt className={s.breakdownLabel}>{label}</dt>
      <dd className="mono" style={{ margin: 0 }}>
        {value}
      </dd>
    </div>
  );
}

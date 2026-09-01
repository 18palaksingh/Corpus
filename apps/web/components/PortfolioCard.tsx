import type { PortfolioSummary } from '@corpus/core';
import { assetClassColor, inrCompact, monthYear, pctSigned } from '@corpus/core';

import p from './primitives.module.css';
import s from './Dashboard.module.css';

/** Portfolio value, return since inception, and how it is split. */
export function PortfolioCard({ portfolio }: { portfolio: PortfolioSummary }) {
  const up = portfolio.xirr >= 0;

  return (
    <section className={`${p.card} ${p.cardPadded} ${s.metricCard}`} aria-label="Portfolio">
      <div className="microLabel">PORTFOLIO</div>
      <div className={p.cardMetric}>{inrCompact(portfolio.totalValue)}</div>
      <div className={`${s.metricDelta} ${up ? p.positive : p.negative}`}>
        {pctSigned(portfolio.xirr)} XIRR since {monthYear(portfolio.xirrSince)}
      </div>

      <div className={s.allocation}>
        {/*
          The stacked bar is decorative — the legend below carries the same
          numbers as text, so screen readers get them once, not twice.
        */}
        <div className={s.stackedBar} aria-hidden>
          {portfolio.segments.map((segment) => (
            <div
              key={segment.assetClass}
              style={{
                flex: segment.weight * 100,
                background: assetClassColor[segment.assetClass],
              }}
            />
          ))}
        </div>
        <div className={s.legend}>
          {portfolio.segments.map((segment) => (
            <span key={segment.assetClass}>{segment.label}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

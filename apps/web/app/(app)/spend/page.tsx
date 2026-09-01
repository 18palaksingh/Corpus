import type { Metadata } from 'next';

import { color, inr } from '@corpus/core';
import type { RecommendationKind } from '@corpus/core';

import p from '@/components/primitives.module.css';
import s from '@/components/SpendScreen.module.css';
import { getSnapshot } from '@/lib/snapshot';

export const metadata: Metadata = { title: 'Where to spend · Corpus' };

const TAG_LABEL: Record<RecommendationKind, string> = {
  best: 'BEST',
  also: 'ALSO',
  avoid: 'AVOID',
  card: 'CARD',
};

const TAG_COLOR: Record<RecommendationKind, string> = {
  best: color.accent,
  also: color.muted,
  avoid: color.negative,
  card: color.muted,
};

export default async function SpendPage() {
  const { spend } = await getSnapshot();

  return (
    <main className={p.screen}>
      <header className={p.pageHeader}>
        <h1 className="pageTitle">Where to spend</h1>
        <p className="pageSubhead">
          The same basket, cheaper. Corpus compares what you actually buy across the places near you
          and pairs each one with the right card.
        </p>
      </header>

      <div className={p.gridHalves}>
        {spend.groups.map((group) => (
          <section key={group.id} className={`${p.card} ${p.cardFlush}`} aria-label={group.title}>
            <div className={`${p.cardHeader} ${p.cardHeaderTight}`}>
              <h2 className="cardHeading" style={{ margin: 0 }}>
                {group.title}
              </h2>
              <div className={s.headerStat}>{group.stat}</div>
            </div>

            {group.items.map((item, i) => {
              const best = i === 0;
              return (
                <div key={item.title} className={`${s.recRow} ${best ? s.recRowBest : ''}`}>
                  <div className={s.tag} style={{ color: TAG_COLOR[item.kind] }}>
                    {TAG_LABEL[item.kind]}
                  </div>
                  <div className={s.recText}>
                    <div className={s.recTitle}>{item.title}</div>
                    <div className={`${s.recBody} ${best ? s.recBodyBest : ''}`}>{item.body}</div>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <section className={`${p.card} ${p.cardFlush}`} aria-label="Which card to use where">
        <div className={p.cardHeader}>
          <h2 className="cardHeading" style={{ margin: 0 }}>
            Which card to use where
          </h2>
          <div className={p.cardHeaderMeta}>From your two cards and six months of spend</div>
        </div>

        <div className={`${p.cellRow} ${p.cellRowFour}`}>
          {spend.routing.map((route) => (
            <div key={route.label} className={p.cell} style={{ gap: 6 }}>
              <div className="microLabel microLabelTable">{route.label}</div>
              <div className={s.routingName}>{route.name}</div>
              <div className={s.routingBody}>{route.body}</div>
            </div>
          ))}

          {/* The dark cell is the payoff of the row — everything above adds up to this. */}
          <div className={p.cellDark}>
            <div className="microLabel microLabelTable microLabelOnDark">ANNUAL UPSIDE</div>
            <div className={s.upside}>{inr(spend.annualUpside)}</div>
            <div className={`${s.routingBody} ${s.routingBodyDark}`}>{spend.annualUpsideCopy}</div>
          </div>
        </div>
      </section>
    </main>
  );
}

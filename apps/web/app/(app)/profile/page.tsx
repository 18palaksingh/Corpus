import type { Metadata } from 'next';

import { color, inr } from '@corpus/core';
import type { CardStatus } from '@corpus/core';

import { IncomeForm } from '@/components/IncomeForm';
import p from '@/components/primitives.module.css';
import s from '@/components/ProfileScreen.module.css';
import { getSnapshot } from '@/lib/snapshot';

export const metadata: Metadata = { title: 'Your profile · Corpus' };

const TONE: Record<CardStatus['tone'], string> = {
  positive: color.positive,
  warning: color.warning,
  negative: color.negative,
  neutral: color.muted,
};

export default async function ProfilePage() {
  const { profile } = await getSnapshot();

  return (
    <main className={`${p.screen} ${p.screenNarrow}`}>
      <header className={`${p.pageHeader} ${p.pageHeaderWide}`}>
        <h1 className="pageTitle">Your profile</h1>
        <p className="pageSubhead">
          Everything the plan is built from. Change a number and Corpus reruns in a few seconds.
        </p>
      </header>

      <div className={p.card}>
        <IncomeForm income={profile.income} />
      </div>

      <div className={p.gridHalves}>
        <section className={`${p.card} ${p.cardPadded} ${s.card}`} aria-label="Fixed commitments">
          <h2 className="cardHeading" style={{ margin: 0 }}>
            Fixed commitments
          </h2>

          <div className={s.commitments}>
            {profile.commitments.map((commitment) => (
              <div key={commitment.id} className={s.commitmentRow}>
                <span className={s.commitmentLabel}>{commitment.label}</span>
                <span className={s.commitmentValue}>{inr(commitment.monthlyAmount)}</span>
              </div>
            ))}

            <div className={s.commitmentTotal}>
              <span className={s.commitmentTotalLabel}>Total</span>
              <span className={s.commitmentTotalValue}>{inr(profile.commitmentsTotal)}</span>
            </div>
          </div>
        </section>

        <section className={`${p.card} ${p.cardPadded} ${s.card}`} aria-label="Cards and accounts">
          <h2 className="cardHeading" style={{ margin: 0 }}>
            Cards and accounts
          </h2>

          <div className={s.accounts}>
            {profile.cards.map((card) => (
              <div key={card.id} className={s.accountRow}>
                <div className={s.accountText}>
                  <div className={s.accountTitle}>
                    {card.name} · {card.last4}
                  </div>
                  <div className={s.accountCaption}>{card.caption}</div>
                </div>
                <div className={s.accountStatus} style={{ color: TONE[card.tone] }}>
                  {card.utilisationLabel}
                </div>
              </div>
            ))}

            {profile.accounts.map((account) => (
              <div key={account.id} className={s.accountRow}>
                <div className={s.accountText}>
                  <div className={s.accountTitle}>{account.label}</div>
                  <div className={s.accountCaption}>{account.caption}</div>
                </div>
                <div className={s.accountStatus} style={{ color: color.muted }}>
                  {account.status}
                </div>
              </div>
            ))}
          </div>

          <p className={s.footnote}>
            Corpus reads statements only. It never moves money without an approved plan.
          </p>
        </section>
      </div>
    </main>
  );
}

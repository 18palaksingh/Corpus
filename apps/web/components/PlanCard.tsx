'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { MonthlyPlan } from '@corpus/core';
import { dayMonth, inr } from '@corpus/core';

import p from './primitives.module.css';
import s from './Dashboard.module.css';
import c from './PlanCard.module.css';

type Mode = 'idle' | 'adjusting' | 'scheduled';

/**
 * "This month's plan".
 *
 * Three states:
 *   idle       — the plan as generated, with Adjust and Approve.
 *   adjusting  — the amounts become inputs, re-splitting the same investable
 *                pool. The total is constrained: money moved into one action
 *                has to come out of another.
 *   scheduled  — after approval, the card reports what is booked rather than
 *                asking again.
 *
 * Approval moves real money, so it goes through an explicit confirmation
 * listing every action and amount.
 */
export function PlanCard({ plan, headerNote }: { plan: MonthlyPlan; headerNote: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [mode, setMode] = useState<Mode>('idle');
  const [amounts, setAmounts] = useState<number[]>(() => plan.actions.map((a) => a.amount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * A recalculation replaces the plan; drop any half-finished edit with it.
   *
   * Keyed on the plan's *content*, not the object: every server render hands
   * down a fresh object, so depending on identity would reset the card on the
   * refresh that follows an approval — throwing away the scheduled state the
   * approval just produced.
   */
  const planKey = `${plan.scheduledFor}|${plan.investable}|${plan.actions
    .map((a) => `${a.kind}:${a.amount}`)
    .join(',')}`;

  useEffect(() => {
    setAmounts(plan.actions.map((a) => a.amount));
    setMode('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey]);

  const allocated = amounts.reduce((sum, n) => sum + n, 0);
  const remaining = plan.investable - allocated;
  const balanced = remaining === 0;

  function openConfirm() {
    setError(null);
    dialogRef.current?.showModal();
  }

  async function approve() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/plan/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledFor: plan.scheduledFor,
          actions: plan.actions.map((action, i) => ({ kind: action.kind, amount: amounts[i] })),
        }),
      });
      if (!res.ok) throw new Error(`Approval failed: ${res.status}`);
      dialogRef.current?.close();
      setMode('scheduled');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not schedule the plan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`${p.card} ${p.cardFlush}`} aria-label="This month's plan">
      <div className={p.cardHeader}>
        <h2 className="cardHeading" style={{ margin: 0 }}>
          This month&rsquo;s plan
        </h2>
        <div className={p.cardHeaderMeta}>{headerNote}</div>
      </div>

      <div className={`${p.cellRow} ${p.cellRowThree}`}>
        {plan.actions.map((action, i) => (
          <div key={action.kind} className={p.cell}>
            <div className={s.stepLabel}>{action.stepLabel}</div>

            {mode === 'adjusting' ? (
              <label>
                <span className="srOnly">{action.title} amount in rupees</span>
                <input
                  className={c.amountInput}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={plan.investable}
                  step={500}
                  value={amounts[i] ?? 0}
                  onChange={(e) =>
                    setAmounts((prev) =>
                      prev.map((v, j) => (j === i ? Math.max(0, Number(e.target.value) || 0) : v)),
                    )
                  }
                />
              </label>
            ) : (
              <div className={p.planFigure}>{inr(amounts[i] ?? action.amount)}</div>
            )}

            <div className={s.stepTitle}>{action.title}</div>
            <p className={p.body}>{action.reason}</p>
          </div>
        ))}
      </div>

      <div className={s.planFooter}>
        {mode === 'scheduled' ? (
          <div className={s.scheduledNote}>
            Scheduled for {dayMonth(plan.scheduledFor)}. Corpus will confirm once each one executes.
          </div>
        ) : mode === 'adjusting' ? (
          <div className={`${c.remaining} ${balanced ? '' : c.remainingOver}`}>
            {balanced
              ? `All ${inr(plan.investable)} allocated.`
              : remaining > 0
                ? `${inr(remaining)} still to allocate.`
                : `${inr(-remaining)} over the investable pool.`}
          </div>
        ) : (
          <div className={s.planFooterNote}>{plan.footerNote}</div>
        )}

        {mode !== 'scheduled' && (
          <div className={s.planFooterActions}>
            {mode === 'adjusting' ? (
              <>
                <button
                  type="button"
                  className={p.buttonSecondary}
                  onClick={() => {
                    setAmounts(plan.actions.map((a) => a.amount));
                    setMode('idle');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={p.buttonDark}
                  disabled={!balanced}
                  onClick={() => setMode('idle')}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <button type="button" className={p.buttonSecondary} onClick={() => setMode('adjusting')}>
                  Adjust
                </button>
                <button type="button" className={p.buttonDark} onClick={openConfirm}>
                  Approve plan
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <dialog ref={dialogRef} className={c.dialog} aria-labelledby="approve-title">
        <div className={c.dialogBody}>
          <div id="approve-title" className={c.dialogTitle}>
            Approve {inr(allocated)} for {dayMonth(plan.scheduledFor)}?
          </div>

          <div className={c.dialogList}>
            {plan.actions.map((action, i) => (
              <div key={action.kind} className={c.dialogRow}>
                <span>{action.title}</span>
                <span className={c.dialogAmount}>{inr(amounts[i] ?? action.amount)}</span>
              </div>
            ))}
          </div>

          <p className={p.body} style={{ margin: 0 }}>
            Corpus will set up each instruction on your linked accounts. You can cancel any of them
            before they execute.
          </p>

          {error && <div className={c.error}>{error}</div>}

          <div className={c.dialogActions}>
            <button
              type="button"
              className={p.buttonSecondary}
              onClick={() => dialogRef.current?.close()}
              disabled={submitting}
            >
              Not yet
            </button>
            <button type="button" className={p.buttonDark} onClick={approve} disabled={submitting}>
              {submitting ? 'Scheduling…' : 'Approve and schedule'}
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}

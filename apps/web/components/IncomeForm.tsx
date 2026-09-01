'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { IncomeInput, IncomeStability, TaxRegime } from '@corpus/core';
import { groupIndian } from '@corpus/core';

import s from './IncomeForm.module.css';

const STABILITIES: IncomeStability[] = [
  'Salaried, permanent',
  'Salaried, contract',
  'Self-employed',
  'Variable',
];

const REGIMES: TaxRegime[] = ['Old regime', 'New regime'];

type Status = 'idle' | 'saving' | 'saved' | 'error';

/**
 * The income fields the plan is built from.
 *
 * Every change reruns the model — "change a number and Corpus reruns in a few
 * seconds", as the screen itself promises. Saves are debounced so typing a
 * five-digit salary is one recalculation, not five.
 */
export function IncomeForm({ income }: { income: IncomeInput }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState<IncomeInput>(income);
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  // A recalculation from elsewhere replaces the server value; adopt it unless
  // the user is part-way through an edit of their own.
  useEffect(() => {
    if (!dirty.current) setDraft(income);
  }, [income]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function update<K extends keyof IncomeInput>(key: K, value: IncomeInput[K]) {
    dirty.current = true;
    const next = { ...draft, [key]: value };
    setDraft(next);
    setStatus('saving');

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 600);
  }

  async function save(next: IncomeInput) {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ income: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      dirty.current = false;
      setStatus('saved');
      startTransition(() => router.refresh());
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className={`${s.card}`} aria-label="Income">
      <div className={s.header}>
        <h2 className="cardHeading" style={{ margin: 0 }}>
          Income
        </h2>
        <div
          className={`${s.status} ${status === 'saved' ? s.statusSaved : ''} ${
            status === 'error' ? s.statusError : ''
          }`}
          role="status"
          aria-live="polite"
        >
          {status === 'saving' && 'Recalculating…'}
          {status === 'saved' && 'Plan updated'}
          {status === 'error' && 'Could not save. Retry by editing the field again.'}
        </div>
      </div>

      <div className={s.grid}>
        <Money
          label="Monthly take-home"
          value={draft.monthlyTakeHome}
          onChange={(v) => update('monthlyTakeHome', v)}
        />
        <Money
          label="Rental income"
          value={draft.rentalIncome}
          onChange={(v) => update('rentalIncome', v)}
        />
        <Money
          label="Freelance and other"
          value={draft.freelanceAndOther}
          onChange={(v) => update('freelanceAndOther', v)}
        />
        <Money
          label="Expected annual bonus"
          value={draft.expectedAnnualBonus}
          onChange={(v) => update('expectedAnnualBonus', v)}
        />

        <Select
          label="Income stability"
          value={draft.stability}
          options={STABILITIES}
          onChange={(v) => update('stability', v as IncomeStability)}
        />
        <Select
          label="Tax regime"
          value={draft.taxRegime}
          options={REGIMES}
          onChange={(v) => update('taxRegime', v as TaxRegime)}
        />
      </div>
    </section>
  );
}

/**
 * A rupee field.
 *
 * Shows Indian-grouped digits (₹2,05,000) when idle and plain digits while
 * focused — grouping separators moving under the cursor as you type is worse
 * than not having them for those few seconds.
 */
function Money({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <input
        className={`${s.control} ${s.controlMono}`}
        inputMode="numeric"
        value={focused ? String(value) : `₹${groupIndian(value)}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '');
          onChange(digits === '' ? 0 : Number(digits));
        }}
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <select className={s.control} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

'use client';

import { PRIVACY_LINE, PULSE_QUESTIONS, type Scale } from '@steady/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ErrorNote, ui } from './ui';
import styles from './PulseForm.module.css';

/**
 * The pulse check-in.
 *
 * Three steps, about sixty seconds, mapped to the WHO's three dimensions plus
 * the physical signals. Design decisions worth stating:
 *
 *   - **Tapping a scale advances the step.** No "next" button to hunt for on
 *     the first two screens; the answer *is* the navigation.
 *   - **Back always works.** A mistap on a screen that is measuring how you
 *     feel must be correctable, or people stop answering honestly.
 *   - **Nothing is pre-selected.** A default answer on a wellbeing instrument
 *     is a thumb on the scale — people accept defaults, and the default would
 *     become the data.
 *   - **The privacy line is on the screen, not in a settings page.** It is the
 *     reason someone is willing to answer at all.
 */

type Step = 0 | 1 | 2;

interface Draft {
  energy: Scale | null;
  detachment: Scale | null;
  effectiveness: Scale | null;
  sleepHours: number;
  bodyPain: boolean | null;
  workedLate: boolean | null;
}

const EMPTY: Draft = {
  energy: null,
  detachment: null,
  effectiveness: null,
  sleepHours: 7,
  bodyPain: null,
  workedLate: null,
};

function Scale5({
  value,
  onChange,
  low,
  high,
}: {
  value: Scale | null;
  onChange: (value: Scale) => void;
  low: string;
  high: string;
}): React.ReactElement {
  return (
    <div>
      <div className={styles.scale}>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            type="button"
            className={`${styles.scaleButton} ${value === n ? styles.scaleButtonSelected : ''}`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className={styles.scaleEnds}>
        <span className={styles.scaleEnd}>{low}</span>
        <span className={styles.scaleEnd}>{high}</span>
      </div>
    </div>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
}): React.ReactElement {
  return (
    <div className={styles.choices}>
      {[
        ['Yes', true],
        ['No', false],
      ].map(([label, choice]) => (
        <button
          key={String(label)}
          type="button"
          className={`${styles.choice} ${value === choice ? styles.choiceSelected : ''}`}
          aria-pressed={value === choice}
          onClick={() => onChange(choice as boolean)}
        >
          {label as string}
        </button>
      ))}
    </div>
  );
}

export function PulseForm({
  day,
  existing,
}: {
  day: string;
  existing: Partial<Draft> | null;
}): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY, ...existing });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]): void => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  /** Advance, but never past the last step. */
  const advance = (): void => setStep((s) => (s < 2 ? ((s + 1) as Step) : s));

  const complete =
    draft.energy !== null &&
    draft.detachment !== null &&
    draft.effectiveness !== null &&
    draft.bodyPain !== null &&
    draft.workedLate !== null;

  async function save(): Promise<void> {
    if (!complete || saving) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...draft, day }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Could not save your check-in');
      }

      // Back to the signal, recomputed. `refresh` rather than a client-side
      // merge: the band is the server's to decide.
      router.push('/today');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your check-in');
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.progress} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`${styles.pip} ${i <= step ? styles.pipDone : ''}`} />
        ))}
      </div>

      <span className="metaLabel">Daily pulse · {step + 1} of 3</span>

      {step === 0 ? (
        <>
          <p className={styles.question}>{PULSE_QUESTIONS.energy.question}</p>
          <Scale5
            value={draft.energy}
            low={PULSE_QUESTIONS.energy.low}
            high={PULSE_QUESTIONS.energy.high}
            onChange={(value) => {
              set('energy', value);
              advance();
            }}
          />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <p className={styles.question}>{PULSE_QUESTIONS.detachment.question}</p>
          <Scale5
            value={draft.detachment}
            low={PULSE_QUESTIONS.detachment.low}
            high={PULSE_QUESTIONS.detachment.high}
            onChange={(value) => set('detachment', value)}
          />

          <p className={styles.question} style={{ fontSize: 'var(--text-title)' }}>
            {PULSE_QUESTIONS.effectiveness.question}
          </p>
          <Scale5
            value={draft.effectiveness}
            low={PULSE_QUESTIONS.effectiveness.low}
            high={PULSE_QUESTIONS.effectiveness.high}
            onChange={(value) => {
              set('effectiveness', value);
              if (draft.detachment !== null) advance();
            }}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <p className={styles.question} style={{ fontSize: 'var(--text-title)' }}>
            {PULSE_QUESTIONS.sleepHours.question}
          </p>
          <div className={styles.sleepRow}>
            <input
              type="range"
              className={styles.range}
              min={0}
              max={14}
              step={0.5}
              value={draft.sleepHours}
              onChange={(event) => set('sleepHours', Number(event.target.value))}
              aria-label={PULSE_QUESTIONS.sleepHours.question}
            />
            <span className={styles.sleepValue}>{draft.sleepHours}h</span>
          </div>

          <p className={styles.question} style={{ fontSize: 'var(--text-title)' }}>
            {PULSE_QUESTIONS.bodyPain.question}
          </p>
          <YesNo value={draft.bodyPain} onChange={(value) => set('bodyPain', value)} />

          <p className={styles.question} style={{ fontSize: 'var(--text-title)' }}>
            {PULSE_QUESTIONS.workedLate.question}
          </p>
          <YesNo value={draft.workedLate} onChange={(value) => set('workedLate', value)} />
        </>
      ) : null}

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div className={styles.footer}>
        {step > 0 ? (
          <button
            type="button"
            className={`${ui.button} ${ui.buttonGhost}`}
            onClick={() => setStep((s) => ((s - 1) as Step))}
          >
            Back
          </button>
        ) : null}

        {step === 2 ? (
          <button
            type="button"
            className={`${ui.button} ${ui.buttonFull}`}
            disabled={!complete || saving}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : 'Done'}
          </button>
        ) : null}
      </div>

      <p className={ui.caption}>{PRIVACY_LINE}</p>
    </div>
  );
}

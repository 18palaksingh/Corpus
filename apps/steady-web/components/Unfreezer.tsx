'use client';

import { TELE_MANAS, type UnfreezePlan } from '@steady/core';
import { useEffect, useRef, useState } from 'react';

import { Card, Caption, ErrorNote, MetaLabel, Note, Stack, ui } from './ui';
import styles from './Unfreezer.module.css';

/**
 * The Task Unfreezer.
 *
 * The deck calls this "the everyday hook" — the thing that earns a daily open
 * and, with it, permission to ask how someone is doing.
 *
 * The crisis branch is checked before anything else renders. When the server
 * says the text tripped the screen, the task, the steps and the timer do not
 * exist on this screen at all; there is nothing to click back to and nothing
 * to dismiss it with. That is deliberate.
 */

interface CrisisCopy {
  heading: string;
  body: string;
  action: string;
  detail: string;
  disclaimer: string;
}

type Result =
  | { kind: 'idle' }
  | { kind: 'crisis'; copy: CrisisCopy }
  | { kind: 'plan'; id: string; plan: UnfreezePlan }
  | { kind: 'tooShort'; message: string };

function Timer({ minutes }: { minutes: number }): React.ReactElement {
  const [remaining, setRemaining] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return undefined;

    tick.current = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running]);

  const mm = Math.floor(remaining / 60);
  const ss = `${remaining % 60}`.padStart(2, '0');

  return (
    <div className={styles.timer}>
      <span className={styles.timerValue}>
        {mm}:{ss}
      </span>
      <button
        type="button"
        className={styles.timerButton}
        onClick={() => {
          if (remaining === 0) setRemaining(minutes * 60);
          setRunning((value) => !value);
        }}
      >
        {remaining === 0 ? 'Again' : running ? 'Pause' : `Start ${minutes}-minute timer`}
      </button>
    </div>
  );
}

export function Unfreezer(): React.ReactElement {
  const [task, setTask] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [done, setDone] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rated, setRated] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (busy || task.trim().length === 0) return;

    setBusy(true);
    setError(null);
    setDone(new Set());
    setRated(false);

    try {
      const response = await fetch('/api/unfreeze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task }),
      });

      const body = (await response.json()) as {
        crisis?: boolean;
        copy?: CrisisCopy;
        plan?: UnfreezePlan | null;
        id?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) throw new Error(body.error ?? 'Could not plan that task');

      if (body.crisis && body.copy) {
        setResult({ kind: 'crisis', copy: body.copy });
      } else if (body.plan && body.id) {
        setResult({ kind: 'plan', id: body.id, plan: body.plan });
      } else {
        setResult({ kind: 'tooShort', message: body.message ?? 'Paste a bit more and try again.' });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not plan that task');
    } finally {
      setBusy(false);
    }
  }

  async function rate(id: string, helped: boolean): Promise<void> {
    setRated(true);
    // Fire and forget: a failed rating must never interrupt someone who has
    // just been helped to start.
    await fetch('/api/unfreeze/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, helped }),
    }).catch(() => undefined);
  }

  if (result.kind === 'crisis') {
    return (
      <div className={styles.crisis}>
        <p className={styles.crisisHeading}>{result.copy.heading}</p>
        <p className={styles.crisisBody}>{result.copy.body}</p>
        <a className={styles.crisisCall} href={`tel:${TELE_MANAS.phone}`}>
          {result.copy.action}
        </a>
        <p className={styles.crisisDetail}>{result.copy.detail}</p>
        <p className={styles.crisisDisclaimer}>{result.copy.disclaimer}</p>
      </div>
    );
  }

  return (
    <Stack>
      <header>
        <h1>Task Unfreezer</h1>
        <Caption>
          Paste the thing you have been circling. You get a first step, two questions for your
          manager, and ten minutes.
        </Caption>
      </header>

      <form onSubmit={(event) => void submit(event)}>
        <Stack tight>
          <label className={ui.fieldLabel} htmlFor="task">
            What are you stuck on?
          </label>
          <textarea
            id="task"
            className={ui.textarea}
            value={task}
            maxLength={2000}
            placeholder="Build the IRR summary for Fund III for the Friday client call"
            onChange={(event) => setTask(event.target.value)}
          />
          <button type="submit" className={ui.button} disabled={busy || task.trim().length === 0}>
            {busy ? 'Thinking…' : 'Get my first step'}
          </button>
        </Stack>
      </form>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {result.kind === 'tooShort' ? <Note>{result.message}</Note> : null}

      {result.kind === 'plan' ? (
        <>
          <p className={styles.taskEcho}>{result.plan.task}</p>

          <Card>
            <MetaLabel>Your first 3 steps</MetaLabel>
            <ol className={styles.steps}>
              {result.plan.steps.map((step, index) => (
                <li
                  key={step}
                  className={`${styles.step} ${done.has(index) ? styles.stepDone : ''}`}
                >
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <button
                    type="button"
                    className={styles.stepText}
                    aria-pressed={done.has(index)}
                    onClick={() =>
                      setDone((current) => {
                        const next = new Set(current);
                        if (next.has(index)) next.delete(index);
                        else next.add(index);
                        return next;
                      })
                    }
                  >
                    {step}
                  </button>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <MetaLabel>Ask your manager</MetaLabel>
            <ul className={styles.questions} style={{ marginTop: 'var(--space-md)' }}>
              {result.plan.managerQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </Card>

          <Timer minutes={result.plan.timerMinutes} />

          {rated ? (
            <Note>Thanks — that is the one number telling us whether this is working.</Note>
          ) : (
            <Card tight>
              <Stack tight>
                <span>Did this help you start?</span>
                <div className={styles.feedback}>
                  <button
                    type="button"
                    className={`${ui.button} ${ui.buttonSecondary}`}
                    onClick={() => void rate(result.id, true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`${ui.button} ${ui.buttonSecondary}`}
                    onClick={() => void rate(result.id, false)}
                  >
                    Not really
                  </button>
                </div>
              </Stack>
            </Card>
          )}
        </>
      ) : null}

      <Note>
        The Unfreezer plans tasks. It does not give medical, legal or financial advice, and it
        cannot see anything about your job beyond what you paste here.
      </Note>
    </Stack>
  );
}

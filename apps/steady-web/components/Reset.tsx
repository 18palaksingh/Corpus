'use client';

import { buildResetScript, RESET_EXIT_LABEL, RESET_PATTERN_LABEL } from '@steady/core';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Caption, Stack, ui } from './ui';
import styles from './Reset.module.css';

/**
 * The blank-mind reset.
 *
 * ## Why the script is built on the client
 *
 * `buildResetScript()` is a pure function in `@steady/core`, so the reset runs
 * with no network at all once the page has loaded. The deck promises "90
 * seconds, one tap, works offline", and a breathing exercise that needs a
 * round-trip does not work on the underground, in a stairwell, or on the
 * office wifi that is the reason you need it.
 *
 * The POST at the end is best-effort and fires after the fact. If it fails,
 * nothing about the person's experience changes.
 *
 * ## Leaving is always one tap
 *
 * `RESET_EXIT_LABEL` is on screen from the first second. An exercise you
 * cannot quit is a trap, and this product does not trap people — the deck's
 * "won't do" list rules out exactly this kind of mechanic.
 */
export function Reset(): React.ReactElement {
  const script = useMemo(() => buildResetScript(), []);
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(script.steps[0]?.seconds ?? 0);
  const [finished, setFinished] = useState(false);
  const elapsed = useRef(0);

  useEffect(() => {
    if (!running || finished) return undefined;

    const tick = setInterval(() => {
      elapsed.current += 1;

      setRemaining((value) => {
        if (value > 1) return value - 1;

        // Step over.
        setIndex((current) => {
          const next = current + 1;
          if (next >= script.steps.length) {
            setRunning(false);
            setFinished(true);
            return current;
          }
          setRemaining(script.steps[next]?.seconds ?? 0);
          return next;
        });

        return 0;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [running, finished, script.steps]);

  // Record the run once, after it ends. Never blocks the UI.
  useEffect(() => {
    if (!finished) return;
    void fetch('/api/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ completed: true, secondsHeld: elapsed.current }),
    }).catch(() => undefined);
  }, [finished]);

  const step = script.steps[index];
  const nextStep = script.steps[index + 1];

  const ringClass = !running
    ? styles.ringGround
    : step?.kind === 'breathe-in'
      ? styles.ringIn
      : step?.kind === 'breathe-out'
        ? styles.ringOut
        : styles.ringGround;

  if (finished) {
    return (
      <div className={styles.wrap}>
        <div className={`${styles.ring} ${styles.ringGround}`}>
          <span className={styles.count}>✓</span>
        </div>
        <p className={styles.text}>That is ninety seconds back.</p>
        <div className={styles.controls}>
          <Link href="/unfreeze" className={`${ui.button} ${ui.buttonFull}`}>
            Unfreeze a task
          </Link>
          <button
            type="button"
            className={`${ui.button} ${ui.buttonSecondary} ${ui.buttonFull}`}
            onClick={() => {
              elapsed.current = 0;
              setIndex(0);
              setRemaining(script.steps[0]?.seconds ?? 0);
              setFinished(false);
            }}
          >
            Again
          </button>
          <Link href="/today" className={`${ui.button} ${ui.buttonGhost}`}>
            Back to today
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Stack>
      <div className={styles.wrap}>
        <span className="metaLabel">Blank-mind reset</span>

        <div
          className={`${styles.ring} ${ringClass}`}
          style={{ transitionDuration: `${step?.seconds ?? 1}s` }}
        >
          <span className={styles.count}>{running ? remaining : 90}</span>
        </div>

        <div>
          <p className={styles.text}>{running ? step?.text : 'Ninety seconds. One tap.'}</p>
          {running && nextStep ? (
            <p className={styles.next}>Next: {nextStep.text.toLowerCase()}</p>
          ) : null}
        </div>

        <span className={styles.pattern}>{RESET_PATTERN_LABEL}</span>

        <div className={styles.controls}>
          {running ? (
            <button
              type="button"
              className={`${ui.button} ${ui.buttonSecondary} ${ui.buttonFull}`}
              onClick={() => setRunning(false)}
            >
              Pause
            </button>
          ) : (
            <button
              type="button"
              className={`${ui.button} ${ui.buttonFull}`}
              onClick={() => setRunning(true)}
            >
              {index === 0 && remaining === script.steps[0]?.seconds ? 'Start' : 'Resume'}
            </button>
          )}

          <Link href="/unfreeze" className={`${ui.button} ${ui.buttonGhost}`}>
            {RESET_EXIT_LABEL}
          </Link>
        </div>

        <Caption>Works offline. Nothing here is recorded except that you did it.</Caption>
      </div>
    </Stack>
  );
}

'use client';

import { TELE_MANAS } from '@steady/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ErrorNote, Stack, ui } from './ui';

/**
 * Log a win.
 *
 * Free text, so it goes through the same crisis screen as the Unfreezer — the
 * server decides, and this component only has to render what it is told. A
 * "wins" box is an unlikely place for a disclosure, which is exactly why it
 * must not be the one field that quietly stores one and moves on.
 */
export function WinForm({ day }: { day: string }): React.ReactElement {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<{ heading: string; body: string; action: string } | null>(
    null,
  );

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (busy || text.trim().length < 2) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/wins', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, day }),
      });

      const body = (await response.json()) as {
        crisis?: boolean;
        copy?: { heading: string; body: string; action: string };
        error?: string;
      };

      if (!response.ok) throw new Error(body.error ?? 'Could not save that');

      if (body.crisis && body.copy) {
        setCrisis(body.copy);
        return;
      }

      setText('');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that');
    } finally {
      setBusy(false);
    }
  }

  if (crisis) {
    return (
      <Stack tight>
        <strong>{crisis.heading}</strong>
        <p className={ui.muted}>{crisis.body}</p>
        <a href={`tel:${TELE_MANAS.phone}`} className={ui.button}>
          {crisis.action}
        </a>
      </Stack>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <Stack tight>
        <label className={ui.fieldLabel} htmlFor="win">
          Something that went well
        </label>
        <input
          id="win"
          className={ui.input}
          value={text}
          maxLength={280}
          placeholder="Asked for the example I needed"
          onChange={(event) => setText(event.target.value)}
        />
        <button
          type="submit"
          className={`${ui.button} ${ui.buttonSecondary}`}
          disabled={busy || text.trim().length < 2}
        >
          {busy ? 'Saving…' : 'Add it'}
        </button>
      </Stack>
    </form>
  );
}

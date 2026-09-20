'use client';

import { useState } from 'react';

import { Card, Caption, ErrorNote, MetaLabel, Note, Stack, ui } from './ui';

/**
 * Pairing a phone, and leaving.
 *
 * The two things on this screen that are not read-only, kept in one client
 * component so the rest of the profile page can stay a server component.
 */
export function AccountPanel({ anonymous }: { anonymous: boolean }): React.ReactElement {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function issueCode(): Promise<void> {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/pair', { method: 'POST' });
      const body = (await response.json()) as {
        code?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!response.ok || !body.code) throw new Error(body.error ?? 'Could not create a code');

      setCode(body.code);
      setExpiresAt(body.expiresAt ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create a code');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(): Promise<void> {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/account', { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete the account');
      // Straight out through the sign-out endpoint: the session cookie is
      // still valid and would otherwise point at a user that no longer exists.
      window.location.href = '/api/auth/signout';
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the account');
      setBusy(false);
    }
  }

  return (
    <Stack>
      <Card>
        <MetaLabel>Your phone</MetaLabel>
        <p style={{ marginTop: 'var(--space-sm)' }}>
          Open Steady on Android, go to Profile → Pair with my account, and type this code.
        </p>

        {code ? (
          <>
            <p
              className="mono"
              style={{
                marginTop: 'var(--space-lg)',
                fontSize: 'var(--text-display)',
                letterSpacing: '0.12em',
              }}
            >
              {code}
            </p>
            <Caption>
              Expires{' '}
              {expiresAt
                ? new Date(expiresAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'in ten minutes'}
              . Single use.
            </Caption>
          </>
        ) : (
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <button
              type="button"
              className={`${ui.button} ${ui.buttonSecondary}`}
              disabled={busy}
              onClick={() => void issueCode()}
            >
              {busy ? 'Working…' : 'Show a pairing code'}
            </button>
          </div>
        )}

        <Caption>
          Pairing moves the phone&rsquo;s check-ins onto this account. Where both have an answer
          for the same day, this account&rsquo;s answer is kept.
        </Caption>
      </Card>

      {anonymous ? (
        <Note tone="warn">
          This account is anonymous, which means there is no way to prove it is yours. If you
          lose access to this browser, the history goes with it. Signing in with Google or GitHub
          from the sign-in screen attaches a way back in — it does not attach your answers to
          anything an employer can see.
        </Note>
      ) : null}

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Card>
        <MetaLabel>Delete everything</MetaLabel>
        <p style={{ marginTop: 'var(--space-sm)' }}>
          Every check-in, win, plan and device. Immediate, and not recoverable.
        </p>

        <div style={{ marginTop: 'var(--space-lg)' }}>
          {confirmingDelete ? (
            <Stack tight>
              <strong>Delete your account and all of its data?</strong>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button
                  type="button"
                  className={ui.button}
                  style={{ background: 'var(--signal-red-solid)' }}
                  disabled={busy}
                  onClick={() => void deleteAccount()}
                >
                  {busy ? 'Deleting…' : 'Yes, delete it'}
                </button>
                <button
                  type="button"
                  className={`${ui.button} ${ui.buttonSecondary}`}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Keep it
                </button>
              </div>
            </Stack>
          ) : (
            <button
              type="button"
              className={`${ui.button} ${ui.buttonSecondary}`}
              onClick={() => setConfirmingDelete(true)}
            >
              Delete my account
            </button>
          )}
        </div>
      </Card>
    </Stack>
  );
}

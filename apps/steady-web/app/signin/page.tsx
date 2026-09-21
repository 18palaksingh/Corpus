import { NOT_A_DIAGNOSIS, TELE_MANAS } from '@steady/core';
import { redirect } from 'next/navigation';

import { auth, availableSso, demoEnabled, signIn } from '@/lib/auth';

import styles from './signin.module.css';

export const dynamic = 'force-dynamic';

/**
 * Sign in.
 *
 * ## Anonymous is first, and it is the big button
 *
 * Not a fallback, not "continue as guest" in grey text at the bottom. The
 * deck's research is unambiguous — 39% of people held back from seeking help
 * by stigma, and the primary persona downloads this *specifically* because
 * nobody at work will know. Putting Google first would ask, on the first
 * screen, for the one thing the product promised not to need.
 *
 * SSO is offered underneath for people who want their history to survive a
 * lost phone, and the trade-off is stated rather than implied.
 *
 * ## The crisis line is on the sign-in screen
 *
 * Before any account exists. Someone can arrive here in a bad moment, and a
 * helpline behind a sign-up form is a helpline that failed.
 */
export default async function SignInPage(props: {
  searchParams: Promise<{ error?: string }>;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (session?.user?.id) redirect('/today');

  const { error } = await props.searchParams;
  const sso = availableSso();

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <span className={styles.brand}>Steady</span>
          <h1 className={styles.headline}>
            Catch burnout before it becomes a resignation letter
          </h1>
          <p className={styles.sub}>
            Three questions a day. A first step when you are stuck. Help from a human when you
            want it.
          </p>
        </header>

        {error ? (
          <p className={styles.error}>
            That sign-in did not complete. Try again, or continue anonymously.
          </p>
        ) : null}

        <form
          action={async () => {
            'use server';
            await signIn('anonymous', { redirectTo: '/today' });
          }}
        >
          <button type="submit" className={styles.primary}>
            Start anonymously
          </button>
        </form>

        <p className={styles.reassure}>
          No email, no name, nothing linked to your employer. Your answers are yours.
        </p>

        {sso.length > 0 ? (
          <>
            <div className={styles.divider}>
              <span>or sign in, so your history survives a lost phone</span>
            </div>

            {sso.map((provider) => (
              <form
                key={provider.id}
                action={async () => {
                  'use server';
                  await signIn(provider.id, { redirectTo: '/today' });
                }}
              >
                <button type="submit" className={styles.secondary}>
                  {provider.label}
                </button>
              </form>
            ))}

            <p className={styles.caption}>
              Signing in stores your email so you can get back in. It is never shared with an
              employer, and your check-in answers are never attached to it in anything anyone
              else can see.
            </p>
          </>
        ) : (
          <p className={styles.caption}>
            Single sign-on is not configured on this deployment. Set <code>AUTH_GOOGLE_ID</code>{' '}
            and <code>AUTH_GOOGLE_SECRET</code> to switch it on — see{' '}
            <code>apps/steady-web/.env.example</code>.
          </p>
        )}

        {demoEnabled() ? (
          <form
            action={async () => {
              'use server';
              await signIn('demo', { redirectTo: '/today' });
            }}
          >
            <button type="submit" className={styles.demo}>
              Open the demo account (four weeks of seeded data)
            </button>
          </form>
        ) : null}

        <footer className={styles.footer}>
          <p className={styles.caption}>{NOT_A_DIAGNOSIS}</p>
          <p className={styles.crisis}>
            In crisis right now? Call{' '}
            <a href={`tel:${TELE_MANAS.phone}`}>
              {TELE_MANAS.name} {TELE_MANAS.phone}
            </a>{' '}
            — {TELE_MANAS.detail.toLowerCase()}.
          </p>
        </footer>
      </div>
    </main>
  );
}

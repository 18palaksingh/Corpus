import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

import { prisma } from './prisma';

/**
 * Steady's authentication.
 *
 * Three ways in, and the order matters — it is the order the sign-in screen
 * lists them, and it is the reverse of what most products do:
 *
 *   1. **Anonymously.** No email, no name, nothing to subpoena from an
 *      employer. The deck's research found stigma is the single biggest thing
 *      keeping people away ("39% held back from seeking help by stigma"), and
 *      Ananya's journey has her downloading it *without giving her name*. An
 *      anonymous account here is a real account with the identifying columns
 *      left empty, not a degraded trial mode.
 *   2. **Google.**
 *   3. **GitHub.**
 *
 * ## Why JWT sessions with a database adapter
 *
 * The adapter persists users and linked OAuth identities — that is what the
 * check-ins hang off. Sessions themselves are JWTs because Auth.js only
 * supports the Credentials provider under a JWT strategy, and the Credentials
 * provider is how anonymous sign-up works. So: durable users in Postgres,
 * stateless sessions in a cookie.
 *
 * ## OAuth providers are optional
 *
 * A provider with no credentials in the environment is not registered, and its
 * button does not render. A fresh clone therefore runs with anonymous sign-up
 * alone and no configuration at all, which is what makes this thing testable
 * in five minutes.
 */

/** A provider is only offered when both halves of its secret are present. */
function configuredProviders(): NextAuthConfig['providers'] {
  const providers: NextAuthConfig['providers'] = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        allowDangerousEmailAccountLinking: false,
      }),
    );
  }

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      }),
    );
  }

  /**
   * The seeded demo account, for review and for the end-to-end tests.
   *
   * Gated on `STEADY_DEMO=1` so it cannot exist in a deployment that did not
   * ask for it — a one-click sign-in to a known account is a back door if it
   * ships by accident, which is why this is opt-in rather than
   * `NODE_ENV !== 'production'`.
   */
  if (process.env.STEADY_DEMO === '1') {
    providers.push(
      Credentials({
        id: 'demo',
        name: 'Demo account',
        credentials: {},
        async authorize() {
          const user = await prisma.user.findUnique({
            where: { email: 'demo@steady.local' },
            select: { id: true, name: true, email: true, image: true },
          });

          // No seed, no sign-in. Creating the account here would mean the
          // demo button silently produces an empty one.
          return user ?? null;
        },
      }),
    );
  }

  providers.push(
    Credentials({
      id: 'anonymous',
      name: 'Continue anonymously',
      // No fields: there is nothing to ask for. The form posts empty and the
      // authorize step mints a fresh account.
      credentials: {},
      async authorize() {
        const user = await prisma.user.create({
          data: { anonymous: true },
          select: { id: true, name: true, email: true, image: true },
        });

        return user;
      },
    }),
  );

  return providers;
}

/** Whether the seeded demo sign-in is switched on. */
export function demoEnabled(): boolean {
  return process.env.STEADY_DEMO === '1';
}

/** Which SSO buttons the sign-in screen should render. */
export function availableSso(): Array<{ id: string; label: string }> {
  const sso: Array<{ id: string; label: string }> = [];
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    sso.push({ id: 'google', label: 'Continue with Google' });
  }
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    sso.push({ id: 'github', label: 'Continue with GitHub' });
  }
  return sso;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: configuredProviders(),
  pages: {
    signIn: '/signin',
  },
  trustHost: true,
  callbacks: {
    /**
     * Put the database user id on the token.
     *
     * Everything downstream keys off `session.user.id`, never off the email —
     * an anonymous user has no email, and treating email as the identity is
     * how anonymous accounts quietly stop working.
     */
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (typeof token.userId === 'string') {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  events: {
    /**
     * A real sign-in method has been attached, so the account is no longer
     * anonymous. Without this an account that started anonymous and later
     * linked Google would keep claiming it had no identity, and the profile
     * screen would keep offering to save an account that was already saved.
     */
    async linkAccount({ user }) {
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { anonymous: false },
        });
      }
    },
  },
});

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

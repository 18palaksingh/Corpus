import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, JetBrains_Mono } from 'next/font/google';

import './globals.css';

/*
 * next/font self-hosts both families and emits them as CSS variables, which is
 * what the design handoff asks for in production — no runtime request to
 * Google, no flash of fallback text.
 */
const sans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
  fallback: ['Helvetica', 'sans-serif'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['monospace'],
});

export const metadata: Metadata = {
  title: 'Corpus',
  description:
    'One monthly plan: what to invest, what to prepay, what to park — with spending limits and where to spend, built from your own numbers.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#14161A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

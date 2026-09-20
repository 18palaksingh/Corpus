import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { HomeSnapshot, UnfreezePlan, WeeklyInsight } from '@steady/core';

/**
 * The Android app's client for the Steady server.
 *
 * ## Authentication
 *
 * The phone signs itself up. On first launch it POSTs to `/api/device` with no
 * credentials and gets back a bearer token, which is kept in AsyncStorage and
 * sent on every subsequent request. No email, no OAuth, no browser hand-off —
 * this is the deck's anonymous sign-up, and it is the whole first-run
 * experience.
 *
 * Pairing (`/api/pair/redeem`) later moves the phone onto a web account and
 * hands back a rotated token, which replaces the stored one.
 *
 * ## Offline
 *
 * The last home snapshot is cached. When the server cannot be reached the app
 * shows the cached one **behind an explicit banner saying it is stale** — a
 * plan someone believes is current when it is not is worse than no plan.
 */

const TOKEN_KEY = 'steady.deviceToken';
const SNAPSHOT_KEY = 'steady.lastSnapshot';

/** Requests give up rather than hanging a screen behind a spinner forever. */
const TIMEOUT_MS = 10_000;

export function apiBaseUrl(): string {
  const configured = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl;
  return (configured ?? 'http://localhost:3100').replace(/\/$/, '');
}

/** Thrown when the server is unreachable, as opposed to refusing. */
export class OfflineError extends Error {
  constructor() {
    super('Could not reach Steady');
    this.name = 'OfflineError';
  }
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

async function setToken(token: string): Promise<void> {
  cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(SNAPSHOT_KEY);
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  { method = 'GET', body, auth = true }: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers,
      signal: controller.signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    // A network failure, a DNS failure or the timeout above. From the app's
    // point of view these are one thing: the server is not there right now.
    throw new OfflineError();
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof payload.error === 'string' ? payload.error : 'Something went wrong',
    );
  }

  return payload as T;
}

// ---------------------------------------------------------------------------
// Sign-up and account
// ---------------------------------------------------------------------------

/** Ensure this install has an account. Safe to call on every launch. */
export async function ensureDevice(): Promise<string> {
  const existing = await getToken();
  if (existing) return existing;

  const created = await request<{ token: string }>('/api/device', {
    method: 'POST',
    auth: false,
    body: { label: 'Android', timezone: deviceTimezone() },
  });

  await setToken(created.token);
  return created.token;
}

export interface AccountInfo {
  userId: string;
  name: string | null;
  email: string | null;
  anonymous: boolean;
}

export function getAccount(): Promise<AccountInfo> {
  return request<AccountInfo>('/api/device');
}

/**
 * Redeem a pairing code shown on the web app.
 *
 * On success the server hands back a rotated token for the account that was
 * paired into, which replaces the one this install was using.
 */
export async function pair(code: string): Promise<{
  movedDays: number;
  skippedDays: number;
  email: string | null;
}> {
  const result = await request<{
    token: string;
    movedDays: number;
    skippedDays: number;
    email: string | null;
  }>('/api/pair/redeem', { method: 'POST', body: { code } });

  await setToken(result.token);
  return result;
}

export async function deleteAccount(): Promise<void> {
  await request('/api/account', { method: 'DELETE' });
  await clearToken();
}

// ---------------------------------------------------------------------------
// The product
// ---------------------------------------------------------------------------

/** The phone's local day, which is the one the server should file against. */
export function today(): string {
  const now = new Date();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

export interface CachedSnapshot {
  snapshot: HomeSnapshot;
  /** When it was fetched, so the stale banner can say how old it is. */
  fetchedAt: string;
}

export async function readCachedSnapshot(): Promise<CachedSnapshot | null> {
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CachedSnapshot;
  } catch {
    // Corrupt cache is not worth crashing a launch over.
    return null;
  }
}

export async function fetchHome(): Promise<HomeSnapshot> {
  const snapshot = await request<HomeSnapshot>(`/api/home?day=${today()}`);

  await AsyncStorage.setItem(
    SNAPSHOT_KEY,
    JSON.stringify({ snapshot, fetchedAt: new Date().toISOString() } satisfies CachedSnapshot),
  );

  return snapshot;
}

export interface CheckInBody {
  energy: number;
  detachment: number;
  effectiveness: number;
  sleepHours: number;
  bodyPain: boolean;
  workedLate: boolean;
}

export function submitCheckIn(answers: CheckInBody): Promise<HomeSnapshot> {
  return request<HomeSnapshot>('/api/check-in', {
    method: 'POST',
    body: { ...answers, day: today() },
  });
}

export interface CrisisCopy {
  heading: string;
  body: string;
  action: string;
  detail: string;
  disclaimer: string;
}

export type UnfreezeResponse =
  | { crisis: true; copy: CrisisCopy }
  | { crisis: false; id?: string; plan?: UnfreezePlan | null; message?: string };

export function unfreeze(task: string): Promise<UnfreezeResponse> {
  return request<UnfreezeResponse>('/api/unfreeze', { method: 'POST', body: { task } });
}

export function rateUnfreeze(id: string, helped: boolean): Promise<unknown> {
  return request('/api/unfreeze/feedback', { method: 'POST', body: { id, helped } });
}

export function fetchInsight(): Promise<WeeklyInsight> {
  return request<WeeklyInsight>(`/api/insight?day=${today()}`);
}

export function addWin(text: string): Promise<{ crisis: boolean; copy?: CrisisCopy }> {
  return request<{ crisis: boolean; copy?: CrisisCopy }>('/api/wins', {
    method: 'POST',
    body: { text, day: today() },
  });
}

export function recordReset(secondsHeld: number, completed: boolean): Promise<unknown> {
  return request('/api/reset', { method: 'POST', body: { secondsHeld, completed } });
}

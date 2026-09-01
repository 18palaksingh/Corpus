/**
 * Writes lib/last-known-snapshot.json from @corpus/core.
 *
 * The model is server-side: the app reads /api/snapshot and renders what comes
 * back. This file is the offline fallback — the shape of a real "last synced"
 * cache, so the app has something to show on a plane rather than an empty
 * screen. It is a payload, not the model: none of the scoring or planning logic
 * ships to the device.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ANANYA, buildSnapshot } from '@corpus/core';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'lib', 'last-known-snapshot.json');

const snapshot = buildSnapshot(ANANYA, new Date('2026-08-28T06:40:00Z'));
writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`last-known-snapshot.json written (score ${snapshot.score.value})`);

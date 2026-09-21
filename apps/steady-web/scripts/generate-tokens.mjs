/**
 * Generates app/tokens.css from @steady/core.
 *
 * The tokens live in TypeScript because the Android app needs them as values.
 * Rather than hand-copy them into CSS and let the two drift, the custom
 * properties are emitted from the same source. Runs before dev and build, and
 * the output is committed so a clean checkout renders correctly before any
 * script has run.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { color, fontSize, radius, signalColor, space } from '@steady/core';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'app', 'tokens.css');

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const lines = [
  '/* Generated from @steady/core by scripts/generate-tokens.mjs. Do not edit by hand. */',
  ':root {',
];

for (const [name, value] of Object.entries(color)) {
  lines.push(`  --color-${kebab(name)}: ${value};`);
}
for (const [band, roles] of Object.entries(signalColor)) {
  for (const [role, value] of Object.entries(roles)) {
    lines.push(`  --signal-${band}-${role}: ${value};`);
  }
}
for (const [name, value] of Object.entries(space)) {
  lines.push(`  --space-${kebab(name)}: ${value}px;`);
}
for (const [name, value] of Object.entries(radius)) {
  lines.push(`  --radius-${kebab(name)}: ${name === 'pill' ? value : `${value}px`};`);
}
for (const [name, value] of Object.entries(fontSize)) {
  lines.push(`  --text-${kebab(name)}: ${value}px;`);
}

lines.push('}');
lines.push('');

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join('\n'));
console.log(`tokens.css written with ${lines.length - 3} custom properties`);

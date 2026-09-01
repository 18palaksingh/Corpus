/**
 * Generates app/tokens.css from @corpus/core.
 *
 * The tokens live in TypeScript because the mobile app needs them as values.
 * Rather than hand-copy them into CSS and let the two drift, we emit the custom
 * properties from the same source. Runs before dev and build; the output is
 * committed so a clean checkout renders correctly before any script has run.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { color, radius, space, barHeight, SIDEBAR_WIDTH, HOVER_TRANSITION } from '@corpus/core';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'app', 'tokens.css');

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const lines = [
  '/* Generated from @corpus/core by scripts/generate-tokens.mjs. Do not edit by hand. */',
  ':root {',
];

for (const [name, value] of Object.entries(color)) lines.push(`  --color-${kebab(name)}: ${value};`);
for (const [name, value] of Object.entries(radius)) lines.push(`  --radius-${kebab(name)}: ${value}px;`);
for (const [name, value] of Object.entries(barHeight)) lines.push(`  --bar-${kebab(name)}: ${value}px;`);

lines.push(`  --page-pad-top: ${space.page.top}px;`);
lines.push(`  --page-pad-x: ${space.page.x}px;`);
lines.push(`  --page-pad-bottom: ${space.page.bottom}px;`);
lines.push(`  --topbar-pad-y: ${space.topBar.y}px;`);
lines.push(`  --topbar-pad-x: ${space.topBar.x}px;`);
lines.push(`  --sidebar-pad-y: ${space.sidebar.y}px;`);
lines.push(`  --sidebar-pad-x: ${space.sidebar.x}px;`);
lines.push(`  --gap-section: ${space.section}px;`);
lines.push(`  --gap-card-grid: ${space.cardGrid}px;`);
lines.push(`  --pad-card: ${space.card}px;`);
lines.push(`  --pad-card-compact: ${space.cardCompact}px;`);
lines.push(`  --pad-card-inner-cell: ${space.cardInnerCell}px;`);
lines.push(`  --sidebar-width: ${SIDEBAR_WIDTH}px;`);
lines.push(`  --hover-transition: ${HOVER_TRANSITION};`);
lines.push('}');
lines.push('');

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join('\n'));
console.log(`tokens.css written with ${lines.length - 3} custom properties`);

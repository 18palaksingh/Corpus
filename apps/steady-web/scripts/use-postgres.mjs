/**
 * Switches the Prisma schema from SQLite to Postgres, or back.
 *
 *   node scripts/use-postgres.mjs          # → postgresql
 *   node scripts/use-postgres.mjs sqlite   # → sqlite
 *
 * ## Why a script and not two schema files
 *
 * Prisma does not accept an environment variable for `provider`, so something
 * has to change the line. The alternative — committing `schema.postgres.prisma`
 * alongside `schema.prisma` — means two files that must be edited in lockstep
 * forever, and they will drift the first time someone adds a column in a hurry.
 * One schema and a one-line rewrite cannot drift.
 *
 * This only works because the schema was written to be portable: no Prisma
 * enums (SQLite has none), no database-specific native types. If you add
 * something Postgres-only, this script stops being enough — and that is a
 * decision worth making deliberately rather than discovering on a deploy.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', 'prisma', 'schema.prisma');

const requested = (process.argv[2] ?? 'postgresql').toLowerCase();
const target = requested === 'sqlite' ? 'sqlite' : 'postgresql';

const schema = readFileSync(schemaPath, 'utf8');
const providerLine = /provider\s*=\s*"(sqlite|postgresql)"/;

const match = schema.match(providerLine);
if (!match) {
  console.error('Could not find the datasource provider line in schema.prisma.');
  process.exit(1);
}

const current = match[1];
if (current === target) {
  console.log(`Already on ${target}. Nothing to do.`);
  process.exit(0);
}

writeFileSync(schemaPath, schema.replace(providerLine, `provider = "${target}"`));

console.log(`schema.prisma: ${current} → ${target}`);
console.log('');

if (target === 'postgresql') {
  console.log('Next:');
  console.log('  1. Point DATABASE_URL at your database:');
  console.log('       DATABASE_URL="postgresql://user:pass@host:5432/steady?sslmode=require"');
  console.log('  2. npm run db:push -w @steady/web');
  console.log('');
  console.log('The SQLite file at prisma/steady.db is left alone; it is not migrated.');
} else {
  console.log('Next:');
  console.log('  DATABASE_URL="file:./steady.db" npm run db:push -w @steady/web');
}

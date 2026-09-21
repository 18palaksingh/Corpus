/**
 * Keeps the Prisma datasource provider in step with DATABASE_URL.
 *
 *   node scripts/db-provider.mjs              # infer from DATABASE_URL
 *   node scripts/db-provider.mjs postgresql   # force
 *   node scripts/db-provider.mjs sqlite       # force
 *
 * ## Why this runs on every build
 *
 * Prisma does not accept an environment variable for `provider`, so the line
 * in `schema.prisma` has to change. Leaving that as a manual step is a trap
 * with a long fuse: deploy with a Postgres `DATABASE_URL`, forget the step,
 * and `prisma generate` quietly emits a **SQLite** client. The build goes
 * green, the container starts, and the first query fails in production with an
 * error that does not mention the real cause.
 *
 * So the provider is derived from the URL that is actually configured, on
 * every build, and the deploy cannot drift from the database it is pointed at.
 *
 * ## Why the schema is portable at all
 *
 * No Prisma enums (SQLite has none) and no database-specific native types, so
 * the two providers accept the same schema and this stays a one-line rewrite.
 * If you add something Postgres-only, this script stops being enough — which
 * is a decision worth making deliberately rather than discovering on a deploy.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', 'prisma', 'schema.prisma');

/** Map a connection string to the provider that can open it. */
function providerFor(url) {
  if (!url) return null;
  if (/^postgres(ql)?:\/\//i.test(url)) return 'postgresql';
  if (/^(file:|sqlite:)/i.test(url)) return 'sqlite';
  return null;
}

const forced = process.argv[2]?.toLowerCase();
if (forced && forced !== 'sqlite' && forced !== 'postgresql') {
  console.error(`Unknown provider "${forced}". Use "sqlite" or "postgresql", or pass nothing.`);
  process.exit(1);
}

const inferred = providerFor(process.env.DATABASE_URL);

// Forced wins; otherwise follow DATABASE_URL. With neither — a bare
// `npm install` with no environment — leave the file alone rather than
// rewriting it to a guess.
const target = forced ?? inferred;

if (!target) {
  if (process.env.DATABASE_URL) {
    console.warn(
      `db-provider: could not tell a provider from DATABASE_URL, leaving schema.prisma as it is.`,
    );
  } else {
    console.log('db-provider: DATABASE_URL not set, leaving schema.prisma as it is.');
  }
  process.exit(0);
}

const schema = readFileSync(schemaPath, 'utf8');
const providerLine = /provider\s*=\s*"(sqlite|postgresql)"/;

const match = schema.match(providerLine);
if (!match) {
  console.error('db-provider: could not find the datasource provider in schema.prisma.');
  process.exit(1);
}

const current = match[1];

if (current === target) {
  console.log(`db-provider: already ${target}.`);
  process.exit(0);
}

writeFileSync(schemaPath, schema.replace(providerLine, `provider = "${target}"`));
console.log(`db-provider: ${current} → ${target}${forced ? ' (forced)' : ' (from DATABASE_URL)'}`);

if (target === 'postgresql') {
  console.log('Run `npm run db:push -w @steady/web` once against the new database.');
}

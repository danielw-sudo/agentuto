#!/usr/bin/env node
/**
 * Bundle budget gate — Constitution Art. 8.2 ("bundle-size budgets are checked in CI once defined").
 *
 * Art. 8 said the budgets did not exist yet. This script defines them and enforces them, so a
 * dependency, an asset or an import that quietly inflates the payload fails CI instead of being
 * discovered months later.
 *
 * Measurement is local and dependency-free: every file under dist/ with a shipped extension is
 * gzipped at level 9 with Node's zlib. That is not byte-identical to the numbers Vite prints
 * (Vite reports its own gzip), so the gate compares against its own measurement only — never
 * mix the two in a report.
 *
 * Measured baseline (main @ d05993e, 2026-10-31, after `npm run build`, measured by THIS script):
 *   total   1,187,891 B raw / 314,942 B gzip
 *   largest single chunk (index-*.js) 171,804 B gzip
 *
 * The budgets below are that baseline plus ~5% headroom: enough that ordinary feature work fits,
 * tight enough that a 20 kB regression is caught. Raising a budget is an owner decision and needs
 * a one-line reason in the PR ("why this weight is worth carrying").
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
const SHIPPED = new Set(['.js', '.css', '.html']);

const BUDGET = {
  totalGzip: 330_000,
  totalRaw: 1_300_000,
  largestGzip: 185_000,
};

const kb = (n) => (n / 1024).toFixed(1).padStart(7);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (SHIPPED.has(extname(p)) && !p.endsWith('.map')) out.push(p);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error(`✘ ${DIST}/ not found — run \`npm run build\` first.`);
  process.exit(1);
}

const rows = walk(DIST).map((path) => {
  const raw = readFileSync(path);
  return { path, raw: raw.length, gzip: gzipSync(raw, { level: 9 }).length };
});

const totalRaw = rows.reduce((s, r) => s + r.raw, 0);
const totalGzip = rows.reduce((s, r) => s + r.gzip, 0);
const largest = rows.reduce((a, b) => (b.gzip > a.gzip ? b : a));

console.log('Bundle budget (Art. 8.2)\n');
for (const r of [...rows].sort((a, b) => b.gzip - a.gzip)) {
  console.log(`  ${r.path.padEnd(42)} ${kb(r.raw)} kB raw ${kb(r.gzip)} kB gzip`);
}
console.log('');
console.log(`  ${'total'.padEnd(42)} ${kb(totalRaw)} kB raw ${kb(totalGzip)} kB gzip  (budget ${kb(BUDGET.totalRaw)} / ${kb(BUDGET.totalGzip)} kB)`);
console.log(`  ${'largest chunk'.padEnd(42)} ${' '.repeat(11)} ${kb(largest.gzip)} kB gzip  (budget ${kb(BUDGET.largestGzip)} kB) → ${largest.path}`);
console.log('');

const failures = [];
if (totalGzip > BUDGET.totalGzip) failures.push(`total gzip ${totalGzip} B exceeds budget ${BUDGET.totalGzip} B`);
if (totalRaw > BUDGET.totalRaw) failures.push(`total raw ${totalRaw} B exceeds budget ${BUDGET.totalRaw} B`);
if (largest.gzip > BUDGET.largestGzip) failures.push(`largest chunk ${largest.path} is ${largest.gzip} B gzip, budget ${BUDGET.largestGzip} B`);

if (failures.length) {
  console.error('✘ Bundle budget exceeded:');
  for (const f of failures) console.error(`   - ${f}`);
  console.error('\n  Shrink the change, or raise the budget in scripts/check-bundle.mjs with a one-line reason.');
  process.exit(1);
}

console.log('✔ Bundle within budget.');

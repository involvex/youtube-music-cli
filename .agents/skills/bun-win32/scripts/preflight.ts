#!/usr/bin/env bun
/**
 * preflight.ts — pre-publish release gate.
 *
 * `bun publish` resolves each `workspace:*` dependency to the EXACT version
 * recorded in bun.lock's workspace section — NOT live from package.json. After a
 * version bump, `bun install` does NOT rewrite those records (it reports "no
 * changes"), so dependents (@bun-win32/all, virtdisk, terminal, ...) would
 * silently publish pinning the OLD versions of the packages you just fixed.
 *
 * This check fails loudly when bun.lock's recorded workspace version disagrees
 * with the package's package.json version. The fix is always:
 *
 *     rm bun.lock && bun install
 *
 * Run before every publish. Exit code is non-zero on any mismatch.
 *
 * Usage:
 *   bun run scripts/preflight.ts
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '../..');
const lockfilePath = join(ROOT, 'bun.lock');

if (!existsSync(lockfilePath)) {
  console.error('✗ bun.lock not found. Run `bun install` first.');
  process.exit(1);
}

const lockfile = readFileSync(lockfilePath, 'utf-8');

// bun.lock records each workspace package as:
//   "packages/<dir>": { "name": "@scope/<x>", "version": "1.2.3", ... }
const workspaceRecordRe = /"packages\/([^"]+)"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"version"\s*:\s*"([^"]+)"/g;

interface Mismatch {
  pkg: string;
  name: string;
  lockfileVersion: string;
  packageJsonVersion: string;
}

const mismatches: Mismatch[] = [];
let checked = 0;

for (const match of lockfile.matchAll(workspaceRecordRe)) {
  const [, directory, name, lockfileVersion] = match;
  const packageJsonPath = join(ROOT, 'packages', directory, 'package.json');
  if (!existsSync(packageJsonPath)) continue;
  const packageJsonVersion = JSON.parse(readFileSync(packageJsonPath, 'utf-8')).version;
  checked++;
  if (packageJsonVersion !== lockfileVersion) {
    mismatches.push({
      pkg: directory,
      name,
      lockfileVersion,
      packageJsonVersion,
    });
  }
}

console.log(`Preflight: checked ${checked} workspace package version records in bun.lock.`);

if (mismatches.length > 0) {
  console.error(`\n✗ STALE LOCKFILE — ${mismatches.length} package(s) where bun.lock disagrees with package.json:\n`);
  for (const mismatch of mismatches) {
    console.error(`  ${mismatch.name.padEnd(28)} package.json=${mismatch.packageJsonVersion}  bun.lock=${mismatch.lockfileVersion}`);
  }
  console.error(`\n  bun publish would pin the bun.lock versions into dependents (workspace:* -> exact),`);
  console.error(`  shipping stale deps. Fix before publishing:\n\n    rm bun.lock && bun install\n`);
  process.exit(1);
}

console.log('✓ Lockfile is in sync with package.json versions.');
console.log('\nNext, before publishing, also run:');
console.log('  bun run scripts/nullcheck.ts --all   # missing | NULL / | 0n, type mismatches');
console.log('  bun run scripts/audit.ts --all       # FFI <-> TS consistency');
console.log('  bunx tsc --noEmit                    # per package');
process.exit(0);

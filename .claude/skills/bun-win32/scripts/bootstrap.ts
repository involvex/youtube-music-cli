#!/usr/bin/env bun
/**
 * bootstrap.ts — Kick off a new @bun-win32/{name} package end-to-end.
 *
 * Runs the full preparation pipeline in order:
 *   1. scripts/doctor.ts       (environment check)
 *   2. scripts/scaffold.ts     (create packages/{name} from template)
 *   3. bun install             (refresh workspace links)
 *   4. scripts/catalog.ts      (exports + SDK prototypes → log)
 *   5. scripts/ffi-runtime.ts  (Bun FFI return shapes → log)
 *   6. scripts/stub.ts         (paste-ready symbols/method stubs → log)
 *
 * Any step that fails halts the pipeline and surfaces the exit code.
 *
 * Usage:
 *   bun run scripts/bootstrap.ts <dll-name>
 *   bun run scripts/bootstrap.ts <dll-name> --skip-doctor
 *   bun run scripts/bootstrap.ts <dll-name> --skip-install
 *   bun run scripts/bootstrap.ts <dll-name> --rg=<path-to-rg.exe>
 *   bun run scripts/bootstrap.ts <dll-name> --dll=<path-to-dll>
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const repositoryRoot = join(import.meta.dir, '../..');
const argumentList = process.argv.slice(2);
const packageName = argumentList.find((argument) => !argument.startsWith('--'));
const shouldSkipDoctor = argumentList.includes('--skip-doctor');
const shouldSkipInstall = argumentList.includes('--skip-install');
const ripgrepOption = findOption('--rg');
const dllOption = findOption('--dll');

if (!packageName) {
  console.error('Usage: bun run scripts/bootstrap.ts <dll-name> [--skip-doctor] [--skip-install] [--rg=<path>] [--dll=<path>]');
  process.exit(1);
}

const packageDirectoryPath = join(repositoryRoot, 'packages', packageName);
const forwardedOptions: string[] = [];

if (ripgrepOption) {
  forwardedOptions.push(`--rg=${ripgrepOption}`);
}

if (dllOption) {
  forwardedOptions.push(`--dll=${dllOption}`);
}

interface PipelineStep {
  label: string;
  command: string;
  args: string[];
  cwd?: string;
  skip?: boolean;
  skipReason?: string;
}

const pipelineSteps: PipelineStep[] = [
  {
    label: 'doctor',
    command: 'bun',
    args: ['run', 'scripts/doctor.ts', ...(ripgrepOption ? [`--rg=${ripgrepOption}`] : [])],
    skip: shouldSkipDoctor,
    skipReason: '--skip-doctor passed',
  },
  {
    label: 'scaffold',
    command: 'bun',
    args: ['run', 'scripts/scaffold.ts', packageName],
    skip: existsSync(packageDirectoryPath),
    skipReason: `packages/${packageName} already exists — reusing`,
  },
  {
    label: 'install',
    command: 'bun',
    args: ['install'],
    skip: shouldSkipInstall,
    skipReason: '--skip-install passed',
  },
  {
    label: 'catalog',
    command: 'bun',
    args: ['run', 'scripts/catalog.ts', packageName, '--log', ...forwardedOptions],
  },
  {
    label: 'ffi-runtime',
    command: 'bun',
    args: ['run', 'scripts/ffi-runtime.ts', packageName, '--log'],
  },
  {
    label: 'stub',
    command: 'bun',
    args: ['run', 'scripts/stub.ts', packageName, '--log', ...forwardedOptions],
  },
];

printBanner();

for (let stepIndex = 0; stepIndex < pipelineSteps.length; stepIndex += 1) {
  const step = pipelineSteps[stepIndex]!;
  const stepNumber = stepIndex + 1;
  const stepHeader = `[${stepNumber}/${pipelineSteps.length}] ${step.label}`;

  if (step.skip) {
    console.log(`\n${stepHeader} ─ SKIPPED (${step.skipReason ?? 'no reason'})`);
    continue;
  }

  console.log(`\n${stepHeader} ─ ${step.command} ${step.args.join(' ')}`);

  const startedAtMilliseconds = Date.now();
  const spawnResult = spawnSync(step.command, step.args, {
    cwd: step.cwd ?? repositoryRoot,
    stdio: 'inherit',
    shell: true,
  });
  const elapsedMilliseconds = Date.now() - startedAtMilliseconds;

  if (spawnResult.status !== 0) {
    console.error(`\n✗ Step "${step.label}" failed with exit code ${spawnResult.status ?? 'unknown'} after ${formatDuration(elapsedMilliseconds)}.`);
    console.error('  Pipeline halted. Fix the error above and rerun bootstrap (or run the remaining steps manually).');
    process.exit(spawnResult.status ?? 1);
  }

  console.log(`  ✓ ${step.label} done in ${formatDuration(elapsedMilliseconds)}`);
}

printNextSteps();

function printBanner(): void {
  console.log('╭─ bun-win32 bootstrap ───────────────────────────────────────────╮');
  console.log(`  Package:  @bun-win32/${packageName}`);
  console.log(`  Target:   ${packageDirectoryPath}`);
  console.log('╰─────────────────────────────────────────────────────────────────╯');
}

function printNextSteps(): void {
  const generationLogPath = join(packageDirectoryPath, '.generation-log.md');

  console.log('\n╭─ Next Steps ────────────────────────────────────────────────────╮');
  console.log(`  1. Read  ${relativeFromRepository(generationLogPath)}`);
  console.log('     → Catalog, runtime probes, and paste-ready stubs live there.');
  console.log('  2. Write packages/' + packageName + '/types/<Class>.ts');
  console.log('  3. Write packages/' + packageName + '/structs/<Class>.ts');
  console.log('  4. Smoke test:');
  console.log(`       bun run packages/${packageName}/index.ts`);
  console.log(`       cd packages/${packageName} && bunx tsc --noEmit`);
  console.log('  5. Audit:');
  console.log(`       bun run scripts/audit.ts ${packageName}`);
  console.log('  6. Write AI.md, README.md, examples, then run them.');
  console.log('  7. Delete .generation-log.md only when the package is fully done.');
  console.log('╰─────────────────────────────────────────────────────────────────╯');
}

function relativeFromRepository(absolutePath: string): string {
  if (absolutePath.startsWith(repositoryRoot)) {
    return absolutePath.slice(repositoryRoot.length + 1).replace(/\\/g, '/');
  }

  return absolutePath;
}

function formatDuration(elapsedMilliseconds: number): string {
  if (elapsedMilliseconds < 1000) {
    return `${elapsedMilliseconds}ms`;
  }

  return `${(elapsedMilliseconds / 1000).toFixed(1)}s`;
}

function findOption(optionName: string): string | null {
  const prefix = `${optionName}=`;

  for (const argument of argumentList) {
    if (argument.startsWith(prefix)) {
      return argument.slice(prefix.length);
    }
  }

  return null;
}

#!/usr/bin/env bun
/**
 * doctor.ts — Verify the local environment can generate a Win32 package.
 *
 * Runs a set of cheap checks and prints pass/fail for each. Exits 1 if any
 * required check fails. Safe to run before bootstrap/scaffold/catalog.
 *
 * Usage:
 *   bun run scripts/doctor.ts
 *   bun run scripts/doctor.ts --rg=<path-to-rg.exe>
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const repositoryRoot = join(import.meta.dir, '../..');
const argumentList = process.argv.slice(2);
const explicitRipgrepPath = findOption('--rg');
const minimumBunMajor = 1;
const minimumBunMinor = 1;

interface CheckResult {
  label: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
}

const checkResults: CheckResult[] = [];

checkPlatform();
checkBunVersion();
checkRipgrep();
checkWindowsSdk();
checkDumpbin();
checkRepositoryLayout();
checkRepositoryInstall();

printReport();

const failureCount = checkResults.filter((result) => result.status === 'fail').length;
process.exit(failureCount === 0 ? 0 : 1);

function checkPlatform(): void {
  if (process.platform === 'win32') {
    checkResults.push({
      label: 'Platform',
      status: 'pass',
      detail: `${process.platform} (${process.arch})`,
    });
    return;
  }

  checkResults.push({
    label: 'Platform',
    status: 'fail',
    detail: `${process.platform} — Win32 DLLs can only be bound on Windows`,
  });
}

function checkBunVersion(): void {
  const bunVersionString = Bun.version;
  const versionMatch = bunVersionString.match(/^(\d+)\.(\d+)\.(\d+)/);

  if (!versionMatch) {
    checkResults.push({
      label: 'Bun version',
      status: 'warn',
      detail: `could not parse "${bunVersionString}"`,
    });
    return;
  }

  const majorVersion = Number(versionMatch[1]);
  const minorVersion = Number(versionMatch[2]);
  const meetsMinimum = majorVersion > minimumBunMajor || (majorVersion === minimumBunMajor && minorVersion >= minimumBunMinor);

  checkResults.push({
    label: 'Bun version',
    status: meetsMinimum ? 'pass' : 'fail',
    detail: meetsMinimum ? `${bunVersionString} (>= ${minimumBunMajor}.${minimumBunMinor}.0 required)` : `${bunVersionString} — upgrade to >= ${minimumBunMajor}.${minimumBunMinor}.0`,
  });
}

function checkRipgrep(): void {
  const candidateCommand = explicitRipgrepPath ?? 'rg';

  try {
    const ripgrepVersionOutput = execFileSync(candidateCommand, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const firstLine = ripgrepVersionOutput.split(/\r?\n/)[0] ?? '(unknown version)';
    checkResults.push({
      label: 'ripgrep (rg)',
      status: 'pass',
      detail: `${firstLine} — ${candidateCommand}`,
    });
  } catch {
    checkResults.push({
      label: 'ripgrep (rg)',
      status: 'fail',
      detail: explicitRipgrepPath ? `cannot execute ${explicitRipgrepPath}` : 'not on PATH — install ripgrep or pass --rg=<path> to catalog.ts / stub.ts',
    });
  }
}

function checkWindowsSdk(): void {
  const windowsSdkIncludeRoot = 'C:\\Program Files (x86)\\Windows Kits\\10\\Include';

  if (!existsSync(windowsSdkIncludeRoot)) {
    checkResults.push({
      label: 'Windows SDK headers',
      status: 'fail',
      detail: `${windowsSdkIncludeRoot} not found — install the Windows 10 SDK from Visual Studio Installer`,
    });
    return;
  }

  const sdkVersionDirectoryNames = readdirSync(windowsSdkIncludeRoot)
    .filter((entryName) => /^10\.\d+\.\d+\.\d+$/.test(entryName))
    .filter((entryName) => existsSync(join(windowsSdkIncludeRoot, entryName, 'um')))
    .sort();

  if (sdkVersionDirectoryNames.length === 0) {
    checkResults.push({
      label: 'Windows SDK headers',
      status: 'fail',
      detail: `no 10.*/um directories under ${windowsSdkIncludeRoot}`,
    });
    return;
  }

  const newestSdkVersion = sdkVersionDirectoryNames[sdkVersionDirectoryNames.length - 1]!;
  checkResults.push({
    label: 'Windows SDK headers',
    status: 'pass',
    detail: `${newestSdkVersion} (${sdkVersionDirectoryNames.length} SDK version${sdkVersionDirectoryNames.length === 1 ? '' : 's'} detected)`,
  });
}

function checkDumpbin(): void {
  const dumpbinPath = join(repositoryRoot, 'bin', 'dumpbin.exe');

  if (!existsSync(dumpbinPath)) {
    checkResults.push({
      label: 'bin/dumpbin.exe',
      status: 'fail',
      detail: `missing — required for catalog.ts exports extraction (${dumpbinPath})`,
    });
    return;
  }

  checkResults.push({
    label: 'bin/dumpbin.exe',
    status: 'pass',
    detail: dumpbinPath,
  });
}

function checkRepositoryLayout(): void {
  const requiredEntries = [
    join(repositoryRoot, 'packages', 'core'),
    join(repositoryRoot, 'packages', 'template'),
    join(repositoryRoot, 'scripts', 'scaffold.ts'),
    join(repositoryRoot, 'scripts', 'catalog.ts'),
    join(repositoryRoot, 'scripts', 'stub.ts'),
    join(repositoryRoot, 'scripts', 'ffi-runtime.ts'),
    join(repositoryRoot, 'scripts', 'audit.ts'),
  ];

  const missingEntries = requiredEntries.filter((entryPath) => !existsSync(entryPath));

  if (missingEntries.length > 0) {
    checkResults.push({
      label: 'Repository layout',
      status: 'fail',
      detail: `missing: ${missingEntries.map((entryPath) => entryPath.slice(repositoryRoot.length + 1)).join(', ')}`,
    });
    return;
  }

  checkResults.push({
    label: 'Repository layout',
    status: 'pass',
    detail: 'all required scripts and template present',
  });
}

function checkRepositoryInstall(): void {
  const nodeModulesPath = join(repositoryRoot, 'node_modules');

  if (!existsSync(nodeModulesPath) || !statSync(nodeModulesPath).isDirectory()) {
    checkResults.push({
      label: 'Root install',
      status: 'warn',
      detail: 'node_modules missing at repo root — run `bun install` from the repo root',
    });
    return;
  }

  checkResults.push({
    label: 'Root install',
    status: 'pass',
    detail: 'node_modules present at repo root',
  });
}

function printReport(): void {
  const maximumLabelWidth = checkResults.reduce((width, result) => Math.max(width, result.label.length), 0);
  const passCount = checkResults.filter((result) => result.status === 'pass').length;
  const warnCount = checkResults.filter((result) => result.status === 'warn').length;
  const failCount = checkResults.filter((result) => result.status === 'fail').length;

  console.log('┤ Environment Check ├──────────────────────────────────────────────\n');

  for (const result of checkResults) {
    const statusIcon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '~' : '✗';
    const paddedLabel = result.label.padEnd(maximumLabelWidth, ' ');
    console.log(`  ${statusIcon} ${paddedLabel}  ${result.detail}`);
  }

  console.log('');

  if (failCount === 0 && warnCount === 0) {
    console.log('  All systems go. Ready to run `bun run scripts/bootstrap.ts <dll-name>`.');
  } else if (failCount === 0) {
    console.log(`  ${passCount} passed, ${warnCount} warning(s). Safe to proceed, but review warnings.`);
  } else {
    console.log(`  ${passCount} passed, ${warnCount} warning(s), ${failCount} failed. Fix failures before scaffolding.`);
  }
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

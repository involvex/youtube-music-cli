#!/usr/bin/env bun
/**
 * ffi-runtime.ts — Probe Bun FFI return-value shapes.
 *
 * Writes to packages/{name}/.generation-log.md and stdout.
 *
 * Usage:
 *   bun run scripts/ffi-runtime.ts <dll-name> [--log]
 */

import { dlopen, FFIType } from 'bun:ffi';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repositoryRoot = join(import.meta.dir, '../..');
const packageDirectoryRoot = join(repositoryRoot, 'packages');

const argumentList = process.argv.slice(2);
const packageName = argumentList.find((argument) => !argument.startsWith('--')) ?? null;
const shouldWriteLog = argumentList.includes('--log');

const kernel32 = dlopen('kernel32.dll', {
  LocalFree: {
    args: [FFIType.u64],
    returns: FFIType.u64,
  },
  OpenProcess: {
    args: [FFIType.u32, FFIType.i32, FFIType.u32],
    returns: FFIType.u64,
  },
  Sleep: {
    args: [FFIType.u32],
    returns: FFIType.void,
  },
  VirtualAlloc: {
    args: [FFIType.ptr, FFIType.u64, FFIType.u32, FFIType.u32],
    returns: FFIType.ptr,
  },
});

const normaliz = dlopen('normaliz.dll', {
  NormalizeString: {
    args: [FFIType.u32, FFIType.ptr, FFIType.i32, FFIType.ptr, FFIType.i32],
    returns: FFIType.i32,
  },
});

const failedOpenProcessHandle = kernel32.symbols.OpenProcess(0x0010, 0, 0xffff_ffff);
const localFreeNullHandleResult = kernel32.symbols.LocalFree(0n);
const failedVirtualAllocPointer = kernel32.symbols.VirtualAlloc(null, 0n, 0x1000, 0x04);
const sleepReturnValue = kernel32.symbols.Sleep(0);

const normalizationInputBuffer = Buffer.from('e\u0301\0', 'utf16le');
const normalizationOutputBuffer = Buffer.alloc(256);
const normalizeStringResult = normaliz.symbols.NormalizeString(0x0000_0001, normalizationInputBuffer, -1, normalizationOutputBuffer, normalizationOutputBuffer.length / 2);
const normalizationOutputText = normalizationOutputBuffer.toString('utf16le').replace(/\0.*$/, '');

const reportText = `- Captured: \`${new Date().toISOString()}\`
- \`FFIType.u64\` null-on-failure: \`OpenProcess(0x0010, 0, 0xffff_ffff)\` returned \`${formatValue(failedOpenProcessHandle)}\`
- \`FFIType.u64\` null-handle success path: \`LocalFree(0n)\` returned \`${formatValue(localFreeNullHandleResult)}\`
- \`FFIType.ptr\` null-on-failure: \`VirtualAlloc(null, 0n, 0x1000, 0x04)\` returned \`${formatValue(failedVirtualAllocPointer)}\`
- \`FFIType.void\` return: \`Sleep(0)\` returned \`${formatValue(sleepReturnValue)}\`
- Forwarded export probe: \`normaliz.dll!NormalizeString\` returned \`${formatValue(normalizeStringResult)}\` and wrote \`${JSON.stringify(normalizationOutputText)}\``;

if (shouldWriteLog && packageName) {
  const generationLogPath = join(packageDirectoryRoot, packageName, '.generation-log.md');

  if (!existsSync(generationLogPath)) {
    console.error(`Generation log not found: ${generationLogPath}`);
    process.exit(1);
  }

  const existingGenerationLog = readFileSync(generationLogPath, 'utf8');
  const updatedGenerationLog = replaceSection(existingGenerationLog, 'RUNTIME-PROBES', reportText);
  writeFileSync(generationLogPath, updatedGenerationLog);

  console.log(`Wrote runtime probes to ${generationLogPath}`);
}

console.log(reportText);

function replaceSection(generationLog: string, sectionName: string, replacementText: string): string {
  const startMarker = `<!-- ${sectionName}:START -->`;
  const endMarker = `<!-- ${sectionName}:END -->`;
  const startIndex = generationLog.indexOf(startMarker);
  const endIndex = generationLog.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    return `${generationLog.trim()}\n\n## ${sectionName.replace(/-/g, ' ')}\n\n${replacementText}\n`;
  }

  const prefix = generationLog.slice(0, startIndex + startMarker.length);
  const suffix = generationLog.slice(endIndex);
  return `${prefix}\n${replacementText}\n${suffix}`;
}

function formatValue(value: bigint | number | string | null | undefined): string {
  if (typeof value === 'bigint') {
    return `${value}n`;
  }

  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  return String(value);
}

#!/usr/bin/env bun
/**
 * stub.ts — Emit ready-to-paste Symbols block and method stubs for a new package.
 *
 * Consumes the JSON output of `catalog.ts --json`, maps C types to FFI/TS
 * types, generates predictable MS Learn URLs, and prints paste-ready blocks
 * plus warnings.
 *
 * IMPORTANT: SAL-based nullability (`| NULL`) is a LOW-CONFIDENCE HINT ONLY.
 *   • If SAL says `_In_opt_` / `_Reserved_` → the parameter IS nullable.
 *   • If SAL is ABSENT → nullability is UNKNOWN. Verify against MS Learn.
 * A missing `_opt_` annotation does NOT prove a parameter is non-nullable.
 *
 * Usage:
 *   bun run scripts/stub.ts sensapi
 *   bun run scripts/stub.ts sensapi --class=Sensapi
 *   bun run scripts/stub.ts sensapi --rg=<path>    # forwarded to catalog.ts
 *   bun run scripts/stub.ts sensapi --dll=<path>   # forwarded to catalog.ts
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repositoryRoot = join(import.meta.dir, '../..');
const packageDirectoryRoot = join(repositoryRoot, 'packages');

// ── CORE types re-exported from @bun-win32/core ────────────────────────────

const CORE_TYPE_SET: ReadonlySet<string> = new Set([
  // number
  'ACCESS_MASK',
  'BOOL',
  'BOOLEAN',
  'BYTE',
  'CHAR',
  'DWORD',
  'HRESULT',
  'INT',
  'LONG',
  'SHORT',
  'UINT',
  'ULONG',
  'USHORT',
  'WCHAR',
  'WORD',
  // bigint
  'DWORD_PTR',
  'HANDLE',
  'HINSTANCE',
  'HMODULE',
  'HWND',
  'INT_PTR',
  'LONG_PTR',
  'SIZE_T',
  'UINT_PTR',
  'ULONG_PTR',
  // derived
  'LPARAM',
  'LRESULT',
  'WPARAM',
  // Pointer
  'LPBOOL',
  'LPBYTE',
  'LPCSTR',
  'LPCVOID',
  'LPCWSTR',
  'LPDWORD',
  'LPHANDLE',
  'LPSECURITY_ATTRIBUTES',
  'LPSTR',
  'LPVOID',
  'LPWSTR',
  'PBYTE',
  'PDWORD',
  'PHANDLE',
  'PULONG',
  'PVOID',
  // special
  'NULL',
  'VOID',
]);

const C_TYPE_TO_FFI: Record<string, string> = {
  HANDLE: 'FFIType.u64',
  HGLOBAL: 'FFIType.u64',
  HLOCAL: 'FFIType.u64',
  HMODULE: 'FFIType.u64',
  HINSTANCE: 'FFIType.u64',
  HWND: 'FFIType.u64',
  HDC: 'FFIType.u64',
  HKEY: 'FFIType.u64',
  HICON: 'FFIType.u64',
  HCURSOR: 'FFIType.u64',
  HMENU: 'FFIType.u64',
  HBRUSH: 'FFIType.u64',
  HPEN: 'FFIType.u64',
  HFONT: 'FFIType.u64',
  HRGN: 'FFIType.u64',
  HBITMAP: 'FFIType.u64',
  HPALETTE: 'FFIType.u64',
  HDESK: 'FFIType.u64',
  HWINSTA: 'FFIType.u64',
  HHOOK: 'FFIType.u64',
  HDWP: 'FFIType.u64',
  HMONITOR: 'FFIType.u64',
  HACCEL: 'FFIType.u64',
  HPCON: 'FFIType.u64',
  HRSRC: 'FFIType.u64',
  HCRYPTHASH: 'FFIType.u64',
  HCRYPTKEY: 'FFIType.u64',
  HCRYPTPROV: 'FFIType.u64',
  HUSKEY: 'FFIType.u64',
  HGLRC: 'FFIType.u64',
  SC_HANDLE: 'FFIType.u64',
  HCERTSTORE: 'FFIType.u64',
  PCCERT_CONTEXT: 'FFIType.u64',
  WINUSB_INTERFACE_HANDLE: 'FFIType.u64',
  WINUSB_ISOCH_BUFFER_HANDLE: 'FFIType.u64',
  SIZE_T: 'FFIType.u64',
  DWORD_PTR: 'FFIType.u64',
  UINT_PTR: 'FFIType.u64',
  ULONG_PTR: 'FFIType.u64',
  ULONGLONG: 'FFIType.u64',
  DWORDLONG: 'FFIType.u64',
  LARGE_INTEGER: 'FFIType.i64',
  ULARGE_INTEGER: 'FFIType.u64',
  INT_PTR: 'FFIType.i64',
  LONG_PTR: 'FFIType.i64',
  LRESULT: 'FFIType.i64',
  LPARAM: 'FFIType.i64',
  WPARAM: 'FFIType.u64',
  DWORD: 'FFIType.u32',
  UINT: 'FFIType.u32',
  ULONG: 'FFIType.u32',
  COLORREF: 'FFIType.u32',
  ACCESS_MASK: 'FFIType.u32',
  HRESULT: 'FFIType.i32',
  BOOL: 'FFIType.i32',
  INT: 'FFIType.i32',
  LONG: 'FFIType.i32',
  WORD: 'FFIType.u16',
  USHORT: 'FFIType.u16',
  ATOM: 'FFIType.u16',
  SHORT: 'FFIType.i16',
  BYTE: 'FFIType.u8',
  BOOLEAN: 'FFIType.u8',
  CHAR: 'FFIType.u8',
  UCHAR: 'FFIType.u8',
  PUCHAR: 'FFIType.ptr',
  LPOVERLAPPED: 'FFIType.ptr',
  LPVOID: 'FFIType.ptr',
  LPCVOID: 'FFIType.ptr',
  LPCWSTR: 'FFIType.ptr',
  LPCSTR: 'FFIType.ptr',
  LPWSTR: 'FFIType.ptr',
  LPSTR: 'FFIType.ptr',
  LPBYTE: 'FFIType.ptr',
  LPBOOL: 'FFIType.ptr',
  LPDWORD: 'FFIType.ptr',
  LPHANDLE: 'FFIType.ptr',
  LPSECURITY_ATTRIBUTES: 'FFIType.ptr',
  PVOID: 'FFIType.ptr',
  PBYTE: 'FFIType.ptr',
  PDWORD: 'FFIType.ptr',
  PHANDLE: 'FFIType.ptr',
  PULONG: 'FFIType.ptr',
  VOID: 'FFIType.void',
  void: 'FFIType.void',
};

const C_TYPE_TO_TS: Record<string, string> = {
  HANDLE: 'HANDLE',
  HGLOBAL: 'HGLOBAL',
  HLOCAL: 'HLOCAL',
  HMODULE: 'HMODULE',
  HINSTANCE: 'HINSTANCE',
  HWND: 'HWND',
  HDC: 'HDC',
  HKEY: 'HKEY',
  HICON: 'HICON',
  HCURSOR: 'HCURSOR',
  HMENU: 'HMENU',
  HBRUSH: 'HBRUSH',
  HPEN: 'HPEN',
  HFONT: 'HFONT',
  HRGN: 'HRGN',
  HBITMAP: 'HBITMAP',
  HPALETTE: 'HPALETTE',
  HDESK: 'HDESK',
  HWINSTA: 'HWINSTA',
  HHOOK: 'HHOOK',
  HDWP: 'HDWP',
  HMONITOR: 'HMONITOR',
  HACCEL: 'HACCEL',
  HPCON: 'HPCON',
  HRSRC: 'HRSRC',
  HCRYPTHASH: 'HCRYPTHASH',
  HCRYPTKEY: 'HCRYPTKEY',
  HCRYPTPROV: 'HCRYPTPROV',
  HUSKEY: 'HUSKEY',
  HGLRC: 'HGLRC',
  SC_HANDLE: 'SC_HANDLE',
  HCERTSTORE: 'HCERTSTORE',
  PCCERT_CONTEXT: 'PCCERT_CONTEXT',
  SIZE_T: 'SIZE_T',
  DWORD_PTR: 'DWORD_PTR',
  UINT_PTR: 'UINT_PTR',
  ULONG_PTR: 'ULONG_PTR',
  INT_PTR: 'INT_PTR',
  LONG_PTR: 'LONG_PTR',
  ULONGLONG: 'ULONGLONG',
  DWORDLONG: 'DWORDLONG',
  LARGE_INTEGER: 'LARGE_INTEGER',
  ULARGE_INTEGER: 'ULARGE_INTEGER',
  LRESULT: 'LRESULT',
  LPARAM: 'LPARAM',
  WPARAM: 'WPARAM',
  DWORD: 'DWORD',
  UINT: 'UINT',
  ULONG: 'ULONG',
  HRESULT: 'HRESULT',
  BOOL: 'BOOL',
  INT: 'INT',
  LONG: 'LONG',
  WORD: 'WORD',
  USHORT: 'USHORT',
  SHORT: 'SHORT',
  ATOM: 'WORD',
  BYTE: 'BYTE',
  BOOLEAN: 'BOOLEAN',
  CHAR: 'CHAR',
  ACCESS_MASK: 'ACCESS_MASK',
  COLORREF: 'COLORREF',
  UCHAR: 'BYTE',
  VOID: 'void',
  void: 'void',
  LPVOID: 'LPVOID',
  LPCVOID: 'LPCVOID',
  LPCWSTR: 'LPCWSTR',
  LPCSTR: 'LPCSTR',
  LPWSTR: 'LPWSTR',
  LPSTR: 'LPSTR',
  PVOID: 'PVOID',
  LPBYTE: 'LPBYTE',
  LPBOOL: 'LPBOOL',
  LPDWORD: 'LPDWORD',
  LPHANDLE: 'LPHANDLE',
  LPSECURITY_ATTRIBUTES: 'LPSECURITY_ATTRIBUTES',
  PBYTE: 'PBYTE',
  PDWORD: 'PDWORD',
  PHANDLE: 'PHANDLE',
  PULONG: 'PULONG',
  PUCHAR: 'LPBYTE',
  LPOVERLAPPED: 'LPOVERLAPPED',
};

// ── CLI ────────────────────────────────────────────────────────────────────

const argumentList = process.argv.slice(2);
const packageName = argumentList.find((argument) => !argument.startsWith('--'));
const classNameOverride = argumentList.find((argument) => argument.startsWith('--class='))?.slice('--class='.length);
const shouldWriteLog = argumentList.includes('--log');
const forwardedArgs = argumentList.filter((argument) => argument.startsWith('--rg=') || argument.startsWith('--dll='));

if (!packageName) {
  console.error('Usage: bun run scripts/stub.ts <package-name> [--class=<ClassName>] [--log] [--rg=<path>] [--dll=<path>]');
  process.exit(1);
}

function toClassName(name: string): string {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment, index) => (index === 0 ? segment.charAt(0).toUpperCase() + segment.slice(1) : segment.charAt(0).toUpperCase() + segment.slice(1)))
    .join('');
}

const className = classNameOverride ?? toClassName(packageName);

// ── Invoke catalog.ts --json ───────────────────────────────────────────────

const catalogScriptPath = join(repositoryRoot, 'scripts', 'catalog.ts');

let catalogJson: string;
try {
  catalogJson = execFileSync(process.execPath, [catalogScriptPath, packageName, '--json', ...forwardedArgs], {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
} catch (error) {
  console.error(`Failed to run catalog.ts for '${packageName}':`);
  console.error((error as Error).message);
  process.exit(1);
}

interface CatalogParameter {
  isNullable: boolean;
  name: string;
  type: string;
}

interface CatalogExport {
  forwardedTo: string | null;
  headerName: string | null;
  name: string;
  ordinal: number;
  parameters: CatalogParameter[];
  prototypeText: string | null;
  returnType: string | null;
}

interface CatalogPayload {
  capturedAt: string;
  dllPath: string;
  exports: CatalogExport[];
  packageName: string;
  sdkIncludeRootPath: string;
}

let payload: CatalogPayload;
try {
  payload = JSON.parse(catalogJson);
} catch {
  console.error('catalog.ts --json returned invalid JSON:');
  console.error(catalogJson.slice(0, 2000));
  process.exit(1);
}

// ── Type resolver ──────────────────────────────────────────────────────────

type TypeClassification = 'core' | 'known-outside-core' | 'inferred-pointer' | 'unknown';

interface ResolvedType {
  classification: TypeClassification;
  ffiType: string;
  originalCType: string;
  tsType: string;
}

function resolveType(cType: string): ResolvedType {
  const originalCType = cType;
  const normalized = cType.trim();

  if (normalized === '') {
    return {
      classification: 'unknown',
      ffiType: 'FFIType.u64',
      originalCType,
      tsType: 'unknown',
    };
  }

  if (normalized.endsWith('*')) {
    const base = normalized.slice(0, -1).trim();
    const lpCandidate = `LP${base}`;
    const pCandidate = `P${base}`;

    if (CORE_TYPE_SET.has(lpCandidate)) {
      return {
        classification: 'core',
        ffiType: 'FFIType.ptr',
        originalCType,
        tsType: lpCandidate,
      };
    }
    if (C_TYPE_TO_TS[lpCandidate]) {
      const tsName = C_TYPE_TO_TS[lpCandidate];
      return {
        classification: CORE_TYPE_SET.has(tsName) ? 'core' : 'known-outside-core',
        ffiType: 'FFIType.ptr',
        originalCType,
        tsType: tsName,
      };
    }
    if (CORE_TYPE_SET.has(pCandidate)) {
      return {
        classification: 'core',
        ffiType: 'FFIType.ptr',
        originalCType,
        tsType: pCandidate,
      };
    }
    return {
      classification: 'unknown',
      ffiType: 'FFIType.ptr',
      originalCType,
      tsType: lpCandidate,
    };
  }

  if (CORE_TYPE_SET.has(normalized)) {
    const ffi = C_TYPE_TO_FFI[normalized] ?? 'FFIType.u64';
    return {
      classification: 'core',
      ffiType: ffi,
      originalCType,
      tsType: normalized,
    };
  }
  if (C_TYPE_TO_TS[normalized]) {
    const tsName = C_TYPE_TO_TS[normalized];
    const ffi = C_TYPE_TO_FFI[normalized] ?? 'FFIType.u64';
    return {
      classification: CORE_TYPE_SET.has(tsName) ? 'core' : 'known-outside-core',
      ffiType: ffi,
      originalCType,
      tsType: tsName,
    };
  }

  if (/^(LP|P)[A-Z]/.test(normalized)) {
    return {
      classification: 'inferred-pointer',
      ffiType: 'FFIType.ptr',
      originalCType,
      tsType: normalized,
    };
  }

  return {
    classification: 'unknown',
    ffiType: 'FFIType.u64',
    originalCType,
    tsType: normalized,
  };
}

function tsUnderlyingForFfi(ffiType: string): string {
  if (ffiType === 'FFIType.ptr') return 'Pointer';
  if (ffiType === 'FFIType.u64' || ffiType === 'FFIType.i64') return 'bigint';
  if (ffiType === 'FFIType.void') return 'void';
  return 'number';
}

// ── Process exports ────────────────────────────────────────────────────────

interface GeneratedParam {
  isSalNullable: boolean;
  name: string;
  resolved: ResolvedType;
}

interface GeneratedExport {
  headerName: string | null;
  msLearnUrl: string | null;
  name: string;
  params: GeneratedParam[];
  resolvedReturn: ResolvedType;
}

const generated: GeneratedExport[] = [];
const missingPrototypes: string[] = [];
const forwardedExports: { forwardedTo: string; name: string }[] = [];
const coreTypeImports = new Set<string>();
const knownOutsideCoreTypes = new Map<string, Set<string>>();
const inferredPointerTypes = new Map<string, Set<string>>();
const unknownTypes = new Map<string, Set<string>>();

function buildMsLearnUrl(headerName: string | null, functionName: string): string | null {
  if (!headerName) return null;
  const stem = headerName.replace(/\.h$/i, '').toLowerCase();
  return `https://learn.microsoft.com/en-us/windows/win32/api/${stem}/nf-${stem}-${functionName.toLowerCase()}`;
}

function trackType(resolved: ResolvedType, exportName: string): void {
  if (resolved.tsType === 'void') return;
  switch (resolved.classification) {
    case 'core':
      coreTypeImports.add(resolved.tsType);
      break;
    case 'known-outside-core':
      if (!knownOutsideCoreTypes.has(resolved.tsType)) knownOutsideCoreTypes.set(resolved.tsType, new Set());
      knownOutsideCoreTypes.get(resolved.tsType)!.add(exportName);
      break;
    case 'inferred-pointer':
      if (!inferredPointerTypes.has(resolved.tsType)) inferredPointerTypes.set(resolved.tsType, new Set());
      inferredPointerTypes.get(resolved.tsType)!.add(exportName);
      break;
    case 'unknown':
      if (!unknownTypes.has(resolved.tsType)) unknownTypes.set(resolved.tsType, new Set());
      unknownTypes.get(resolved.tsType)!.add(exportName);
      break;
  }
}

for (const exportEntry of payload.exports) {
  if (exportEntry.forwardedTo !== null) {
    forwardedExports.push({
      forwardedTo: exportEntry.forwardedTo,
      name: exportEntry.name,
    });
    continue;
  }

  if (!exportEntry.prototypeText || !exportEntry.returnType) {
    missingPrototypes.push(exportEntry.name);
    continue;
  }

  const resolvedReturn = resolveType(exportEntry.returnType);
  trackType(resolvedReturn, exportEntry.name);

  const params: GeneratedParam[] = [];
  let anyParamNullable = false;
  for (const parameter of exportEntry.parameters) {
    const resolved = resolveType(parameter.type);
    trackType(resolved, exportEntry.name);
    params.push({
      isSalNullable: parameter.isNullable,
      name: parameter.name,
      resolved,
    });
    if (parameter.isNullable) anyParamNullable = true;
  }
  if (anyParamNullable) coreTypeImports.add('NULL');

  generated.push({
    headerName: exportEntry.headerName,
    msLearnUrl: buildMsLearnUrl(exportEntry.headerName, exportEntry.name),
    name: exportEntry.name,
    params,
    resolvedReturn,
  });
}

generated.sort((a, b) => a.name.localeCompare(b.name));

const salStats = { withOpt: 0, withoutOpt: 0 };
for (const exp of generated) {
  for (const p of exp.params) {
    if (p.isSalNullable) salStats.withOpt += 1;
    else salStats.withoutOpt += 1;
  }
}
const salCompletelyAbsent = salStats.withOpt === 0 && salStats.withoutOpt > 0;

// ── Emit output ────────────────────────────────────────────────────────────

const out: string[] = [];
const hr = '─'.repeat(72);
const section = (label: string): string => {
  const title = `┤ ${label} ├`;
  return `${title}${'─'.repeat(Math.max(0, 72 - title.length))}`;
};

out.push(hr);
out.push(`stub.ts  —  ${packageName}  (class ${className})`);
out.push(hr);
out.push('');
out.push(`  DLL path:     ${payload.dllPath}`);
out.push(`  Header seen:  ${generated.find((exp) => exp.headerName)?.headerName ?? '(none — prototype lookup failed)'}`);
out.push(`  Totals:       ${payload.exports.length} exports, ${generated.length} bindable, ${forwardedExports.length} forwarded, ${missingPrototypes.length} missing prototype`);
out.push('');

out.push(section(`Imports for structs/${className}.ts`));
out.push('');
out.push(`  import { type FFIFunction, FFIType } from 'bun:ffi';`);
out.push('');
out.push(`  import { Win32 } from '@bun-win32/core';`);
out.push('');

const structImportNames = new Set<string>();
for (const name of coreTypeImports) structImportNames.add(name);
for (const name of knownOutsideCoreTypes.keys()) structImportNames.add(name);
for (const name of inferredPointerTypes.keys()) structImportNames.add(name);
for (const name of unknownTypes.keys()) structImportNames.add(name);

const sortedStructImports = [...structImportNames].sort();
if (sortedStructImports.length > 0) {
  out.push(`  import type { ${sortedStructImports.join(', ')} } from '../types/${className}';`);
  out.push('');
}

out.push(section(`Suggested types/${className}.ts`));
out.push('');

const needsPointerImport = inferredPointerTypes.size > 0 || unknownTypes.size > 0 || [...knownOutsideCoreTypes.keys()].some((name) => tsUnderlyingForFfi(C_TYPE_TO_FFI[name] ?? '') === 'Pointer');
if (needsPointerImport) {
  out.push(`  import type { Pointer } from 'bun:ffi';`);
  out.push('');
}

const reExports = [...coreTypeImports].sort();
if (reExports.length > 0) {
  out.push(`  export type { ${reExports.join(', ')} } from '@bun-win32/core';`);
  out.push('');
}

if (knownOutsideCoreTypes.size > 0) {
  out.push(`  // Known Win32 types not re-exported from core — define locally:`);
  for (const tsName of [...knownOutsideCoreTypes.keys()].sort()) {
    const sourceCType = Object.keys(C_TYPE_TO_TS).find((ctype) => C_TYPE_TO_TS[ctype] === tsName) ?? tsName;
    const ffi = C_TYPE_TO_FFI[sourceCType] ?? 'FFIType.u64';
    out.push(`  export type ${tsName} = ${tsUnderlyingForFfi(ffi)};`);
  }
  out.push('');
}

if (inferredPointerTypes.size > 0) {
  out.push(`  // Inferred pointer types (LP*/P* prefix) — confirm against headers:`);
  for (const tsName of [...inferredPointerTypes.keys()].sort()) {
    out.push(`  export type ${tsName} = Pointer;`);
  }
  out.push('');
}

if (unknownTypes.size > 0) {
  out.push(`  // ⚠ UNKNOWN C types — placeholders, VERIFY against MS Learn & headers:`);
  for (const tsName of [...unknownTypes.keys()].sort()) {
    const usedBy = [...unknownTypes.get(tsName)!].sort().join(', ');
    out.push(`  export type ${tsName} = bigint; // TODO verify — used by: ${usedBy}`);
  }
  out.push('');
}

out.push(section('Symbols block (alphabetized)'));
out.push('');
out.push(`  protected static override name = '${packageName}.dll';`);
out.push('');
out.push('  /** @inheritdoc */');
out.push('  protected static override readonly Symbols = {');
for (const exp of generated) {
  const argList = exp.params.map((p) => p.resolved.ffiType).join(', ');
  out.push(`    ${exp.name}: { args: [${argList}], returns: ${exp.resolvedReturn.ffiType} },`);
}
out.push('  } as const satisfies Record<string, FFIFunction>;');
out.push('');

out.push(section('Method stubs (alphabetized)'));
out.push('');
for (const exp of generated) {
  if (exp.msLearnUrl) out.push(`  // ${exp.msLearnUrl}`);
  const paramList = exp.params
    .map((p) => {
      const nullable = p.isSalNullable ? ' | NULL' : '';
      return `${p.name}: ${p.resolved.tsType}${nullable}`;
    })
    .join(', ');
  const callArgs = exp.params.map((p) => p.name).join(', ');
  out.push(`  public static ${exp.name}(${paramList}): ${exp.resolvedReturn.tsType} {`);
  out.push(`    return ${className}.Load('${exp.name}')(${callArgs});`);
  out.push('  }');
  out.push('');
}

out.push(section('Warnings & non-negotiable follow-up'));
out.push('');

if (forwardedExports.length > 0) {
  out.push(`  ⚠ ${forwardedExports.length} forwarded export(s) skipped (audit manually):`);
  for (const fwd of forwardedExports) out.push(`    • ${fwd.name}  →  ${fwd.forwardedTo}`);
  out.push('    → Forwarded exports still work, but their prototypes live in the target DLL.');
  out.push('    → Bind manually after probing with ffi-runtime.ts.');
  out.push('');
}

if (missingPrototypes.length > 0) {
  out.push(`  ⚠ ${missingPrototypes.length} export(s) had no prototype in SDK headers:`);
  for (const name of missingPrototypes.slice(0, 20)) out.push(`    • ${name}`);
  if (missingPrototypes.length > 20) out.push(`    … ${missingPrototypes.length - 20} more`);
  out.push('    → Cross-check MS Learn; undocumented exports may be internal and unsafe to bind.');
  out.push('');
}

if (salCompletelyAbsent) {
  out.push("  ⚠ SAL annotations are ABSENT from this package's header.");
  out.push('    Absence of `_opt_` does NOT mean a parameter is non-nullable.');
  out.push('    → You MUST verify nullability against MS Learn for EVERY parameter.');
  out.push('');
} else if (salStats.withOpt > 0) {
  out.push(`  ⚠ SAL hints applied — ${salStats.withOpt} nullable / ${salStats.withoutOpt} non-nullable (per SAL only).`);
  out.push('    SAL is a HINT, not a contract. Always cross-check MS Learn before shipping.');
  out.push('');
}

if (knownOutsideCoreTypes.size > 0) {
  out.push(`  ℹ ${knownOutsideCoreTypes.size} type(s) need local alias in types/${className}.ts`);
  out.push('    (stubbed above per the FFI mapping). These are well-known Win32 names.');
  out.push('');
}

if (inferredPointerTypes.size > 0) {
  out.push(`  ⚠ ${inferredPointerTypes.size} type(s) were INFERRED to be pointers from LP*/P* prefix:`);
  for (const name of [...inferredPointerTypes.keys()].sort()) {
    out.push(`    • ${name}  (used by: ${[...inferredPointerTypes.get(name)!].sort().join(', ')})`);
  }
  out.push('    → Confirm by reading the header typedef before shipping.');
  out.push('');
}

if (unknownTypes.size > 0) {
  out.push(`  ⚠ ${unknownTypes.size} UNKNOWN C type(s) — all defaulted to bigint (assumed handle):`);
  for (const name of [...unknownTypes.keys()].sort()) {
    out.push(`    • ${name}  (used by: ${[...unknownTypes.get(name)!].sort().join(', ')})`);
  }
  out.push('    → Each is a TODO. Read the SDK header, decide the size, fix the FFI type.');
  out.push('');
}

out.push(`  NON-NEGOTIABLE follow-up:`);
out.push(`    1. Cross-check every parameter nullability on MS Learn.`);
out.push(`    2. Resolve every TODO/inferred/unknown type to a concrete FFI type.`);
out.push(`    3. Run  bun run scripts/audit.ts ${packageName}  after writing structs.`);
out.push(`    4. Run  bun --cwd packages/${packageName} run tsc --noEmit  to validate types.`);
out.push(`    5. Build at least one working example that exercises the binding.`);
out.push('');

const reportText = out.join('\n');

if (shouldWriteLog) {
  const generationLogPath = join(packageDirectoryRoot, packageName, '.generation-log.md');

  if (!existsSync(generationLogPath)) {
    console.error(`Generation log not found: ${generationLogPath}`);
    process.exit(1);
  }

  const existingGenerationLog = readFileSync(generationLogPath, 'utf8');
  const updatedGenerationLog = replaceLogSection(existingGenerationLog, 'STUB-SCAFFOLD', '```text\n' + reportText.trim() + '\n```');
  writeFileSync(generationLogPath, updatedGenerationLog);

  console.log(`Wrote stub scaffold to ${generationLogPath}`);
}

console.log(reportText);

function replaceLogSection(generationLog: string, sectionName: string, replacementText: string): string {
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

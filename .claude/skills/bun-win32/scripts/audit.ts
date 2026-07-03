#!/usr/bin/env bun
/**
 * audit.ts — FFI Binding Type Consistency Auditor
 *
 * Cross-references three sources to find type mismatches:
 *   1. FFI symbol declarations (FFIType in Symbols)
 *   2. TypeScript method signatures (parameter & return types)
 *   3. Windows SDK headers (C prototypes, when available)
 *
 * Usage:
 *   bun run scripts/audit.ts kernel32          # audit one package
 *   bun run scripts/audit.ts --all             # audit every package
 *   bun run scripts/audit.ts kernel32 --fix    # emit fix suggestions
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync, execSync } from 'child_process';

const ROOT = join(import.meta.dir, '../..');
const PACKAGES = join(ROOT, 'packages');
const SDK_INCLUDE = resolveWindowsSdkIncludeDirectory();
const RIPGREP_PATH = resolveRipgrepPath();

function resolveRipgrepPath(): string {
  const explicitArg = process.argv.find((argument) => argument.startsWith('--rg='));
  if (explicitArg) return explicitArg.slice('--rg='.length);

  const candidates = [
    'rg',
    join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Links', 'rg.exe'),
    join(process.env.ProgramData ?? '', 'chocolatey', 'bin', 'rg.exe'),
    join(process.env.USERPROFILE ?? '', 'scoop', 'shims', 'rg.exe'),
    'C:\\Program Files\\Git\\usr\\bin\\rg.exe',
  ];

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      return candidate;
    } catch {
      continue;
    }
  }

  console.error('WARNING: ripgrep (rg) not found. SDK header cross-checks will be skipped.');
  console.error('  Install: winget install BurntSushi.ripgrep.MSVC   or pass --rg=<path-to-rg.exe>');
  return '';
}

function resolveWindowsSdkIncludeDirectory(): string {
  const sdkIncludeRoot = 'C:/Program Files (x86)/Windows Kits/10/Include';

  if (!existsSync(sdkIncludeRoot)) {
    return join(sdkIncludeRoot, '10.0.22000.0', 'um');
  }

  const versionDirectoryNames = readdirSync(sdkIncludeRoot).filter((directoryName) => /^\d+\.\d+\.\d+\.\d+$/.test(directoryName));
  versionDirectoryNames.sort(compareWindowsSdkVersionsDescending);

  for (const versionDirectoryName of versionDirectoryNames) {
    const candidateDirectory = join(sdkIncludeRoot, versionDirectoryName, 'um');

    if (existsSync(candidateDirectory)) {
      return candidateDirectory;
    }
  }

  return join(sdkIncludeRoot, '10.0.22000.0', 'um');
}

function compareWindowsSdkVersionsDescending(leftVersion: string, rightVersion: string): number {
  const leftParts = leftVersion.split('.').map(Number);
  const rightParts = rightVersion.split('.').map(Number);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index++) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return rightPart - leftPart;
    }
  }

  return 0;
}

// ── FFI type → expected JS runtime type ────────────────────────────────────

const FFI_TO_JS: Record<string, string> = {
  'FFIType.u64': 'bigint',
  'FFIType.i64': 'bigint',
  'FFIType.ptr': 'Pointer',
  'FFIType.u32': 'number',
  'FFIType.i32': 'number',
  'FFIType.u16': 'number',
  'FFIType.i16': 'number',
  'FFIType.u8': 'number',
  'FFIType.i8': 'number',
  'FFIType.f32': 'number',
  'FFIType.f64': 'number',
  'FFIType.void': 'void',
};

// ── Core type aliases → JS type ────────────────────────────────────────────

const CORE_TYPES: Record<string, string> = {
  // number
  ACCESS_MASK: 'number',
  BOOL: 'number',
  BOOLEAN: 'number',
  BYTE: 'number',
  CHAR: 'number',
  DWORD: 'number',
  HRESULT: 'number',
  INT: 'number',
  LONG: 'number',
  SHORT: 'number',
  UINT: 'number',
  ULONG: 'number',
  USHORT: 'number',
  WCHAR: 'number',
  WORD: 'number',
  // bigint
  DWORD_PTR: 'bigint',
  HANDLE: 'bigint',
  HINSTANCE: 'bigint',
  HMODULE: 'bigint',
  HWND: 'bigint',
  INT_PTR: 'bigint',
  LONG_PTR: 'bigint',
  SIZE_T: 'bigint',
  UINT_PTR: 'bigint',
  ULONG_PTR: 'bigint',
  LPARAM: 'bigint',
  LRESULT: 'bigint',
  WPARAM: 'bigint',
  // Pointer
  LPBOOL: 'Pointer',
  LPBYTE: 'Pointer',
  LPCSTR: 'Pointer',
  LPCVOID: 'Pointer',
  LPCWSTR: 'Pointer',
  LPDWORD: 'Pointer',
  LPHANDLE: 'Pointer',
  LPSECURITY_ATTRIBUTES: 'Pointer',
  LPSTR: 'Pointer',
  LPVOID: 'Pointer',
  LPWSTR: 'Pointer',
  PBYTE: 'Pointer',
  PDWORD: 'Pointer',
  PHANDLE: 'Pointer',
  PULONG: 'Pointer',
  PVOID: 'Pointer',
  Pointer: 'Pointer',
  // Special
  NULL: 'null',
  VOID: 'void',
  void: 'void',
};

// ── C type → expected FFI type (for SDK header cross-check) ────────────────

const C_TYPE_TO_FFI: Record<string, string> = {
  // Handles → u64
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
  HRASCONN: 'FFIType.u64',
  HCERTSTORE: 'FFIType.u64',
  PCCERT_CONTEXT: 'FFIType.u64',
  WINUSB_INTERFACE_HANDLE: 'FFIType.u64',
  WINUSB_ISOCH_BUFFER_HANDLE: 'FFIType.u64',
  // 64-bit integers → u64
  SIZE_T: 'FFIType.u64',
  DWORD_PTR: 'FFIType.u64',
  UINT_PTR: 'FFIType.u64',
  ULONG_PTR: 'FFIType.u64',
  ULONGLONG: 'FFIType.u64',
  DWORDLONG: 'FFIType.u64',
  LARGE_INTEGER: 'FFIType.i64',
  ULARGE_INTEGER: 'FFIType.u64',
  // Signed 64-bit
  INT_PTR: 'FFIType.i64',
  LONG_PTR: 'FFIType.i64',
  LRESULT: 'FFIType.i64',
  LPARAM: 'FFIType.i64',
  WPARAM: 'FFIType.u64',
  // 32-bit unsigned → u32
  DWORD: 'FFIType.u32',
  UINT: 'FFIType.u32',
  ULONG: 'FFIType.u32',
  COLORREF: 'FFIType.u32',
  ACCESS_MASK: 'FFIType.u32',
  HRESULT: 'FFIType.i32',
  // 32-bit signed → i32
  BOOL: 'FFIType.i32',
  INT: 'FFIType.i32',
  LONG: 'FFIType.i32',
  // 16-bit → u16
  WORD: 'FFIType.u16',
  USHORT: 'FFIType.u16',
  ATOM: 'FFIType.u16',
  SHORT: 'FFIType.i16',
  // 8-bit
  BYTE: 'FFIType.u8',
  BOOLEAN: 'FFIType.u8',
  CHAR: 'FFIType.u8',
  UCHAR: 'FFIType.u8',
  // By-value structs → u64
  WINUSB_SETUP_PACKET: 'FFIType.u64',
  // Pointer types
  PUCHAR: 'FFIType.ptr',
  PWINUSB_INTERFACE_HANDLE: 'FFIType.ptr',
  PWINUSB_ISOCH_BUFFER_HANDLE: 'FFIType.ptr',
  PUSB_CONFIGURATION_DESCRIPTOR: 'FFIType.ptr',
  PUSB_INTERFACE_DESCRIPTOR: 'FFIType.ptr',
  PUSB_COMMON_DESCRIPTOR: 'FFIType.ptr',
  PWINUSB_PIPE_INFORMATION: 'FFIType.ptr',
  PWINUSB_PIPE_INFORMATION_EX: 'FFIType.ptr',
  PUSBD_ISO_PACKET_DESCRIPTOR: 'FFIType.ptr',
  LPOVERLAPPED: 'FFIType.ptr',
  // gdiplus opaque object pointers — treated as u64 handles by convention
  'GpAdjustableArrowCap*': 'FFIType.u64',
  'GpBitmap*': 'FFIType.u64',
  'GpBrush*': 'FFIType.u64',
  'GpCachedBitmap*': 'FFIType.u64',
  'GpCustomLineCap*': 'FFIType.u64',
  'GpEffect*': 'FFIType.u64',
  'CGpEffect*': 'FFIType.u64',
  'GpFont*': 'FFIType.u64',
  'GpFontCollection*': 'FFIType.u64',
  'GpFontFamily*': 'FFIType.u64',
  'GpGraphics*': 'FFIType.u64',
  'GpHatch*': 'FFIType.u64',
  'GpImage*': 'FFIType.u64',
  'GpImageAttributes*': 'FFIType.u64',
  'GpLineGradient*': 'FFIType.u64',
  'GpMatrix*': 'FFIType.u64',
  'GpMetafile*': 'FFIType.u64',
  'GpPath*': 'FFIType.u64',
  'GpPathGradient*': 'FFIType.u64',
  'GpPathIterator*': 'FFIType.u64',
  'GpPen*': 'FFIType.u64',
  'GpRegion*': 'FFIType.u64',
  'GpSolidFill*': 'FFIType.u64',
  'GpStringFormat*': 'FFIType.u64',
  'GpTexture*': 'FFIType.u64',
  'IStream*': 'FFIType.u64',
  // oleacc (MSAA) COM interface pointers — opaque tokens, treated as u64 handles by convention
  'IAccessible*': 'FFIType.u64',
  // activeds (ADSI) COM interface pointers — opaque tokens, treated as u64 handles by convention
  'IADsContainer*': 'FFIType.u64',
  'IEnumVARIANT*': 'FFIType.u64',
  // wldap32 opaque handle pointers — treated as u64 handles by convention
  'LDAP*': 'FFIType.u64',
  'LDAPMessage*': 'FFIType.u64',
  'BerElement*': 'FFIType.u64',
  PLDAPSearch: 'FFIType.u64',
  // windowscodecs (WIC) COM interface pointers — opaque tokens, treated as u64 handles by convention
  'IWICImagingFactory*': 'FFIType.u64',
  'IWICBitmap*': 'FFIType.u64',
  'IWICBitmapClipper*': 'FFIType.u64',
  'IWICBitmapCodecInfo*': 'FFIType.u64',
  'IWICBitmapDecoder*': 'FFIType.u64',
  'IWICBitmapEncoder*': 'FFIType.u64',
  'IWICBitmapFlipRotator*': 'FFIType.u64',
  'IWICBitmapFrameDecode*': 'FFIType.u64',
  'IWICBitmapFrameEncode*': 'FFIType.u64',
  'IWICBitmapLock*': 'FFIType.u64',
  'IWICBitmapScaler*': 'FFIType.u64',
  'IWICBitmapSource*': 'FFIType.u64',
  'IWICColorContext*': 'FFIType.u64',
  'IWICComponentFactory*': 'FFIType.u64',
  'IWICComponentInfo*': 'FFIType.u64',
  'IWICFastMetadataEncoder*': 'FFIType.u64',
  'IWICFormatConverter*': 'FFIType.u64',
  'IWICMetadataBlockReader*': 'FFIType.u64',
  'IWICMetadataBlockWriter*': 'FFIType.u64',
  'IWICMetadataQueryReader*': 'FFIType.u64',
  'IWICMetadataQueryWriter*': 'FFIType.u64',
  'IWICMetadataReader*': 'FFIType.u64',
  'IWICMetadataWriter*': 'FFIType.u64',
  'IWICPalette*': 'FFIType.u64',
  'IWICPixelFormatInfo*': 'FFIType.u64',
  'IWICStream*': 'FFIType.u64',
  // directml / d3d12 COM interface pointers — opaque tokens, treated as u64 handles by convention
  'ID3D12Device*': 'FFIType.u64',
  // webauthn struct pointers the DLL allocates and the caller only round-trips
  // (free / read via ReadProcessMemory) — opaque tokens, treated as u64 by convention
  PWEBAUTHN_ASSERTION: 'FFIType.u64',
  PWEBAUTHN_CREDENTIAL_ATTESTATION: 'FFIType.u64',
  PWEBAUTHN_CREDENTIAL_DETAILS_LIST: 'FFIType.u64',
  // firewallapi: NetworkIsolationEnumAppContainers allocates this array and
  // NetworkIsolationFreeAppContainers frees it — the caller only round-trips
  // the opaque token, treated as u64 by convention
  PINET_FIREWALL_APP_CONTAINER: 'FFIType.u64',
  // combase WinRT opaque handle / cookie tokens — treated as u64 handles by convention
  HSTRING: 'FFIType.u64',
  HSTRING_BUFFER: 'FFIType.u64',
  ROPARAMIIDHANDLE: 'FFIType.u64',
  RO_REGISTRATION_COOKIE: 'FFIType.u64',
  APARTMENT_SHUTDOWN_REGISTRATION_COOKIE: 'FFIType.u64',
  UINT64: 'FFIType.u64',
  // void
  VOID: 'FFIType.void',
  void: 'FFIType.void',
};

// ── C type → suggested TS type name ────────────────────────────────────────

const C_TYPE_TO_TS: Record<string, string> = {
  HSTRING: 'HSTRING',
  HSTRING_BUFFER: 'HSTRING_BUFFER',
  ROPARAMIIDHANDLE: 'ROPARAMIIDHANDLE',
  RO_REGISTRATION_COOKIE: 'RO_REGISTRATION_COOKIE',
  APARTMENT_SHUTDOWN_REGISTRATION_COOKIE: 'APARTMENT_SHUTDOWN_REGISTRATION_COOKIE',
  UINT64: 'UINT64',
  HANDLE: 'HANDLE',
  HGLOBAL: 'HGLOBAL',
  HLOCAL: 'HLOCAL',
  HMODULE: 'HMODULE',
  HINSTANCE: 'HINSTANCE',
  HWND: 'HWND',
  HRASCONN: 'HRASCONN',
  HPCON: 'HPCON',
  HRSRC: 'HRSRC',
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
  VOID: 'void',
  void: 'void',
  LPVOID: 'LPVOID',
  LPCWSTR: 'LPCWSTR',
  LPCSTR: 'LPCSTR',
  LPWSTR: 'LPWSTR',
  LPSTR: 'LPSTR',
  PVOID: 'PVOID',
  LPBYTE: 'LPBYTE',
  LPDWORD: 'LPDWORD',
};

// ═══════════════════════════════════════════════════════════════════════════
// Parsing helpers
// ═══════════════════════════════════════════════════════════════════════════

interface SymbolEntry {
  name: string;
  args: string[];
  returns: string;
}

interface MethodParam {
  name: string;
  tsType: string;
  baseType: string;
}

interface MethodEntry {
  name: string;
  symbolName: string;
  params: MethodParam[];
  returnType: string;
  line: number;
}

interface Mismatch {
  functionName: string;
  position: string;
  ffiType: string;
  expectedJs: string;
  actualTsType: string;
  resolvesTo: string;
  suggestion?: string;
  sdkCType?: string;
  line: number;
}

function parseSymbols(source: string): SymbolEntry[] {
  const symbolsBlock = source.match(/Symbols\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
  if (!symbolsBlock) return [];

  const entries: SymbolEntry[] = [];
  const entryRe = /(\w+)\s*:\s*\{\s*args\s*:\s*\[([\s\S]*?)\]\s*,\s*returns\s*:\s*(FFIType\.\w+)\s*\}/g;
  let m;
  while ((m = entryRe.exec(symbolsBlock[1])) !== null) {
    const name = m[1];
    const argsStr = m[2].replace(/\s+/g, ' ').trim();
    const args = argsStr
      ? argsStr
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      : [];
    entries.push({ name, args, returns: m[3] });
  }
  return entries;
}

function parseMethods(source: string): MethodEntry[] {
  const methods: MethodEntry[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/public\s+static\s+(\w+)\s*\(([\s\S]*?)\)\s*:\s*([\w|. ]+?)\s*\{/);
    if (!m) continue;

    const name = m[1];
    const paramsStr = m[2].trim();
    const returnType = m[3].trim();

    const bodyLine = lines[i] || '';
    const nextLine = lines[i + 1] || '';
    const loadMatch = bodyLine.match(/\.Load\(['"](\w+)['"]\)/) || nextLine.match(/\.Load\(['"](\w+)['"]\)/);
    const symbolName = loadMatch ? loadMatch[1] : name;

    const params: MethodParam[] = [];
    if (paramsStr) {
      const paramParts = paramsStr.split(',');
      for (const part of paramParts) {
        const pm = part.trim().match(/^(\w+)\s*:\s*(.+)$/);
        if (pm) {
          const tsType = pm[2].trim();
          const baseType = tsType
            .replace(/\s*\|\s*NULL\b/g, '')
            .replace(/\s*\|\s*0n\b/g, '')
            .trim();
          params.push({ name: pm[1], tsType, baseType });
        }
      }
    }

    methods.push({
      name,
      symbolName,
      params,
      returnType: returnType
        .replace(/\s*\|\s*NULL\b/g, '')
        .replace(/\s*\|\s*0n\b/g, '')
        .trim(),
      line: i + 1,
    });
  }
  return methods;
}

function parsePackageTypes(typesSource: string): Record<string, string> {
  const typeMap: Record<string, string> = {};

  const reExportBlocks = typesSource.matchAll(/export\s+type\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g);
  for (const m of reExportBlocks) {
    const names = m[1]
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    for (const name of names) {
      if (CORE_TYPES[name]) typeMap[name] = CORE_TYPES[name];
    }
  }

  const typeDefs = typesSource.matchAll(/export\s+type\s+(\w+)\s*=\s*(\w+)\s*;/g);
  for (const m of typeDefs) {
    const name = m[1];
    const rhs = m[2];
    if (rhs === 'bigint') typeMap[name] = 'bigint';
    else if (rhs === 'number') typeMap[name] = 'number';
    else if (rhs === 'Pointer') typeMap[name] = 'Pointer';
    else if (rhs === 'void') typeMap[name] = 'void';
    else if (rhs === 'null') typeMap[name] = 'null';
    else {
      typeMap[name] = typeMap[rhs] || CORE_TYPES[rhs] || rhs;
    }
  }

  const enums = typesSource.matchAll(/export\s+enum\s+(\w+)\s*\{/g);
  for (const m of enums) {
    typeMap[m[1]] = 'number';
  }

  return typeMap;
}

function resolveType(tsType: string, typeMap: Record<string, string>): string {
  const base = tsType
    .replace(/\s*\|\s*NULL\b/g, '')
    .replace(/\s*\|\s*0n\b/g, '')
    .trim();
  if (base === 'void') return 'void';
  return typeMap[base] || CORE_TYPES[base] || '???';
}

// ═══════════════════════════════════════════════════════════════════════════
// SDK header lookup — single-pass pre-index
// ═══════════════════════════════════════════════════════════════════════════

interface SdkProto {
  returnType: string;
  params: { type: string; name: string }[];
  header: string;
}

let sdkIndex: Map<string, SdkProto> | null = null;

function buildSdkIndex(functionNames: string[]): Map<string, SdkProto> {
  if (sdkIndex) return sdkIndex;
  sdkIndex = new Map();

  if (!existsSync(SDK_INCLUDE) || functionNames.length === 0 || !RIPGREP_PATH) return sdkIndex;

  const patternFile = join(ROOT, '.sdk-audit-patterns.tmp');
  const patterns = functionNames.map((n) => `\\b${n}\\(`).join('\n');
  require('fs').writeFileSync(patternFile, patterns);

  const searchDirs = [SDK_INCLUDE];
  const sharedDir = join(SDK_INCLUDE, '..', 'shared');
  if (existsSync(sharedDir)) searchDirs.push(sharedDir);

  try {
    const grepResult = execSync(`"${RIPGREP_PATH}" -n -B 8 --no-heading -f "${patternFile}" ${searchDirs.map((d) => `"${d}"`).join(' ')} --glob "*.h" --glob "!*helper.h"`, { encoding: 'utf-8', timeout: 60000, maxBuffer: 50 * 1024 * 1024 });

    for (const line of grepResult.split('\n')) {
      const normalizedLine = line.replace(/\r$/, '');
      const matchM = normalizedLine.match(/^(.*):(\d+):(.+)$/);
      if (!matchM) continue;

      const matchFile = matchM[1];
      const matchLine = matchM[3];
      const funcMatch = matchLine.match(/\b(\w+)\s*\(/);
      if (!funcMatch) continue;

      const funcName = funcMatch[1];
      const headerName = matchFile.split(/[/\\]/).pop() || '';

      if (!sdkIndex.has(funcName)) {
        sdkIndex.set(funcName, {
          returnType: '',
          params: [],
          header: headerName,
        });
      }
    }

    const headerFuncs = new Map<string, string[]>();
    for (const [funcName, proto] of sdkIndex) {
      for (const dir of searchDirs) {
        const path = join(dir, proto.header);
        if (existsSync(path)) {
          if (!headerFuncs.has(path)) headerFuncs.set(path, []);
          headerFuncs.get(path)!.push(funcName);
          break;
        }
      }
    }

    for (const [headerPath, funcs] of headerFuncs) {
      const content = readFileSync(headerPath, 'utf-8');
      const hLines = content.split('\n');

      for (const funcName of funcs) {
        for (let i = 0; i < hLines.length; i++) {
          if (!hLines[i].match(new RegExp(`\\b${funcName}\\s*\\(`))) continue;
          if (isCommentLikeLine(hLines[i])) continue;

          const proto = sdkIndex!.get(funcName)!;

          if (!proto.returnType) {
            const sameLineMatch = hLines[i].match(new RegExp(`^(.*?)\\b${funcName}\\s*\\(`));
            if (sameLineMatch && sameLineMatch[1].trim()) {
              const sameLineReturnType = sameLineMatch[1]
                .replace(
                  /\b(?:WINBERAPI|WINLDAPAPI|WINBASEAPI|WINUSERAPI|WINNORMALIZEAPI|WINADVAPI|NTSYSAPI|WINSOCK_API_LINKAGE|NET_API_FUNCTION|WSPAPI|IMAGEAPI|INTERNETAPI|BOOLAPI|DECLSPEC_IMPORT|WINAPI|LDAPAPI|BERAPI|APIENTRY|NTAPI|CALLBACK|STDAPI|STDAPICALLTYPE|extern|"C")\b/g,
                  '',
                )
                .replace(/\s+/g, ' ')
                .replace(/\s*\*/g, '*')
                .trim();
              if (sameLineReturnType) proto.returnType = sameLineReturnType;
            }
          }

          if (!proto.returnType) {
            for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
              const candidateLine = hLines[j].trim();
              if (!candidateLine) continue;
              if (candidateLine === 'WINAPI' || candidateLine === 'APIENTRY' || candidateLine === 'NTAPI' || candidateLine === 'CALLBACK') continue;
              if (
                candidateLine.startsWith('WINBASEAPI') ||
                candidateLine.startsWith('WINUSERAPI') ||
                candidateLine.startsWith('WINNORMALIZEAPI') ||
                candidateLine.startsWith('WINADVAPI') ||
                candidateLine.startsWith('NTSYSAPI') ||
                candidateLine.startsWith('WINSOCK_API_LINKAGE') ||
                candidateLine.startsWith('NET_API_FUNCTION') ||
                candidateLine.startsWith('WSPAPI') ||
                candidateLine.startsWith('IMAGEAPI') ||
                candidateLine.startsWith('SNMPAPI_') ||
                candidateLine.startsWith('INTERNETAPI') ||
                candidateLine.startsWith('BOOLAPI') ||
                candidateLine.startsWith('#') ||
                candidateLine.startsWith('_') ||
                candidateLine === '{' ||
                candidateLine === '*/'
              ) {
                if (candidateLine === 'BOOLAPI') {
                  proto.returnType = 'BOOL';
                  break;
                }
                continue;
              }
              proto.returnType = candidateLine.replace(/\s+/g, ' ').trim();
              break;
            }
          }

          const params: { type: string; name: string }[] = [];
          let paramBlock = '';
          let depth = 0;
          for (let j = i; j < Math.min(hLines.length, i + 30); j++) {
            paramBlock += hLines[j] + '\n';
            depth += (hLines[j].match(/\(/g) || []).length;
            depth -= (hLines[j].match(/\)/g) || []).length;
            if (depth <= 0) break;
          }

          const paramContent = paramBlock.match(/\(([\s\S]*)\)/);
          if (paramContent) {
            const rawParams = paramContent[1]
              .replace(/_(?=[A-Za-z]*[a-z])[A-Za-z_]+(?:\([^)]*\))?\s*/g, '')
              .replace(/\bGDIPCONST\b\s*/g, '')
              .replace(/CONST\s+/g, '')
              .replace(/const\s+/g, '')
              .replace(/\b(?:IN|OUT|INOUT|OPTIONAL)\s+/g, '');
            const paramParts = rawParams
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean);
            for (const pl of paramParts) {
              const cleaned = pl.trim().replace(/\s+/g, ' ');
              const normalized = cleaned.replace(/\s*\[\s*\]\s*$/, '');
              const paramMatch = normalized.match(/^(.*?)([A-Za-z_]\w*)$/);
              if (!paramMatch) continue;

              const paramName = paramMatch[2];
              const paramType = paramMatch[1].trim().replace(/\s+\*/g, '*');

              if (paramName !== 'VOID' && paramName !== 'void') {
                params.push({ type: paramType, name: paramName });
              }
            }
          }

          proto.params = params;
          break;
        }
      }
    }
  } catch (e) {}

  try {
    require('fs').unlinkSync(patternFile);
  } catch {}

  return sdkIndex;
}

function lookupSdk(functionName: string): SdkProto | null {
  if (!sdkIndex) return null;
  return sdkIndex.get(functionName) || null;
}

function isCommentLikeLine(lineText: string): boolean {
  const trimmedLine = lineText.trim();
  return trimmedLine.startsWith('*') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('//');
}

// ═══════════════════════════════════════════════════════════════════════════
// Main audit logic
// ═══════════════════════════════════════════════════════════════════════════

function auditPackage(pkgName: string, skipSdk: boolean = false): Mismatch[] {
  const pkgDir = join(PACKAGES, pkgName);
  const structsDir = join(pkgDir, 'structs');
  const typesDir = join(pkgDir, 'types');

  if (!existsSync(structsDir) || !existsSync(typesDir)) {
    console.error(`  Skipping ${pkgName}: no structs/ or types/ directory`);
    return [];
  }

  const structFiles = readdirSync(structsDir).filter((f) => f.endsWith('.ts'));
  if (structFiles.length === 0) {
    console.error(`  Skipping ${pkgName}: no .ts files in structs/`);
    return [];
  }
  const className = structFiles[0].replace('.ts', '');

  const structsSource = readFileSync(join(structsDir, `${className}.ts`), 'utf-8');
  const typesSource = readFileSync(join(typesDir, `${className}.ts`), 'utf-8');

  const symbols = parseSymbols(structsSource);
  const methods = parseMethods(structsSource);
  const typeMap = parsePackageTypes(typesSource);

  const symbolMap = new Map<string, SymbolEntry>();
  for (const s of symbols) symbolMap.set(s.name, s);

  const mismatches: Mismatch[] = [];

  for (const method of methods) {
    const symbol = symbolMap.get(method.symbolName);
    if (!symbol) {
      continue;
    }

    const expectedReturnJs = FFI_TO_JS[symbol.returns] || '???';
    const actualReturnJs = resolveType(method.returnType, typeMap);

    const sdkProto = skipSdk ? null : lookupSdk(method.symbolName);

    if (expectedReturnJs !== actualReturnJs && actualReturnJs !== '???') {
      const mismatch: Mismatch = {
        functionName: method.name,
        position: 'return',
        ffiType: symbol.returns,
        expectedJs: expectedReturnJs,
        actualTsType: method.returnType,
        resolvesTo: actualReturnJs,
        line: method.line,
      };
      if (sdkProto?.returnType) {
        mismatch.sdkCType = sdkProto.returnType;
        const suggested = C_TYPE_TO_TS[sdkProto.returnType];
        if (suggested) mismatch.suggestion = suggested;
      }
      mismatches.push(mismatch);
    }

    if (sdkProto?.returnType && expectedReturnJs === actualReturnJs) {
      const expectedFfi = C_TYPE_TO_FFI[sdkProto.returnType] ?? (sdkProto.returnType.endsWith('*') ? 'FFIType.ptr' : C_TYPE_TO_FFI[sdkProto.returnType]);
      if (expectedFfi && expectedFfi !== symbol.returns) {
        mismatches.push({
          functionName: method.name,
          position: 'return (FFI symbol wrong)',
          ffiType: symbol.returns,
          expectedJs: FFI_TO_JS[expectedFfi] || '???',
          actualTsType: method.returnType,
          resolvesTo: actualReturnJs,
          sdkCType: sdkProto.returnType,
          suggestion: C_TYPE_TO_TS[sdkProto.returnType],
          line: method.line,
        });
      }
    }

    const minLen = Math.min(method.params.length, symbol.args.length);
    for (let pi = 0; pi < minLen; pi++) {
      const param = method.params[pi];
      const ffiArg = symbol.args[pi];
      const expectedParamJs = FFI_TO_JS[ffiArg] || '???';
      const actualParamJs = resolveType(param.baseType, typeMap);

      if (expectedParamJs !== actualParamJs && actualParamJs !== '???') {
        if (ffiArg === 'FFIType.ptr' && param.tsType === 'NULL') continue;

        const mismatch: Mismatch = {
          functionName: method.name,
          position: `param[${pi}] (${param.name})`,
          ffiType: ffiArg,
          expectedJs: expectedParamJs,
          actualTsType: param.tsType,
          resolvesTo: actualParamJs,
          line: method.line,
        };
        if (sdkProto?.params[pi]) {
          mismatch.sdkCType = sdkProto.params[pi].type;
          const suggested = C_TYPE_TO_TS[sdkProto.params[pi].type];
          if (suggested) mismatch.suggestion = suggested;
        }
        mismatches.push(mismatch);
      }

      const sdkAligned = sdkProto && sdkProto.params.length === method.params.length;
      if (sdkAligned && sdkProto?.params[pi] && expectedParamJs === actualParamJs) {
        const sdkParamType = sdkProto.params[pi].type;
        const expectedFfi = C_TYPE_TO_FFI[sdkParamType] ?? (sdkParamType.endsWith('*') ? 'FFIType.ptr' : C_TYPE_TO_FFI[sdkParamType]);
        if (expectedFfi && expectedFfi !== ffiArg) {
          mismatches.push({
            functionName: method.name,
            position: `param[${pi}] (${param.name}) (FFI symbol wrong)`,
            ffiType: ffiArg,
            expectedJs: FFI_TO_JS[expectedFfi] || '???',
            actualTsType: param.tsType,
            resolvesTo: actualParamJs,
            sdkCType: sdkParamType,
            suggestion: C_TYPE_TO_TS[sdkParamType],
            line: method.line,
          });
        }
      }
    }

    if (method.params.length !== symbol.args.length) {
      mismatches.push({
        functionName: method.name,
        position: 'param count',
        ffiType: `${symbol.args.length} args`,
        expectedJs: `${symbol.args.length} params`,
        actualTsType: `${method.params.length} params`,
        resolvesTo: 'PARAM_COUNT_MISMATCH',
        line: method.line,
      });
    }
  }

  return mismatches;
}

// ═══════════════════════════════════════════════════════════════════════════
// Output
// ═══════════════════════════════════════════════════════════════════════════

function formatMismatches(pkgName: string, mismatches: Mismatch[]): void {
  if (mismatches.length === 0) {
    console.log(`  ✓ No mismatches found`);
    return;
  }

  const grouped = new Map<string, Mismatch[]>();
  for (const m of mismatches) {
    const key = m.functionName;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  for (const [fn, items] of grouped) {
    for (const m of items) {
      const sdk = m.sdkCType ? ` [SDK: ${m.sdkCType}]` : '';
      const fix = m.suggestion ? ` → use ${m.suggestion}` : '';
      console.log(`  L${String(m.line).padStart(5)} | ${fn} | ${m.position}`);
      console.log(`         FFI: ${m.ffiType} (${m.expectedJs}) vs TS: ${m.actualTsType} (${m.resolvesTo})${sdk}${fix}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Auto-fix
// ═══════════════════════════════════════════════════════════════════════════

const FFI_DEFAULT_TS: Record<string, string> = {
  'FFIType.u64': 'HANDLE',
  'FFIType.i64': 'LONG_PTR',
  'FFIType.ptr': 'LPVOID',
  'FFIType.u32': 'DWORD',
  'FFIType.i32': 'INT',
  'FFIType.u16': 'WORD',
  'FFIType.i16': 'SHORT',
  'FFIType.u8': 'BYTE',
  'FFIType.f32': 'FLOAT',
  'FFIType.f64': 'number',
  'FFIType.void': 'void',
};

function computeFixType(m: Mismatch): string | null {
  if (m.resolvesTo === 'PARAM_COUNT_MISMATCH') return null;
  if (m.position.includes('FFI symbol wrong')) return null;

  if (m.suggestion) return m.suggestion;

  if (m.sdkCType) {
    const mapped = C_TYPE_TO_TS[m.sdkCType];
    if (mapped) return mapped;
    if (m.sdkCType.startsWith('P') || m.sdkCType.startsWith('LP')) return 'LPVOID';
  }

  return FFI_DEFAULT_TS[m.ffiType] || null;
}

function applyFixes(pkgName: string, mismatches: Mismatch[]): number {
  const fixable = mismatches.filter((m) => {
    const fix = computeFixType(m);
    return fix !== null && !m.position.includes('FFI symbol wrong') && m.resolvesTo !== 'PARAM_COUNT_MISMATCH';
  });

  if (fixable.length === 0) return 0;

  const pkgDir = join(PACKAGES, pkgName);
  const structsDir = join(pkgDir, 'structs');
  const structFiles = readdirSync(structsDir).filter((f) => f.endsWith('.ts'));
  const className = structFiles[0].replace('.ts', '');
  const filePath = join(structsDir, `${className}.ts`);
  let source = readFileSync(filePath, 'utf-8');
  const lines = source.split('\n');

  const neededTypes = new Set<string>();
  let fixCount = 0;

  const fixesByLine = new Map<number, Mismatch[]>();
  for (const m of fixable) {
    if (!fixesByLine.has(m.line)) fixesByLine.set(m.line, []);
    fixesByLine.get(m.line)!.push(m);
  }

  for (const [lineNum, lineFixes] of fixesByLine) {
    const lineIdx = lineNum - 1;
    let line = lines[lineIdx];
    if (!line) continue;

    for (const m of lineFixes) {
      const fixType = computeFixType(m)!;
      neededTypes.add(fixType);

      if (m.position === 'return') {
        const oldRet = m.actualTsType;
        const retRe = new RegExp(`\\)\\s*:\\s*${escapeRegex(oldRet)}\\s*\\{`);
        if (retRe.test(line)) {
          line = line.replace(retRe, `): ${fixType} {`);
          fixCount++;
        }
      } else if (m.position.startsWith('param[')) {
        const paramNameMatch = m.position.match(/\((\w+)\)/);
        if (!paramNameMatch) continue;
        const paramName = paramNameMatch[1];
        const oldType = m.actualTsType;

        const paramRe = new RegExp(`(${escapeRegex(paramName)}\\s*:\\s*)${escapeRegex(oldType)}`);
        if (paramRe.test(line)) {
          line = line.replace(paramRe, `$1${fixType}`);
          fixCount++;
        }
      }
    }

    lines[lineIdx] = line;
  }

  if (fixCount > 0) {
    require('fs').writeFileSync(filePath, lines.join('\n'));
    console.log(`  Applied ${fixCount} fixes to ${filePath}`);

    const typesPath = join(pkgDir, 'types', `${className}.ts`);
    const typesSource = readFileSync(typesPath, 'utf-8');
    const missingTypes = [...neededTypes].filter((t) => t !== 'void' && t !== 'number' && !typesSource.includes(`type ${t}`) && !typesSource.includes(`${t},`) && !typesSource.includes(`${t}\n`));
    if (missingTypes.length > 0) {
      console.log(`  ⚠ These types may need to be added to types/${className}.ts:`);
      for (const t of missingTypes.sort()) {
        console.log(`    - ${t}`);
      }
    }
  }

  return fixCount;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI entry
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const doAll = args.includes('--all');
const noSdk = args.includes('--no-sdk');
const doFix = args.includes('--fix');
const packages = doAll ? readdirSync(PACKAGES).filter((d) => d !== 'core' && d !== 'template' && existsSync(join(PACKAGES, d, 'structs'))) : args.filter((a) => !a.startsWith('--'));

if (packages.length === 0) {
  console.error('Usage: bun run scripts/audit.ts <package> [--all]');
  process.exit(1);
}

if (!noSdk) {
  const allFunctionNames: string[] = [];
  for (const pkg of packages) {
    const structsDir = join(PACKAGES, pkg, 'structs');
    if (!existsSync(structsDir)) continue;
    const files = readdirSync(structsDir).filter((f) => f.endsWith('.ts'));
    if (files.length === 0) continue;
    const source = readFileSync(join(structsDir, files[0]), 'utf-8');
    const symbols = parseSymbols(source);
    for (const s of symbols) allFunctionNames.push(s.name);
  }
  console.log(`Building SDK index for ${allFunctionNames.length} functions...`);
  buildSdkIndex(allFunctionNames);
  console.log(`SDK index: ${sdkIndex!.size} functions found in headers`);
}

let totalMismatches = 0;
let totalFixed = 0;

for (const pkg of packages) {
  console.log(`\n═══ Auditing: ${pkg} ═══`);
  const mismatches = auditPackage(pkg, noSdk);
  if (!doFix) {
    formatMismatches(pkg, mismatches);
  }
  totalMismatches += mismatches.length;
  console.log(`  Total issues: ${mismatches.length}`);
  if (doFix && mismatches.length > 0) {
    const fixed = applyFixes(pkg, mismatches);
    totalFixed += fixed;
  }
}

console.log(`\n═══ Summary ═══`);
console.log(`  Packages audited: ${packages.length}`);
console.log(`  Total mismatches: ${totalMismatches}`);
if (doFix) console.log(`  Total fixes applied: ${totalFixed}`);

process.exit(totalMismatches > 0 ? 1 : 0);

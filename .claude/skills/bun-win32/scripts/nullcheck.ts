#!/usr/bin/env bun
/**
 * nullcheck.ts — SAL-driven nullability & pointer/handle type auditor.
 *
 * Companion to scripts/audit.ts. `audit.ts` cross-checks FFIType <-> TS type <->
 * SDK header C type, but it deliberately STRIPS SAL annotations, so it has no
 * signal for nullability — a missing `| NULL` / `| 0n` is invisible to it. This
 * tool closes that gap: it indexes the local Windows SDK headers, PRESERVES the
 * SAL annotation per parameter, and compares it against every bound method
 * signature.
 *
 * For each pointer-like (resolves to bun:ffi Pointer) or handle-like (resolves to
 * a bigint handle) parameter it reports:
 *   - MISSING       header SAL is optional (_opt_ / _Reserved_ / OPTIONAL) but the
 *                   TS signature lacks the union -> pointer needs `| NULL`, handle
 *                   needs `| 0n`. These are real bugs; `--fix` adds them.
 *   - TYPE_MISMATCH the TS type disagrees with the header on pointer-vs-handle
 *                   (e.g. a real HWND typed as LPVOID). Opaque object/COM pointers
 *                   bound as u64 handles by convention (GpBitmap*, IStream*, LDAP*)
 *                   are NOT flagged.
 *   - SPURIOUS      TS has a `| NULL`/`| 0n` the header marks required. NOT a hard
 *                   error — older headers under-annotate optionality and the union
 *                   is usually correct per MSDN prose. Informational only.
 *   - UNMATCHED     the matched prototype's params don't align by name (review).
 *   - NO_SDK        the function isn't in any header (COM/DirectX/undocumented).
 *
 * Exit code: non-zero if any MISSING is found (the definite-bug class), or any
 * TYPE_MISMATCH when --strict is passed. Use it as a release/CI gate.
 *
 * Usage:
 *   bun run scripts/nullcheck.ts --all                 # audit every package
 *   bun run scripts/nullcheck.ts kernel32 user32       # audit named packages
 *   bun run scripts/nullcheck.ts --all --json          # machine-readable findings
 *   bun run scripts/nullcheck.ts kernel32 --fix        # add missing | NULL / | 0n
 *   bun run scripts/nullcheck.ts --all --strict        # also fail on TYPE_MISMATCH
 */

import { execFileSync, execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '../..');
const PACKAGES = join(ROOT, 'packages');

// ── SDK + ripgrep resolution (mirrors scripts/audit.ts) ────────────────────

function resolveRipgrepPath(): string {
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
  throw new Error('ripgrep (rg) not found. Install: winget install BurntSushi.ripgrep.MSVC');
}

function resolveSdkDirs(): string[] {
  const root = 'C:/Program Files (x86)/Windows Kits/10/Include';
  if (!existsSync(root)) return [];
  const versions = readdirSync(root)
    .filter((d) => /^\d+\.\d+\.\d+\.\d+$/.test(d))
    .sort((a, b) => {
      const leftParts = a.split('.').map(Number);
      const rightParts = b.split('.').map(Number);
      for (let i = 0; i < 4; i++) if ((leftParts[i] ?? 0) !== (rightParts[i] ?? 0)) return (rightParts[i] ?? 0) - (leftParts[i] ?? 0);
      return 0;
    });
  for (const version of versions) {
    const umDirectory = join(root, version, 'um');
    if (existsSync(umDirectory)) {
      const dirs = [umDirectory];
      const sharedDirectory = join(root, version, 'shared');
      if (existsSync(sharedDirectory)) dirs.push(sharedDirectory);
      const winrtDirectory = join(root, version, 'winrt');
      if (existsSync(winrtDirectory)) dirs.push(winrtDirectory);
      return dirs;
    }
  }
  return [];
}

const RIPGREP = resolveRipgrepPath();
const SDK_DIRS = resolveSdkDirs();

// ── Type resolution: TS alias -> 'Pointer' | 'bigint' | 'number' | ... ──────

const CORE_TYPES: Record<string, string> = {
  ACCESS_MASK: 'number',
  BOOL: 'number',
  BOOLEAN: 'number',
  BYTE: 'number',
  CHAR: 'number',
  DWORD: 'number',
  FLOAT: 'number',
  HRESULT: 'number',
  INT: 'number',
  LONG: 'number',
  SHORT: 'number',
  UINT: 'number',
  ULONG: 'number',
  WCHAR: 'number',
  WORD: 'number',
  COLORREF: 'number',
  LANGID: 'number',
  NTSTATUS: 'number',
  SECURITY_STATUS: 'number',
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
  ULONGLONG: 'bigint',
  DWORDLONG: 'bigint',
  LARGE_INTEGER: 'bigint',
  ULARGE_INTEGER: 'bigint',
  QWORD: 'bigint',
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
  NULL: 'null',
  VOID: 'void',
  void: 'void',
};

// A handle-like bigint (gets `| 0n`) vs a non-handle 64-bit integer. 64-bit
// integers (SIZE_T, the *_PTR ints, LARGE_INTEGER) are never `_opt_`, so they
// never need a nullable union — only genuine handles get `| 0n`.
const NON_HANDLE_BIGINTS = new Set(['DWORD_PTR', 'INT_PTR', 'LONG_PTR', 'SIZE_T', 'UINT_PTR', 'ULONG_PTR', 'LPARAM', 'LRESULT', 'WPARAM', 'ULONGLONG', 'DWORDLONG', 'LARGE_INTEGER', 'ULARGE_INTEGER', 'QWORD']);

function parsePackageTypes(typesSource: string): Record<string, string> {
  const typeMap: Record<string, string> = {};
  for (const match of typesSource.matchAll(/export\s+type\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g)) {
    for (const name of match[1]
      .split(',')
      .map((entry) => entry.trim().replace(/\s+as\s+\w+$/, ''))
      .filter(Boolean)) {
      if (CORE_TYPES[name]) typeMap[name] = CORE_TYPES[name];
    }
  }
  for (const match of typesSource.matchAll(/export\s+type\s+(\w+)\s*=\s*([^;]+);/g)) {
    const name = match[1];
    const rightHandSide = match[2].trim();
    if (rightHandSide === 'bigint') typeMap[name] = 'bigint';
    else if (rightHandSide === 'number') typeMap[name] = 'number';
    else if (rightHandSide === 'Pointer') typeMap[name] = 'Pointer';
    else if (rightHandSide === 'void') typeMap[name] = 'void';
    else if (rightHandSide === 'null') typeMap[name] = 'null';
    else {
      const head = rightHandSide
        .replace(/\s*\|\s*NULL\b/g, '')
        .replace(/\s*\|\s*0n\b/g, '')
        .trim()
        .split(/\s*\|\s*/)[0]
        .trim();
      typeMap[name] = typeMap[head] || CORE_TYPES[head] || 'unknown';
    }
  }
  for (const match of typesSource.matchAll(/export\s+enum\s+(\w+)\s*\{/g)) typeMap[match[1]] = 'number';
  return typeMap;
}

function resolveJs(baseType: string, typeMap: Record<string, string>): string {
  const base = baseType.trim();
  if (base === 'void') return 'void';
  return typeMap[base] ?? CORE_TYPES[base] ?? 'unknown';
}

// ── Method parsing ──────────────────────────────────────────────────────────

interface MethodParam {
  name: string;
  tsType: string;
  baseType: string;
  hasNull: boolean;
  has0n: boolean;
}
interface MethodEntry {
  name: string;
  symbolName: string;
  params: MethodParam[];
  line: number;
}

function parseMethods(source: string): MethodEntry[] {
  const methods: MethodEntry[] = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/public\s+static\s+(\w+)\s*\(([\s\S]*?)\)\s*:\s*[\w|. ]+?\s*\{/);
    if (!match) continue;
    const paramsText = match[2].trim();
    const loadMatch = lines[i].match(/\.Load\(['"](\w+)['"]\)/) || (lines[i + 1] || '').match(/\.Load\(['"](\w+)['"]\)/);
    const params: MethodParam[] = [];
    if (paramsText) {
      for (const part of splitTopLevel(paramsText)) {
        const paramMatch = part.trim().match(/^(\w+)\s*:\s*([\s\S]+)$/);
        if (!paramMatch) continue;
        const tsType = paramMatch[2].trim().replace(/\s+/g, ' ');
        const hasNull = /\|\s*NULL\b/.test(tsType);
        const has0n = /\|\s*0n\b/.test(tsType);
        const baseType = tsType
          .replace(/\s*\|\s*NULL\b/g, '')
          .replace(/\s*\|\s*0n\b/g, '')
          .trim();
        params.push({ name: paramMatch[1], tsType, baseType, hasNull, has0n });
      }
    }
    methods.push({
      name: match[1],
      symbolName: loadMatch ? loadMatch[1] : match[1],
      params,
      line: i + 1,
    });
  }
  return methods;
}

/** Split on top-level commas (depth 0), respecting (), <>, [], {}. */
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of text) {
    if (character === '(' || character === '<' || character === '[' || character === '{') depth++;
    else if (character === ')' || character === '>' || character === ']' || character === '}') depth--;
    if (character === ',' && depth === 0) {
      out.push(current);
      current = '';
    } else current += character;
  }
  if (current.trim()) out.push(current);
  return out;
}

// ── SDK header index (preserves SAL) ────────────────────────────────────────

interface SdkParam {
  name: string;
  optional: boolean;
  ctype: string;
  array: boolean;
}

const HANDLE_CTYPES = new Set([
  'HANDLE',
  'HWND',
  'HMODULE',
  'HINSTANCE',
  'HKEY',
  'HDC',
  'HMENU',
  'HICON',
  'HCURSOR',
  'HBRUSH',
  'HPEN',
  'HFONT',
  'HRGN',
  'HBITMAP',
  'HPALETTE',
  'HGLOBAL',
  'HLOCAL',
  'HDESK',
  'HWINSTA',
  'HHOOK',
  'HDWP',
  'HMONITOR',
  'HACCEL',
  'HRSRC',
  'HPCON',
  'SC_HANDLE',
  'HGLRC',
  'HCRYPTPROV',
  'HCRYPTKEY',
  'HCRYPTHASH',
  'HCERTSTORE',
  'HCRYPTMSG',
  'HSTRING',
  'HKL',
  'HWINEVENTHOOK',
  'HDEVINFO',
  'HCATADMIN',
  'HCATINFO',
  'HTHEME',
  'HRASCONN',
  'HSEMAPHORE',
  'HCOLORSPACE',
  'HENHMETAFILE',
  'HMETAFILE',
  'HTASK',
  'HCONV',
  'HCONVLIST',
  'HDDEDATA',
  'HSZ',
  'SERVICE_STATUS_HANDLE',
  'SC_LOCK',
  'HCLUSTER',
  'HGROUP',
  'HNODE',
  'HNETWORK',
  'HRESOURCE',
  'HCLUSENUM',
  'HREGRESTORE',
  'HPOWERNOTIFY',
  'HPSS',
  'HSWDEVICE',
  'HCMNOTIFICATION',
]);
const SCALAR_CTYPES = new Set([
  'DWORD',
  'UINT',
  'ULONG',
  'INT',
  'LONG',
  'BOOL',
  'BOOLEAN',
  'BYTE',
  'WORD',
  'USHORT',
  'SHORT',
  'CHAR',
  'UCHAR',
  'WCHAR',
  'FLOAT',
  'DOUBLE',
  'ATOM',
  'COLORREF',
  'HRESULT',
  'NTSTATUS',
  'LANGID',
  'LCID',
  'ACCESS_MASK',
  'SIZE_T',
  'DWORD_PTR',
  'UINT_PTR',
  'ULONG_PTR',
  'INT_PTR',
  'LONG_PTR',
  'LPARAM',
  'WPARAM',
  'LRESULT',
  'ULONGLONG',
  'DWORDLONG',
  'LARGE_INTEGER',
  'ULARGE_INTEGER',
  'LONGLONG',
  'UINT64',
  'INT64',
  'UINT32',
  'INT32',
  'SECURITY_STATUS',
  'WININETAPI',
]);
// Unambiguous *data* pointers: caller allocates a buffer/struct -> FFIType.ptr.
// A binding that types one of these as a handle (bigint) is a genuine bug. Opaque
// object/COM/interface pointers (GpBitmap*, IStream*, LDAP*, PWEBAUTHN_*, PDH_*)
// are deliberately bound as u64 handles by repo convention and are NOT listed here.
const DATA_POINTER_ALIASES = new Set([
  'LPVOID',
  'LPCVOID',
  'PVOID',
  'LPBYTE',
  'PBYTE',
  'LPSTR',
  'LPCSTR',
  'PSTR',
  'PCSTR',
  'LPWSTR',
  'LPCWSTR',
  'PWSTR',
  'PCWSTR',
  'LPWCH',
  'PWCHAR',
  'PCHAR',
  'LPCH',
  'LPDWORD',
  'PDWORD',
  'LPWORD',
  'PWORD',
  'LPLONG',
  'PLONG',
  'LPULONG',
  'PULONG',
  'LPBOOL',
  'PBOOL',
  'LPINT',
  'PINT',
  'LPUINT',
  'PUINT',
  'LPFLOAT',
  'PFLOAT',
  'LPDOUBLE',
  'PSHORT',
  'PUSHORT',
  'LPHANDLE',
  'PHANDLE',
]);
const PRIMITIVE_BASES = new Set([...SCALAR_CTYPES, 'void', 'VOID', 'char', 'wchar_t', 'TCHAR', 'PVOID', 'INT8', 'INT16', 'UINT8', 'UINT16', 'LONG32', 'ULONG32', 'LONG64', 'ULONG64']);

function headerKind(cTypeRaw: string): 'pointer' | 'handle' | 'scalar' | 'unknown' {
  const type = cTypeRaw.trim();
  if (!type) return 'unknown';
  if (type.endsWith('*')) return 'pointer';
  if (HANDLE_CTYPES.has(type)) return 'handle';
  if (/(?:^|_)HANDLE$/.test(type)) return 'handle';
  if (SCALAR_CTYPES.has(type)) return 'scalar';
  if (DATA_POINTER_ALIASES.has(type)) return 'pointer';
  if (/^LP[A-Z]/.test(type)) return 'pointer';
  if (/^H[A-Z][A-Z0-9_]*$/.test(type)) return 'handle';
  return 'unknown';
}

/** A header pointer type that must map to FFIType.ptr (so a handle-typed binding is a bug). */
function isDataPointer(cTypeRaw: string): boolean {
  const type = cTypeRaw.trim();
  if (SCALAR_CTYPES.has(type)) return false;
  if (type.endsWith('*')) {
    const base = type
      .replace(/\*+$/, '')
      .replace(/\b(?:const|CONST|GDIPCONST)\b/g, '')
      .trim();
    return PRIMITIVE_BASES.has(base);
  }
  if (DATA_POINTER_ALIASES.has(type)) return true;
  if (/^LP[A-Z]/.test(type)) return true;
  return false;
}

interface SdkProto {
  header: string;
  params: SdkParam[];
  found: boolean;
}

let sdkIndex: Map<string, SdkProto> = new Map();
let functionSet = new Set<string>();

function buildSdkIndex(functionNames: string[]): void {
  sdkIndex = new Map();
  if (SDK_DIRS.length === 0 || functionNames.length === 0) return;

  const patternFile = join(ROOT, '.nullcheck-patterns.tmp');
  writeFileSync(patternFile, [...new Set(functionNames)].map((name) => `\\b${name}\\(`).join('\n'));

  const linkageRe = /(?:WINAPI|APIENTRY|NTAPI|CALLBACK|STDAPICALLTYPE|STDAPI|WINSOCK_API_LINKAGE|NET_API_FUNCTION|__stdcall|[A-Z][A-Z0-9]*API)\b/;
  const fileCache = new Map<string, string[]>();
  const getLines = (path: string): string[] => {
    let cached = fileCache.get(path);
    if (!cached) {
      cached = readFileSync(path, 'utf-8').split('\n');
      fileCache.set(path, cached);
    }
    return cached;
  };

  try {
    const grepOutput = execSync(`"${RIPGREP}" -n --no-heading -f "${patternFile}" ${SDK_DIRS.map((dir) => `"${dir}"`).join(' ')} --glob "*.h" --glob "!*helper.h"`, { encoding: 'utf-8', timeout: 120000, maxBuffer: 256 * 1024 * 1024 });

    const hits = new Map<string, { path: string; line: number; score: number }[]>();
    for (const rawLine of grepOutput.split('\n')) {
      const line = rawLine.replace(/\r$/, '');
      const lineMatch = line.match(/^(.*?):(\d+):(.+)$/);
      if (!lineMatch) continue;
      const text = lineMatch[3];
      let functionName = '';
      for (const candidate of text.matchAll(/\b(\w+)\s*\(/g)) {
        if (functionSet.has(candidate[1])) {
          functionName = candidate[1];
          break;
        }
      }
      if (!functionName) continue;
      const trimmed = text.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#')) continue;
      const startsLine = new RegExp(`^\\s*${functionName}\\s*\\(`).test(text);
      const score = startsLine ? 3 : linkageRe.test(text) ? 2 : 1;
      if (!hits.has(functionName)) hits.set(functionName, []);
      hits.get(functionName)!.push({
        path: lineMatch[1],
        line: parseInt(lineMatch[2], 10) - 1,
        score,
      });
    }

    for (const [functionName, candidates] of hits) {
      candidates.sort((a, b) => b.score - a.score);
      const proto: SdkProto = { header: '', params: [], found: false };
      for (const candidate of candidates) {
        if (!existsSync(candidate.path)) continue;
        const headerLines = getLines(candidate.path);
        let block = '';
        for (let j = candidate.line; j < Math.min(headerLines.length, candidate.line + 60); j++) {
          block += headerLines[j] + '\n';
          const probeIndex = block.search(new RegExp(`\\b${functionName}\\s*\\(`));
          if (probeIndex >= 0) {
            const openIndex = block.indexOf('(', probeIndex);
            let probeDepth = 0;
            let closed = false;
            for (let k = openIndex; k < block.length; k++) {
              if (block[k] === '(') probeDepth++;
              else if (block[k] === ')') {
                probeDepth--;
                if (probeDepth === 0) {
                  closed = true;
                  break;
                }
              }
            }
            if (closed) break;
          }
        }
        const nameIndex = block.search(new RegExp(`\\b${functionName}\\s*\\(`));
        if (nameIndex < 0) continue;
        const openParen = block.indexOf('(', nameIndex);
        let depth = 0;
        let closeParen = -1;
        for (let k = openParen; k < block.length; k++) {
          if (block[k] === '(') depth++;
          else if (block[k] === ')') {
            depth--;
            if (depth === 0) {
              closeParen = k;
              break;
            }
          }
        }
        if (closeParen < 0) continue;
        const inner = block.slice(openParen + 1, closeParen);
        const parsed = parseSdkParams(inner);
        const innerTrimmed = inner.trim();
        const isVoid = innerTrimmed === '' || /^void$/i.test(innerTrimmed);
        if (parsed.length > 0 || isVoid) {
          proto.header = candidate.path.split(/[/\\]/).pop() || '';
          proto.params = parsed;
          proto.found = true;
          break;
        }
      }
      sdkIndex.set(functionName, proto);
    }
  } catch {
    // rg exit code 1 == no matches
  } finally {
    try {
      unlinkSync(patternFile);
    } catch {}
  }
}

function parseSdkParams(inner: string): SdkParam[] {
  const params: SdkParam[] = [];
  for (const rawPart of splitTopLevel(inner)) {
    const part = rawPart.replace(/\s+/g, ' ').trim();
    if (!part) continue;
    if (/^void$/i.test(part)) continue;
    const optional = /_opt_/i.test(part) || /\b_Reserved_\b/.test(part) || /\bOPTIONAL\b/.test(part);
    const array = /\[/.test(part);
    const cleaned = part
      .replace(/_(?=[A-Za-z]*[a-z])[A-Za-z0-9_]+(?:\([^)]*\))?/g, '')
      .replace(/\b(IN|OUT|INOUT|OPTIONAL)\b/g, '')
      .replace(/\bGDIPCONST\b/g, '')
      .replace(/\bCONST\b/gi, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const nameMatch = cleaned.match(/^(.*?)([A-Za-z_]\w*)\s*$/);
    if (!nameMatch) continue;
    const ctype = nameMatch[1].trim().replace(/\s*\*/g, '*');
    params.push({ name: nameMatch[2], optional, ctype, array });
  }
  return params;
}

// ── Audit one package ───────────────────────────────────────────────────────

type Kind = 'MISSING' | 'SPURIOUS' | 'UNMATCHED' | 'NO_SDK' | 'TYPE_MISMATCH';
interface Finding {
  kind: Kind;
  method: string;
  symbol: string;
  param?: string;
  paramBase?: string;
  marker?: '| NULL' | '| 0n';
  ctype?: string;
  line: number;
  header?: string;
  note?: string;
}

function auditPackage(pkg: string): { findings: Finding[]; className: string } {
  const structsDir = join(PACKAGES, pkg, 'structs');
  const typesDir = join(PACKAGES, pkg, 'types');
  if (!existsSync(structsDir) || !existsSync(typesDir)) return { findings: [], className: '' };
  const structFiles = readdirSync(structsDir).filter((file) => file.endsWith('.ts'));
  if (structFiles.length === 0) return { findings: [], className: '' };
  const className = structFiles[0].replace('.ts', '');
  const structsSource = readFileSync(join(structsDir, structFiles[0]), 'utf-8');
  const typesSource = existsSync(join(typesDir, structFiles[0])) ? readFileSync(join(typesDir, structFiles[0]), 'utf-8') : '';
  const typeMap = parsePackageTypes(typesSource);
  const methods = parseMethods(structsSource);
  const findings: Finding[] = [];

  for (const method of methods) {
    const proto = sdkIndex.get(method.symbolName);
    const pointerHandleParams = method.params.filter((param) => {
      const js = resolveJs(param.baseType, typeMap);
      return js === 'Pointer' || (js === 'bigint' && !NON_HANDLE_BIGINTS.has(param.baseType));
    });

    if (!proto || !proto.found) {
      if (pointerHandleParams.length > 0) {
        findings.push({
          kind: 'NO_SDK',
          method: method.name,
          symbol: method.symbolName,
          line: method.line,
          note: pointerHandleParams.map((param) => `${param.name}:${param.baseType}${param.hasNull ? ' |NULL' : ''}${param.has0n ? ' |0n' : ''}`).join(', '),
        });
      }
      continue;
    }

    const headerByName = new Map(proto.params.map((param) => [param.name, param]));
    const matchedCount = method.params.filter((param) => headerByName.has(param.name)).length;
    const overlap = method.params.length ? matchedCount / method.params.length : 1;
    const confident = overlap >= 0.6;

    for (const param of pointerHandleParams) {
      const js = resolveJs(param.baseType, typeMap);
      const tsKind: 'pointer' | 'handle' = js === 'Pointer' ? 'pointer' : 'handle';
      const marker: '| NULL' | '| 0n' = tsKind === 'pointer' ? '| NULL' : '| 0n';
      const hasMarker = tsKind === 'pointer' ? param.hasNull : param.has0n;
      const headerParam = headerByName.get(param.name);
      if (!headerParam || !confident) {
        findings.push({
          kind: 'UNMATCHED',
          method: method.name,
          symbol: method.symbolName,
          param: param.name,
          paramBase: param.baseType,
          marker,
          line: method.line,
          header: proto.header,
          note: `header params: ${proto.params.map((entry) => entry.name).join(', ') || '(none)'}`,
        });
        continue;
      }
      const sameType = headerParam.ctype.replace(/\s+/g, '') === param.baseType.replace(/\s+/g, '');
      const headerIsPointer = headerParam.array || headerParam.ctype.endsWith('*') || isDataPointer(headerParam.ctype);
      const headerIsKnownHandle = HANDLE_CTYPES.has(headerParam.ctype) && !headerParam.array;
      const strongMismatch = !sameType && ((tsKind === 'pointer' && headerIsKnownHandle && !headerIsPointer) || (tsKind === 'handle' && isDataPointer(headerParam.ctype)));
      if (strongMismatch) {
        findings.push({
          kind: 'TYPE_MISMATCH',
          method: method.name,
          symbol: method.symbolName,
          param: param.name,
          paramBase: param.baseType,
          ctype: headerParam.ctype,
          line: method.line,
          header: proto.header,
          note: `${headerParam.optional ? 'optional' : 'required'}; TS=${param.baseType}(${tsKind}) header=${headerParam.ctype}`,
        });
        continue;
      }
      if (headerParam.optional && !hasMarker) {
        findings.push({
          kind: 'MISSING',
          method: method.name,
          symbol: method.symbolName,
          param: param.name,
          paramBase: param.baseType,
          marker,
          ctype: headerParam.ctype,
          line: method.line,
          header: proto.header,
        });
      } else if (!headerParam.optional && hasMarker) {
        findings.push({
          kind: 'SPURIOUS',
          method: method.name,
          symbol: method.symbolName,
          param: param.name,
          paramBase: param.baseType,
          marker,
          ctype: headerParam.ctype,
          line: method.line,
          header: proto.header,
        });
      }
    }
  }
  return { findings, className };
}

// ── Fix application (MISSING only) ──────────────────────────────────────────

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyMissingFixes(pkg: string, className: string, findings: Finding[]): { applied: number; skipped: Finding[] } {
  const filePath = join(PACKAGES, pkg, 'structs', `${className}.ts`);
  const lines = readFileSync(filePath, 'utf-8').split('\n');
  const missing = findings.filter((finding) => finding.kind === 'MISSING');
  const byLine = new Map<number, Finding[]>();
  for (const finding of missing) {
    if (!byLine.has(finding.line)) byLine.set(finding.line, []);
    byLine.get(finding.line)!.push(finding);
  }
  let applied = 0;
  const skipped: Finding[] = [];
  for (const [lineNumber, lineFindings] of byLine) {
    const index = lineNumber - 1;
    let line = lines[index];
    if (!line || !/public\s+static/.test(line) || !line.includes('{')) {
      skipped.push(...lineFindings);
      continue;
    }
    for (const finding of lineFindings) {
      const paramRe = new RegExp(`(\\b${escapeRegex(finding.param!)}\\s*:\\s*${escapeRegex(finding.paramBase!)})(\\s*[),])`);
      if (paramRe.test(line)) {
        line = line.replace(paramRe, `$1 ${finding.marker}$2`);
        applied++;
      } else {
        skipped.push(finding);
      }
    }
    lines[index] = line;
  }
  if (applied > 0) writeFileSync(filePath, lines.join('\n'));
  if (missing.some((finding) => finding.marker === '| NULL' && !skipped.includes(finding))) {
    ensureNullImport(filePath);
  }
  return { applied, skipped };
}

function ensureNullImport(structsFilePath: string): void {
  let source = readFileSync(structsFilePath, 'utf-8');
  const importMatch = source.match(/(import\s+type\s*\{)([^}]*)(\}\s*from\s*['"][^'"]*types\/[^'"]*['"];)/);
  if (!importMatch) return;
  const names = importMatch[2]
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (names.includes('NULL')) return;
  names.push('NULL');
  names.sort();
  source = source.replace(importMatch[0], `${importMatch[1]} ${names.join(', ')} ${importMatch[3]}`);
  writeFileSync(structsFilePath, source);
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const doAll = argv.includes('--all');
const doJson = argv.includes('--json');
const doFix = argv.includes('--fix');
const strict = argv.includes('--strict');
const targets = doAll ? readdirSync(PACKAGES).filter((directory) => directory !== 'core' && directory !== 'template' && existsSync(join(PACKAGES, directory, 'structs'))) : argv.filter((argument) => !argument.startsWith('--'));

if (targets.length === 0) {
  console.error('Usage: bun run scripts/nullcheck.ts <package...> | --all  [--json] [--fix] [--strict]');
  process.exit(2);
}

const allFunctionNames: string[] = [];
for (const pkg of targets) {
  const structsDir = join(PACKAGES, pkg, 'structs');
  if (!existsSync(structsDir)) continue;
  const structFiles = readdirSync(structsDir).filter((file) => file.endsWith('.ts'));
  if (structFiles.length === 0) continue;
  const source = readFileSync(join(structsDir, structFiles[0]), 'utf-8');
  for (const match of source.matchAll(/(\w+)\s*:\s*\{\s*args\s*:/g)) allFunctionNames.push(match[1]);
}
functionSet = new Set(allFunctionNames);
if (!doJson) console.error(`Indexing ${functionSet.size} symbols across SDK headers...`);
buildSdkIndex(allFunctionNames);
if (!doJson) console.error(`SDK index: ${sdkIndex.size} functions located, ${[...sdkIndex.values()].filter((proto) => proto.found).length} with parsed params.\n`);

const totals = {
  missing: 0,
  spurious: 0,
  unmatched: 0,
  noSdk: 0,
  mismatch: 0,
  applied: 0,
};
const perPackage: Record<string, Finding[]> = {};

for (const pkg of targets.sort()) {
  const { findings, className } = auditPackage(pkg);
  if (!className) continue;
  const missing = findings.filter((finding) => finding.kind === 'MISSING');

  let applied = 0;
  let skipped: Finding[] = [];
  if (doFix && missing.length > 0) {
    const result = applyMissingFixes(pkg, className, findings);
    applied = result.applied;
    skipped = result.skipped;
  }

  totals.missing += missing.length;
  totals.spurious += findings.filter((finding) => finding.kind === 'SPURIOUS').length;
  totals.unmatched += findings.filter((finding) => finding.kind === 'UNMATCHED').length;
  totals.noSdk += findings.filter((finding) => finding.kind === 'NO_SDK').length;
  totals.mismatch += findings.filter((finding) => finding.kind === 'TYPE_MISMATCH').length;
  totals.applied += applied;
  if (findings.length > 0) perPackage[pkg] = findings;

  if (doJson || findings.length === 0) continue;

  const counts = (kind: Kind) => findings.filter((finding) => finding.kind === kind).length;
  console.log(
    `\n═══ ${pkg} (${className}) ═══  MISSING=${counts('MISSING')} SPURIOUS=${counts('SPURIOUS')} UNMATCHED=${counts('UNMATCHED')} NO_SDK=${counts('NO_SDK')} TYPE_MISMATCH=${counts('TYPE_MISMATCH')}${doFix ? ` APPLIED=${applied}` : ''}`,
  );
  for (const finding of findings.filter((entry) => entry.kind === 'MISSING')) console.log(`  MISSING  L${finding.line} ${finding.method}(${finding.param}: ${finding.paramBase}) -> add ${finding.marker}   [${finding.header}]`);
  for (const finding of findings.filter((entry) => entry.kind === 'TYPE_MISMATCH')) console.log(`  TYPEMISM L${finding.line} ${finding.method}(${finding.param}) ${finding.note}   [${finding.header}]`);
  for (const finding of findings.filter((entry) => entry.kind === 'SPURIOUS'))
    console.log(`  SPURIOUS L${finding.line} ${finding.method}(${finding.param}: ${finding.paramBase} ${finding.marker}) header says required   [${finding.header}]`);
  for (const finding of findings.filter((entry) => entry.kind === 'UNMATCHED')) console.log(`  UNMATCH  L${finding.line} ${finding.method}(${finding.param}: ${finding.paramBase})`);
  if (doFix && skipped.length) for (const finding of skipped) console.log(`  SKIP-FIX L${finding.line} ${finding.method}(${finding.param}) — could not auto-edit (multiline / no match)`);
  const noSdk = findings.filter((entry) => entry.kind === 'NO_SDK');
  if (noSdk.length <= 40) for (const finding of noSdk) console.log(`  NO_SDK   L${finding.line} ${finding.method}  [${finding.note}]`);
  else console.log(`  NO_SDK   ${noSdk.length} functions not in headers`);
}

if (doJson) {
  console.log(JSON.stringify({ totals, packages: perPackage }, null, 2));
} else {
  console.log(`\n═══════════════ SUMMARY ═══════════════`);
  console.log(`  MISSING=${totals.missing}  TYPE_MISMATCH=${totals.mismatch}  SPURIOUS=${totals.spurious}  UNMATCHED=${totals.unmatched}  NO_SDK=${totals.noSdk}${doFix ? `  APPLIED=${totals.applied}` : ''}`);
  if (totals.missing > 0) console.log(`  ✗ ${totals.missing} MISSING nullable union(s) — run with --fix to add them.`);
  else console.log(`  ✓ No missing nullable unions.`);
  if (strict && totals.mismatch > 0) console.log(`  ✗ ${totals.mismatch} TYPE_MISMATCH (--strict).`);
}

process.exit(totals.missing > 0 || (strict && totals.mismatch > 0) ? 1 : 0);

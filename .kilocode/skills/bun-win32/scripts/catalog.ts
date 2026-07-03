#!/usr/bin/env bun
/**
 * catalog.ts — DLL export catalog + SDK prototype extraction.
 *
 * Usage:
 *   bun run scripts/catalog.ts <dll-name> [--log] [--json] [--rg=<path>] [--dll=<path>]
 *
 * With --log: appends output to packages/{name}/.generation-log.md
 * With --json: emits machine-readable JSON to stdout
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

interface ExportEntry {
  forwardedTo: string | null;
  hint: string;
  name: string;
  ordinal: number;
  relativeVirtualAddress: string;
}

interface ParameterEntry {
  isNullable: boolean;
  name: string;
  rawText: string;
  type: string;
}

interface PrototypeEntry {
  headerName: string;
  parameterEntries: ParameterEntry[];
  prototypeText: string;
  returnType: string;
}

const repositoryRoot = join(import.meta.dir, '../..');
const packageDirectoryRoot = join(repositoryRoot, 'packages');

const argumentList = process.argv.slice(2);
const packageName = argumentList.find((argument) => !argument.startsWith('--'));
const shouldWriteLog = argumentList.includes('--log');
const shouldEmitJson = argumentList.includes('--json');

if (!packageName) {
  console.error('Usage: bun run scripts/catalog.ts <dll-name> [--log] [--json] [--rg=<path>]');
  process.exit(1);
}

const ripgrepExecutablePath = resolveRipgrepExecutablePath();
const dllPath = resolveDllPath(packageName);
const sdkIncludeRootPath = resolveWindowsSdkIncludeRootPath();
const headerSearchPaths = [join(sdkIncludeRootPath, 'shared'), join(sdkIncludeRootPath, 'um')].filter(existsSync);

const exportEntries = readExportEntries(dllPath);
const prototypeEntriesByName = new Map<string, PrototypeEntry | null>();

for (const exportEntry of exportEntries) {
  prototypeEntriesByName.set(exportEntry.name, findPrototypeEntry(exportEntry.name, headerSearchPaths));
}

if (shouldEmitJson) {
  const jsonPayload = {
    capturedAt: new Date().toISOString(),
    dllPath,
    exports: exportEntries.map((exportEntry) => {
      const prototypeEntry = prototypeEntriesByName.get(exportEntry.name) ?? null;
      return {
        forwardedTo: exportEntry.forwardedTo,
        headerName: prototypeEntry?.headerName ?? null,
        name: exportEntry.name,
        ordinal: exportEntry.ordinal,
        parameters:
          prototypeEntry?.parameterEntries.map((parameterEntry) => ({
            isNullable: parameterEntry.isNullable,
            name: parameterEntry.name,
            type: parameterEntry.type,
          })) ?? [],
        prototypeText: prototypeEntry?.prototypeText ?? null,
        returnType: prototypeEntry?.returnType ?? null,
      };
    }),
    packageName,
    sdkIncludeRootPath,
  };

  console.log(JSON.stringify(jsonPayload, null, 2));
} else {
  const reportText = createCatalogReport(packageName, dllPath, sdkIncludeRootPath, exportEntries, prototypeEntriesByName);

  if (shouldWriteLog) {
    const generationLogPath = join(packageDirectoryRoot, packageName, '.generation-log.md');

    if (!existsSync(generationLogPath)) {
      console.error(`Generation log not found: ${generationLogPath}`);
      process.exit(1);
    }

    const existingGenerationLog = readFileSync(generationLogPath, 'utf8');
    const updatedGenerationLog = replaceSection(existingGenerationLog, 'EXPORT-CATALOG', reportText.trim());
    writeFileSync(generationLogPath, updatedGenerationLog);

    console.log(`Wrote export catalog to ${generationLogPath}`);
  }

  console.log(reportText);
}

function resolveDllPath(packageName: string): string {
  const explicitPathArgument = argumentList.find((argument) => argument.startsWith('--dll='));

  if (explicitPathArgument) {
    return explicitPathArgument.slice('--dll='.length);
  }

  const windowsDirectoryPath = process.env.WINDIR ?? 'C:\\Windows';
  return join(windowsDirectoryPath, 'System32', `${packageName}.dll`);
}

function resolveWindowsSdkIncludeRootPath(): string {
  const windowsSdkIncludeDirectoryPath = 'C:\\Program Files (x86)\\Windows Kits\\10\\Include';

  if (!existsSync(windowsSdkIncludeDirectoryPath)) {
    throw new Error(`Windows SDK include directory not found: ${windowsSdkIncludeDirectoryPath}`);
  }

  const versionDirectoryNames = readdirSync(windowsSdkIncludeDirectoryPath).filter((directoryName) => /^\d+\.\d+\.\d+\.\d+$/.test(directoryName));
  versionDirectoryNames.sort(compareSdkVersionsDescending);

  for (const versionDirectoryName of versionDirectoryNames) {
    const versionDirectoryPath = join(windowsSdkIncludeDirectoryPath, versionDirectoryName);

    if (existsSync(join(versionDirectoryPath, 'um'))) {
      return versionDirectoryPath;
    }
  }

  throw new Error(`No usable SDK include directory found under ${windowsSdkIncludeDirectoryPath}`);
}

function compareSdkVersionsDescending(leftVersion: string, rightVersion: string): number {
  const leftParts = leftVersion.split('.').map(Number);
  const rightParts = rightVersion.split('.').map(Number);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return rightPart - leftPart;
    }
  }

  return 0;
}

function readExportEntries(dllPath: string): ExportEntry[] {
  if (!existsSync(dllPath)) {
    throw new Error(`DLL not found: ${dllPath}`);
  }

  const dumpbinPath = join(repositoryRoot, 'bin', 'dumpbin.exe');
  const dumpbinOutput = execFileSync(dumpbinPath, ['/EXPORTS', dllPath], {
    encoding: 'utf8',
    windowsHide: true,
  });

  const exportEntries: ExportEntry[] = [];
  let insideExportTable = false;

  for (const line of dumpbinOutput.split(/\r?\n/)) {
    if (line.includes('ordinal hint RVA      name')) {
      insideExportTable = true;
      continue;
    }

    if (!insideExportTable) {
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    if (line.trim() === 'Summary') {
      break;
    }

    const exportMatch = line.match(/^\s*(\d+)\s+([0-9A-F]+)\s+(?:([0-9A-F]+)\s+)?(\S+)(?:\s+\(forwarded to ([^)]+)\))?\s*$/);

    if (!exportMatch) {
      continue;
    }

    exportEntries.push({
      forwardedTo: exportMatch[5] ?? null,
      hint: exportMatch[2],
      name: exportMatch[4],
      ordinal: Number.parseInt(exportMatch[1], 10),
      relativeVirtualAddress: exportMatch[3] ?? '(forwarded)',
    });
  }

  return exportEntries;
}

function findPrototypeEntry(functionName: string, headerSearchPaths: string[]): PrototypeEntry | null {
  const rgArguments = ['-l', '--glob', '*.h', `\\b${functionName}\\s*\\(`, ...headerSearchPaths];
  let rgOutput = '';

  try {
    rgOutput = execFileSync(ripgrepExecutablePath, rgArguments, {
      encoding: 'utf8',
      windowsHide: true,
    });
  } catch (error) {
    return null;
  }

  const headerPaths = rgOutput
    .split(/\r?\n/)
    .map((headerPath) => headerPath.trim())
    .filter(Boolean);

  for (const headerPath of headerPaths) {
    const prototypeEntry = extractPrototypeEntry(headerPath, functionName);

    if (prototypeEntry) {
      return prototypeEntry;
    }
  }

  return null;
}

function resolveRipgrepExecutablePath(): string {
  const explicitPathArgument = argumentList.find((argument) => argument.startsWith('--rg='));

  if (explicitPathArgument) {
    return explicitPathArgument.slice('--rg='.length);
  }

  const candidatePaths = [
    'rg',
    join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Links', 'rg.exe'),
    join(process.env.ProgramData ?? '', 'chocolatey', 'bin', 'rg.exe'),
    join(process.env.USERPROFILE ?? '', 'scoop', 'shims', 'rg.exe'),
    'C:\\Program Files\\Git\\usr\\bin\\rg.exe',
  ];

  for (const candidatePath of candidatePaths) {
    try {
      execFileSync(candidatePath, ['--version'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      return candidatePath;
    } catch {
      continue;
    }
  }

  throw new Error(
    [
      'ripgrep (rg) is required for SDK header lookup and was not found.',
      'Install it (winget install BurntSushi.ripgrep.MSVC) or pass --rg=<path-to-rg.exe>.',
      'Without rg, every prototype lookup silently returns null — do not proceed with a bind without it.',
    ].join('\n'),
  );
}

function extractPrototypeEntry(headerPath: string, functionName: string): PrototypeEntry | null {
  const headerText = readFileSync(headerPath, 'utf8');
  const headerLines = headerText.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < headerLines.length; lineIndex += 1) {
    if (!new RegExp(`\\b${functionName}\\s*\\(`).test(headerLines[lineIndex])) {
      continue;
    }

    const parameterLines: string[] = [];
    let parenthesisDepth = 0;

    for (let prototypeLineIndex = lineIndex; prototypeLineIndex < headerLines.length; prototypeLineIndex += 1) {
      const prototypeLine = headerLines[prototypeLineIndex];
      parameterLines.push(prototypeLine);
      parenthesisDepth += (prototypeLine.match(/\(/g) ?? []).length;
      parenthesisDepth -= (prototypeLine.match(/\)/g) ?? []).length;

      if (parenthesisDepth <= 0 && prototypeLine.trim().endsWith(');')) {
        break;
      }
    }

    const provisionalReturnType = readReturnType(headerLines, lineIndex, functionName);
    const prototypePrefixLines = readPrototypePrefixLines(headerLines, lineIndex, provisionalReturnType);
    const prototypeText = [...prototypePrefixLines, ...parameterLines].join('\n').trim();
    const returnType = deriveReturnTypeFromPrototypeText(prototypeText, functionName) || provisionalReturnType;
    const parameterEntries = parseParameterEntries(parameterLines.join('\n'));

    return {
      headerName: headerPath.split(/[/\\]/).pop() ?? headerPath,
      parameterEntries,
      prototypeText,
      returnType,
    };
  }

  return null;
}

function readReturnType(headerLines: string[], functionLineIndex: number, functionName: string): string {
  const functionLine = headerLines[functionLineIndex];
  const sameLinePattern = new RegExp(`^(.*?)\\b${functionName}\\s*\\(`);
  const sameLineMatch = sameLinePattern.exec(functionLine);

  if (sameLineMatch && sameLineMatch[1].trim()) {
    const candidate = stripCallingConventionMacros(sameLineMatch[1].trim()).replace(/\s+/g, ' ').trim();

    if (candidate) {
      return candidate;
    }
  }

  for (let lineIndex = functionLineIndex - 1; lineIndex >= Math.max(0, functionLineIndex - 12); lineIndex -= 1) {
    const trimmedLine = headerLines[lineIndex].trim();

    if (!trimmedLine) {
      break;
    }

    if (trimmedLine === ');' || trimmedLine === ';' || trimmedLine === ')') {
      continue;
    }

    if (trimmedLine.includes('(') || trimmedLine.includes(')') || trimmedLine.endsWith(';')) {
      continue;
    }

    if (isMacroLine(trimmedLine)) {
      continue;
    }

    return stripCallingConventionMacros(trimmedLine).replace(/\s+/g, ' ');
  }

  return 'UNKNOWN';
}

function readPrototypePrefixLines(headerLines: string[], functionLineIndex: number, returnType: string): string[] {
  const prototypePrefixLines: string[] = [];

  for (let lineIndex = functionLineIndex - 1; lineIndex >= Math.max(0, functionLineIndex - 12); lineIndex -= 1) {
    const trimmedLine = headerLines[lineIndex].trim();

    if (!trimmedLine) {
      break;
    }

    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
      continue;
    }

    if (trimmedLine === ');' || trimmedLine === ';' || trimmedLine === ')') {
      break;
    }

    prototypePrefixLines.unshift(headerLines[lineIndex]);

    if (trimmedLine === returnType) {
      break;
    }
  }

  return prototypePrefixLines;
}

function parseParameterEntries(prototypeText: string): ParameterEntry[] {
  const parenthesizedMatch = prototypeText.match(/\(([\s\S]*)\)/);

  if (!parenthesizedMatch) {
    return [];
  }

  const parameterText = stripEmbeddedComments(parenthesizedMatch[1]).trim();

  if (!parameterText || parameterText === 'void' || parameterText === 'VOID') {
    return [];
  }

  const rawParameterEntries = splitTopLevelCommaSeparatedText(parameterText);
  const parameterEntries: ParameterEntry[] = [];

  for (const rawParameterText of rawParameterEntries) {
    const normalizedParameterText = rawParameterText.trim().replace(/\s+/g, ' ');
    const cleanedParameterText = stripSalAnnotations(normalizedParameterText)
      .replace(/\b(?:IN OUT|OUT IN|IN|OUT|OPTIONAL)\b\s*/g, '')
      .replace(/\bCONST\b\s+/g, '')
      .replace(/\bconst\b\s+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const parameterMatch = cleanedParameterText.match(/^(.*?)([A-Za-z_]\w*)$/);

    if (!parameterMatch) {
      continue;
    }

    const parameterType = parameterMatch[1].trim().replace(/\s+\*/g, '*');
    const parameterName = parameterMatch[2];

    if (parameterName === 'VOID' || parameterName === 'void') {
      continue;
    }

    if (parameterType === '') {
      continue;
    }

    parameterEntries.push({
      isNullable: /_opt_|OPTIONAL|_Reserved_/i.test(normalizedParameterText),
      name: parameterName,
      rawText: normalizedParameterText,
      type: parameterType,
    });
  }

  return parameterEntries;
}

function stripEmbeddedComments(parameterText: string): string {
  return parameterText
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/\s+/g, ' ');
}

function stripSalAnnotations(parameterText: string): string {
  let result = '';
  let index = 0;

  while (index < parameterText.length) {
    const character = parameterText[index];

    if (character !== '_') {
      result += character;
      index += 1;
      continue;
    }

    let identifierEnd = index + 1;

    while (identifierEnd < parameterText.length && /[A-Za-z0-9_]/.test(parameterText[identifierEnd]!)) {
      identifierEnd += 1;
    }

    const identifierText = parameterText.slice(index, identifierEnd);

    if (!/[a-z]/.test(identifierText)) {
      result += character;
      index += 1;
      continue;
    }

    let argumentStart = identifierEnd;

    while (argumentStart < parameterText.length && parameterText[argumentStart] === ' ') {
      argumentStart += 1;
    }

    let consumedEnd = identifierEnd;

    if (parameterText[argumentStart] === '(') {
      let cursor = argumentStart + 1;
      let depth = 1;

      while (cursor < parameterText.length && depth > 0) {
        const cursorCharacter = parameterText[cursor];

        if (cursorCharacter === '(') {
          depth += 1;
        } else if (cursorCharacter === ')') {
          depth -= 1;
        }

        cursor += 1;
      }

      consumedEnd = cursor;
    }

    while (consumedEnd < parameterText.length && parameterText[consumedEnd] === ' ') {
      consumedEnd += 1;
    }

    index = consumedEnd;
  }

  return result;
}

function deriveReturnTypeFromPrototypeText(prototypeText: string, functionName: string): string {
  const prototypeLines = prototypeText.split(/\r?\n/);
  const functionNamePattern = new RegExp(`\\b${functionName}\\s*\\(`);

  for (let lineIndex = 0; lineIndex < prototypeLines.length; lineIndex += 1) {
    const functionLineMatch = functionNamePattern.exec(prototypeLines[lineIndex]);

    if (!functionLineMatch) {
      continue;
    }

    const beforeFunctionNameOnSameLine = prototypeLines[lineIndex].slice(0, functionLineMatch.index).trim();

    if (beforeFunctionNameOnSameLine) {
      const candidate = stripCallingConventionMacros(beforeFunctionNameOnSameLine).replace(/\s+/g, ' ').trim();

      if (candidate) {
        return candidate;
      }
    }

    for (let previousLineIndex = lineIndex - 1; previousLineIndex >= 0; previousLineIndex -= 1) {
      const trimmedLine = prototypeLines[previousLineIndex].trim();

      if (!trimmedLine) {
        continue;
      }

      if (trimmedLine === ');' || trimmedLine === ';' || trimmedLine === ')') {
        continue;
      }

      if (isMacroLine(trimmedLine)) {
        continue;
      }

      return stripCallingConventionMacros(trimmedLine).replace(/\s+/g, ' ');
    }
  }

  return 'UNKNOWN';
}

function stripCallingConventionMacros(returnTypeText: string): string {
  const callingConventionPattern = /\s+\b(?:WINAPI|APIENTRY|NTAPI|CALLBACK|WINAPIV|STDAPI|STDAPICALLTYPE|STDMETHODCALLTYPE|WINBASEAPI|WINUSERAPI|WINADVAPI|NTSYSAPI|WSAAPI|SOCKAPI|PASCAL)\b\s*/g;
  return returnTypeText.replace(callingConventionPattern, ' ').trim();
}

function splitTopLevelCommaSeparatedText(text: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let parenthesisDepth = 0;

  for (const character of text) {
    if (character === '(') {
      parenthesisDepth += 1;
      currentValue += character;
      continue;
    }

    if (character === ')') {
      parenthesisDepth -= 1;
      currentValue += character;
      continue;
    }

    if (character === ',' && parenthesisDepth === 0) {
      values.push(currentValue);
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  if (currentValue.trim()) {
    values.push(currentValue);
  }

  return values;
}

function createCatalogReport(packageName: string, dllPath: string, sdkIncludeRootPath: string, exportEntries: ExportEntry[], prototypeEntriesByName: Map<string, PrototypeEntry | null>): string {
  const forwardedExportCount = exportEntries.filter((exportEntry) => exportEntry.forwardedTo !== null).length;
  const exportSections = exportEntries.map((exportEntry) => createExportSection(exportEntry, prototypeEntriesByName.get(exportEntry.name) ?? null));

  return `- Captured: \`${new Date().toISOString()}\`
- DLL path: \`${dllPath}\`
- SDK include: \`${sdkIncludeRootPath}\`
- Export count: \`${exportEntries.length}\`
- Forwarded exports: \`${forwardedExportCount}\`

### Export Details

${exportSections.join('\n\n')}`;
}

function createExportSection(exportEntry: ExportEntry, prototypeEntry: PrototypeEntry | null): string {
  const parameterLines =
    prototypeEntry && prototypeEntry.parameterEntries.length > 0
      ? prototypeEntry.parameterEntries.map((parameterEntry) => `  - \`${parameterEntry.name}\`: \`${parameterEntry.type}\`${parameterEntry.isNullable ? ' (nullable)' : ''}`).join('\n')
      : '  - _Prototype not found in SDK headers._';

  const prototypeBlock = prototypeEntry ? `\n\`\`\`c\n${prototypeEntry.prototypeText}\n\`\`\`` : '';

  return `#### \`${exportEntry.name}\`

- Ordinal: \`${exportEntry.ordinal}\`
- Hint: \`${exportEntry.hint}\`
- RVA: \`${exportEntry.relativeVirtualAddress}\`
- Forwarded to: ${exportEntry.forwardedTo ? `\`${exportEntry.forwardedTo}\`` : '_No_'}
- Header: ${prototypeEntry ? `\`${prototypeEntry.headerName}\`` : '_Unknown_'}
- Return type: ${prototypeEntry ? `\`${prototypeEntry.returnType}\`` : '_Unknown_'}
- Parameters:
${parameterLines}${prototypeBlock}`;
}

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

function isMacroLine(lineText: string): boolean {
  if (lineText === 'WINAPI' || lineText === 'APIENTRY' || lineText === 'NTAPI' || lineText === 'CALLBACK') {
    return true;
  }

  return /^[A-Z0-9_]*API(?:ENTRY)?$/.test(lineText);
}

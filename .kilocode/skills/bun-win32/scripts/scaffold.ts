#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface ReplacementMap {
  [key: string]: string;
}

const repositoryRoot = join(import.meta.dir, '../..');
const templateDirectoryPath = join(repositoryRoot, 'packages', 'template');
const packagesDirectoryPath = join(repositoryRoot, 'packages');

const argumentList = process.argv.slice(2);
const packageName = argumentList.find((argument) => !argument.startsWith('--'));

if (!packageName) {
  console.error('Usage: bun run scripts/scaffold.ts <dll-name>');
  process.exit(1);
}

const packageDirectoryPath = join(packagesDirectoryPath, packageName);

if (existsSync(packageDirectoryPath)) {
  console.error(`Package directory already exists: ${packageDirectoryPath}`);
  process.exit(1);
}

const className = toClassName(packageName);
const placeholderReplacements: ReplacementMap = {
  '@bun-win32/WIN32_CLASS': `@bun-win32/${packageName}`,
  'WIN32_CLASS.dll': `${packageName}.dll`,
  WIN32_CLASS: className,
  WIN32_DLL: packageName,
  '{Class}': className,
  '{Name}': className,
  '{NAME}': packageName.toUpperCase(),
  '{name}': packageName,
};

cpSync(templateDirectoryPath, packageDirectoryPath, {
  errorOnExist: true,
  filter: (sourcePath) => !sourcePath.includes(`${join('packages', 'template', 'node_modules')}`) && !sourcePath.includes(`${join('template', 'node_modules')}`) && !sourcePath.includes(`${join('node_modules')}`),
  force: false,
  recursive: true,
});

mkdirSync(join(packageDirectoryPath, 'example'), { recursive: true });

renameSync(join(packageDirectoryPath, 'structs', 'WIN32_CLASS.ts'), join(packageDirectoryPath, 'structs', `${className}.ts`));
renameSync(join(packageDirectoryPath, 'types', 'WIN32_CLASS.ts'), join(packageDirectoryPath, 'types', `${className}.ts`));

replacePlaceholdersRecursively(packageDirectoryPath, placeholderReplacements);
writeGenerationLog(packageDirectoryPath, packageName, className);

console.log(`Scaffolded @bun-win32/${packageName}`);
console.log(`  Package directory: ${packageDirectoryPath}`);
console.log(`  Class name: ${className}`);
console.log(`  Generation log: ${join(packageDirectoryPath, '.generation-log.md')}`);

function toClassName(dllName: string): string {
  return dllName
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

function replacePlaceholdersRecursively(directoryPath: string, placeholderReplacements: ReplacementMap): void {
  const directoryEntryNames = readdirSync(directoryPath);

  for (const directoryEntryName of directoryEntryNames) {
    const directoryEntryPath = join(directoryPath, directoryEntryName);
    const directoryEntryStats = statSync(directoryEntryPath);

    if (directoryEntryStats.isDirectory()) {
      replacePlaceholdersRecursively(directoryEntryPath, placeholderReplacements);
      continue;
    }

    const originalFileText = readFileSync(directoryEntryPath, 'utf8');
    let updatedFileText = originalFileText;

    for (const [placeholder, replacement] of Object.entries(placeholderReplacements)) {
      updatedFileText = updatedFileText.split(placeholder).join(replacement);
    }

    if (updatedFileText !== originalFileText) {
      writeFileSync(directoryEntryPath, updatedFileText);
    }
  }
}

function writeGenerationLog(packageDirectoryPath: string, packageName: string, className: string): void {
  const startedAt = new Date().toISOString();
  const generationLogPath = join(packageDirectoryPath, '.generation-log.md');
  const generationLog = `# Generation Log: ${packageName}

## Package

- DLL: \`${packageName}.dll\`
- Package: \`@bun-win32/${packageName}\`
- Class: \`${className}\`
- Started: \`${startedAt}\`

## Resume Checklist

- [x] Scaffolded from template
- [ ] Export catalog captured
- [ ] Types defined
- [ ] Symbols defined
- [ ] Methods defined
- [ ] Nullability audit finished
- [ ] Runtime probes recorded
- [ ] README, AI guide, and examples finished
- [ ] Verification finished

## Commands

\`\`\`sh
bun run scripts/scaffold.ts ${packageName}
bun run scripts/catalog.ts ${packageName} --log
\`\`\`

## Findings

- Scaffold created from \`packages/template\`.
- Replace content-specific placeholders in \`README.md\` later: \`{description}\`, \`{quickstart}\`, \`{examples}\`.

## Export Catalog

<!-- EXPORT-CATALOG:START -->
_Not captured yet._
<!-- EXPORT-CATALOG:END -->

## Runtime Probes

<!-- RUNTIME-PROBES:START -->
_Not captured yet._
<!-- RUNTIME-PROBES:END -->

## Stub Scaffold

<!-- STUB-SCAFFOLD:START -->
_Not captured yet._
<!-- STUB-SCAFFOLD:END -->
`;

  writeFileSync(generationLogPath, generationLog);
}

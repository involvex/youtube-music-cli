#!/usr/bin/env bun
/**
 * Sync canonical .agents/skills → .claude/skills (replace target tree).
 * Run after adding/removing skills under .agents/skills.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, ".agents", "skills");
const target = path.join(root, ".claude", "skills");

if (!existsSync(source)) {
  console.error(`Missing source: ${source}`);
  process.exit(1);
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}
mkdirSync(path.dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });

const names = readdirSync(source).sort();
console.log(`Synced ${names.length} skills → .claude/skills`);
for (const name of names) {
  console.log(`  - ${name}`);
}

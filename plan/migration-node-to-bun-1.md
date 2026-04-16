---
goal: Migrate project from Node.js to Bun runtime with full native API compatibility
version: 1.0
date_created: 2026-04-17
last_updated: 2026-04-17
owner: involvex
status: 'Planned'
tags: ['migration', 'bun', 'performance', 'node-replacement']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Migration plan for converting `@involvex/youtube-music-cli` from Node.js to Bun runtime. This involves replacing Node.js-specific types, removing Node.js dependencies, and updating configuration for native Bun compatibility.

## 2. Requirements & Constraints

- **REQ-001**: Replace `@types/node` with `bun-types` for TypeScript definitions
- **REQ-002**: Remove unused dev dependencies: `ts-node`, `@types/node-notifier`, `@tsconfig/*`
- **REQ-003**: Update `tsconfig.json` to use `bun-types` instead of Node types
- **REQ-004**: Keep all `node:` imports - Bun has native compatibility with Node.js built-in modules
- **REQ-005**: Ensure all scripts use Bun commands
- **REQ-006**: Verify existing Bun scripts in package.json work correctly
- **SEC-001**: Keep `node-notifier` dependency (used for desktop notifications)
- **CON-001**: Project already uses `"type": "module"` - compatible with Bun
- **CON-002**: Package uses `bun build` already - already partially migrated
- **PAT-001**: Follow the node-to-bun skill guidelines

## 3. Implementation Steps

### Implementation Phase 1 - Dependency Cleanup

- GOAL-001: Remove Node.js-specific type packages that are not needed with Bun

| Task     | Description                                                        | Completed | Date |
| -------- | ------------------------------------------------------------------ | --------- | ---- |
| TASK-001 | Remove `@types/node` from devDependencies                          |           |      |
| TASK-002 | Remove `@types/node-notifier` from devDependencies                 |           |      |
| TASK-003 | Remove all `@tsconfig/*` packages (node10, node12, node14, node16) |           |      |
| TASK-004 | Remove `ts-node` from devDependencies                              |           |      |
| TASK-005 | Ensure `@types/bun` is present (already installed)                 |           |      |

### Implementation Phase 2 - TypeScript Configuration Update

- GOAL-002: Update tsconfig.json to use Bun's native types

| Task     | Description                                                                     | Completed | Date |
| -------- | ------------------------------------------------------------------------------- | --------- | ---- |
| TASK-006 | Update tsconfig.json: replace `"types": ["node"]` with `"types": ["bun-types"]` |           |      |
| TASK-007 | Verify `moduleResolution: "bundler"` is set (already configured)                |           |      |
| TASK-008 | Verify `allowImportingTsExtensions: true` is set (already configured)           |           |      |

### Implementation Phase 3 - Package.json Updates

- GOAL-003: Update package.json for Bun compatibility

| Task     | Description                                                                 | Completed | Date |
| -------- | --------------------------------------------------------------------------- | --------- | ---- |
| TASK-009 | Update engines field: change `"node": ">=16"` to `"bun": ">=1.0"`           |           |      |
| TASK-010 | Verify all scripts use `bun` commands (already configured)                  |           |      |
| TASK-011 | Remove `node-notifier` if possible or keep (used for desktop notifications) |           |      |

### Implementation Phase 4 - Verify & Test

- GOAL-004: Verify the migration works correctly

| Task     | Description                                  | Completed | Date |
| -------- | -------------------------------------------- | --------- | ---- |
| TASK-012 | Run `bun install` to refresh dependencies    |           |      |
| TASK-013 | Run `bun run typecheck` to verify TypeScript |           |      |
| TASK-014 | Run `bun run build` to verify build          |           |      |
| TASK-015 | Run `bun run dev` to verify development mode |           |      |
| TASK-016 | Test the CLI to ensure UI renders correctly  |           |      |

### Implementation Phase 5 - Lockfile Cleanup (Optional)

- GOAL-005: Clean up old lockfiles

| Task     | Description                           | Completed | Date |
| -------- | ------------------------------------- | --------- | ---- |
| TASK-017 | Remove `package-lock.json` if present |           |      |
| TASK-018 | Verify `bun.lockb` is generated       |           |      |

## 4. Alternatives

- **ALT-001**: Keep `@types/node` alongside `bun-types` - Not recommended as it may cause type conflicts
- **ALT-002**: Use `bun-native` types - Not available; `bun-types` is the official solution
- **ALT-001**: Keep `ts-node` for legacy scripts - Not needed since Bun can run TypeScript directly

## 5. Dependencies

### Current Dependencies to Remove

- `@types/node@25.6.0` - Replaced by bun-types
- `@types/node-notifier@8.0.5` - Not needed, node-notifier works without types
- `@tsconfig/node10@1.0.12` - Not used
- `@tsconfig/node12@1.0.11` - Not used
- `@tsconfig/node14@1.0.3` - Not used
- `@tsconfig/node16@1.0.4` - Not used
- `ts-node@10.9.2` - Not needed, Bun runs TS directly

### Dependencies to Keep

- `node-notifier@10.0.1` - Desktop notifications (native module, works with Bun)
- `@types/bun@1.3.12` - Already installed, used for TypeScript

### Already Bun-Ready

- All `node:` imports work natively with Bun (fs, path, os, child_process, http, net, crypto, etc.)

## 6. Files

- **FILE-001**: `package.json` - Update dependencies and engines
- **FILE-002**: `tsconfig.json` - Update types from node to bun-types

## 7. Testing

- **TEST-001**: Run `bun run typecheck` - Should pass without @types/node
- **TEST-002**: Run `bun run build` - Should produce valid dist/output
- **TEST-003**: Run `bun run dev` - Should start development mode
- **TEST-004**: Test CLI UI - Verify no rendering issues (the "scuffed UI" issue from the bug report)

## 8. Risks & Assumptions

- **RISK-001**: node-notifier may have issues with Bun on Windows - Need to test desktop notifications
- **RISK-002**: Some packages may rely on Node.js-specific behavior - Most likely the youtube-music libraries
- **ASSUMPTION-001**: All `node:` imports will work without changes (Bun claims full Node.js compatibility)
- **ASSUMPTION-002**: The project already partially uses Bun (scripts show bun commands)
- **ASSUMPTION-003**: The "scuffed UI" issue may be unrelated to Node.js vs Bun - Will verify after migration

## 9. Related Specifications / Further Reading

- [Bun Migration Skill](file:///C:/Users/lukas/.agents/skills/node-to-bun)
- [Bun Official Docs](https://bun.sh/docs)
- [Bun TypeScript Guide](https://bun.sh/guides/runtime/typescript)

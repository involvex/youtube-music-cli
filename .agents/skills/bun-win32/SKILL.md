---
name: bun-win32
description: >
  Win32 FFI binding lifecycle for @bun-win32/* packages (Win32 DLL bindings
  via bun:ffi on Windows). Use when generating a new package from a DLL,
  auditing FFI↔TS↔header consistency, fixing nullability (| NULL / | 0n),
  or understanding the bootstrap→catalog→stub→audit→nullcheck pipeline.
  Covers 117 packages; strict TypeScript; Bun runtime; Biome formatting.
engines:
  - opencode
---

# bun-win32 Skill

Win32 FFI binding development lifecycle for the `bun-win32` monorepo.

## Repository Context

```
WORKING_DIR (repo root = ../.. from this skill directory)
  packages/       117 @bun-win32/* binding packages
  scripts/        repo automation scripts
  PROMPT.md       authoritative playbook (FFI rules, nullability, audits)
  AGENTS.md       operating rules — read before touching bindings

This skill dir: skill/bun-win32/
  SKILL.md        ← you are here
  scripts/        automation scripts (run from WORKING_DIR)
  references/     AGENTS.md, ai-core.md, ai-all.md
```

**WORKING_DIR is the repo root.** All commands run from there. Scripts in
`scripts/` use `ROOT = join(import.meta.dir, '../..')` so they resolve
correctly when executed from this skill directory.

## Lifecycle Commands (run from WORKING_DIR)

```bash
# 1. Check prerequisites (platform Windows, Bun ≥1.3.0, ripgrep, SDK, dumpbin)
bun run skill/bun-win32/scripts/doctor.ts

# 2. Full pipeline: doctor → scaffold → install → catalog → ffi-runtime → stub
bun run skill/bun-win32/scripts/bootstrap.ts {name} [--class=ClassName] [--rg=<path>] [--dll=<path>]

# 3. Individual steps
bun run skill/bun-win32/scripts/catalog.ts {name} --json        # DLL∩SDK symbols
bun run skill/bun-win32/scripts/ffi-runtime.ts {name}            # FFI return shapes
bun run skill/bun-win32/scripts/stub.ts {name} [--class=C]      # paste-ready stubs

# 4. Auditing (run after writing bindings)
bun run skill/bun-win32/scripts/audit.ts {name}        # FFI↔TS↔header consistency (--all, --fix)
bun run skill/bun-win32/scripts/nullcheck.ts {name}    # SAL nullability (--all, --fix, --strict)
bunx tsc --noEmit                                      # type-check the package
```

## Release

```bash
rm bun.lock && bun install
bun run skill/bun-win32/scripts/preflight.ts
bun run skill/bun-win32/scripts/nullcheck.ts --all && bun run skill/bun-win32/scripts/audit.ts --all
cd packages/{name} && bun publish --access public --otp <code>
```

## Scripts Reference

| Script | What it does |
|---|---|
| `scripts/doctor.ts` | Prerequisites checker |
| `scripts/bootstrap.ts` | Orchestrated full pipeline |
| `scripts/catalog.ts` | dumpbin exports ∩ SDK headers → JSON |
| `scripts/scaffold.ts` | Template → package skeleton |
| `scripts/ffi-runtime.ts` | Probe FFI return-value shapes |
| `scripts/stub.ts` | catalog JSON → Symbols + method stubs |
| `scripts/audit.ts` | FFI↔TS↔header consistency auditor |
| `scripts/nullcheck.ts` | SAL-driven nullability auditor |
| `scripts/preflight.ts` | Lockfile staleness gate |

## FFI Type Quick Reference

| Win32 type | FFI | TS |
|---|---|---|
| `HANDLE`, `HWND`, `HKEY`, `HMODULE`… | `FFIType.u64` | `bigint` |
| `SIZE_T`, `*_PTR`, `LPARAM`, `LRESULT`, `WPARAM` | `FFIType.u64` | `bigint` |
| `LARGE_INTEGER`, `ULARGE_INTEGER` | `FFIType.i64` / `u64` | `bigint` |
| `DWORD`, `UINT`, `BOOL`, `HRESULT`, `INT`, `LONG`, `WORD`, `BYTE` | `FFIType.u32` / `i32` | `number` |
| `LPVOID`, `LPCWSTR`, `LPSTR`, `LPDWORD`, `LPBYTE`… | `FFIType.ptr` | `Pointer` |
| `void` | `FFIType.void` | `void` |

**Decision rule:** Does the caller pass `.ptr` from a `Buffer`/`TypedArray` they allocated? Yes → `ptr`. No → `u64`.

**NULL:** `u64 → 0n`, `ptr → null`, `u32 → 0`.

## Key Files

- `references/agents.md` — full AGENTS.md (binding rules, toolchain, FFI rules, prohibitions)
- `references/ai-core.md` — `@bun-win32/core` contract (Win32 base class, `.ptr` extension, types)
- `references/ai-all.md` — `@bun-win32/all` contract (re-export aggregator, when to use)
- `PROMPT.md` at WORKING_DIR — deep playbook for FFI mapping, nullability, audits

## Prohibited

- Bind exports not confirmed by `dumpbin //EXPORTS`
- Guess types/nullability — always verify vs SDK header + MS Learn
- Use `as any` / forced casts — fix the FFI mapping instead
- Reformat untouched files
- Ship without running `audit.ts --all` and `nullcheck.ts --all` (zero findings required)
# AGENTS

Rules for working in **bun-win32** — a monorepo of zero-dependency Win32 FFI bindings for [Bun](https://bun.sh) on Windows. Follow them exactly.

Every system DLL is its own `@bun-win32/{name}` package (`packages/{name}/`) that binds the DLL's exports through `bun:ffi`. There is no marshaling layer: after the first call resolves a symbol via `dlopen`, every subsequent call is a direct native pointer invocation.

> **The deep playbook is [`PROMPT.md`](./PROMPT.md).** It is the authoritative, step-by-step guide for generating and completing a package (FFI type mapping, nullability, examples, audits). This file is the day-to-day operating manual: the rules, the layout, the toolchain, and the gates. When the two overlap, they agree; when you need detail, read `PROMPT.md`. Each package also ships an `AI.md` documenting its own binding contract.

---

## Core Principles

- **Plan before implementing.** Read and understand the problem, the existing code, and the surrounding context before writing anything. Do not guess at what code does — read it.
- **No fabrication — verify every claim.** This repo binds a real OS. Never guess a signature, type, nullability, or export. Verify against `dumpbin` (the source of truth for what exists), the Microsoft Learn docs page, and the Windows SDK header. Incorrect bindings segfault; incorrect information is worse than none. If you do not know, say so.
- **Minimal, surgical diffs.** Change only what the task requires. Do not "clean up," reformat, or refactor code you were not asked to touch. Do not mutate already-shipped bindings on a hunch.
- **No premature abstraction.** No helpers, wrappers, or utilities unless explicitly requested. Three similar lines beat a clever abstraction. Public method bodies are deliberately one line each.
- **Verify at every step.** After every meaningful change, prove it works: run the file (`bun run …`), type-check (`bunx tsc --noEmit`), and run the relevant audit. Do not pile changes on a broken state. Do not move on until the current step is verified.

---

## Repository Layout

```
packages/
  core/          @bun-win32/core      — the only non-binding package: Win32 base class,
                                         shared types (DWORD, HANDLE, …), runtime/extensions.ts
  template/      @bun-win32/template  — scaffold; WIN32_CLASS placeholders, no example/ dir
  all/           @bun-win32/all       — aggregator: depends on every package, re-exports each
                                         PascalCase class; home of the flagship example/ demos
  bun-win32/     bun-win32            — unscoped alias; `export * from '@bun-win32/all'`
  terminal/      @bun-win32/terminal  — high-performance terminal rendering engine (binds kernel32)
  {name}/        @bun-win32/{name}    — one package per system DLL (advapi32, kernel32, user32, …)
scripts/         repo automation (see Commands) — run with `bun run scripts/{name}.ts`
PROMPT.md        the package-generation playbook
biome.json       formatter config (Biome is the formatter; linter & assist are off)
bunfig.toml      pins linker = "hoisted"
tsconfig.json    strict; shared by every package
```

There are 117 packages. Class names are PascalCase; a few preserve native DLL casing — `OpenGL32`, `GLU32`, `Ws2_32`, `Xaudio2_9`, `Xinput1_4`, `Xinput9_1_0` — and `opengl32`/`glu32` keep native function names (`glBegin`, `gluSphere`).

### Per-package file layout

```
packages/{name}/
  index.ts                 default-import the class, re-export types — e.g. for psapi:
                             import Psapi from './structs/Psapi'; export * from './types/Psapi'; export default Psapi;
  structs/{Class}.ts       Symbols (FFI decls) + public static methods
  types/{Class}.ts         type aliases, enums, constants (re-export shared types from core)
  example/                 runnable demos (≥ 2: one creative, one professional)
  AI.md  README.md  package.json  tsconfig.json
```

No other files or directories in a package. `core` exports `{ Win32 }` (named) instead of a default.

---

## Architecture: the `Win32` Base Class

Every package subclass extends `Win32` from `@bun-win32/core`. You do **not** call `dlopen` yourself.

1. `protected static override readonly name = '{name}.dll';`
2. Override `Symbols` with the FFI declarations: `as const satisfies Record<string, FFIFunction>`.
3. Expose `public static` methods whose body is always one line: `return {Class}.Load('ExportName')(args);`

- **`Load(method)`** — lazy. On first call, `dlopen`s **only that one export**, then memoizes the native function with `Object.defineProperty` (non-configurable). Zero startup cost; each export binds at most once.
- **`Preload(methods?)`** — eager. Binds all (or a named subset of) symbols up front for hot paths; skips already-bound ones. Destructure **after** `Preload`, or you capture the lazy wrapper instead of the native function.
- **`core/runtime/extensions.ts`** is imported for its side effect: it adds a non-enumerable `.ptr` getter to `ArrayBuffer`, `Buffer`, `DataView`, and the `TypedArray`s. That is why examples write `buffer.ptr`.

---

## Toolchain

- **Runtime: Bun.** Default to Bun in everything. Use Bun-native APIs (`Bun.file`, `Bun.write`, `Bun.env`, `Bun.argv`, `Bun.sleep`, `bun:test`) over the `process.*`/Node equivalents. Never use `npm`, `yarn`, or `npx`.
- **Formatter: Biome** (`@biomejs/biome`, formatter only — linter and assist are disabled). Settings are fixed in `biome.json`: 2-space indent, **line width 240**, LF line endings; JS uses **single quotes**, **always semicolons**, **all** trailing commas, **always** arrow parens. Prettier has been removed — do not reintroduce it or any other formatter/linter.
- **TypeScript: strict**, shared `tsconfig.json`: `strict`, `verbatimModuleSyntax`, `noImplicitOverride`, `moduleResolution: "bundler"`, `allowImportingTsExtensions`, `types: ["bun"]`, `skipLibCheck`. (`noUncheckedIndexedAccess` is intentionally `false`.)
- **`bunfig.toml` pins `linker = "hoisted"`** so the IDE's TS server sees `@types/bun`, `@types/node`, and `bun-types` hoisted at the repo root. Do not change the linker.
- **No root `package.json` scripts.** Everything runs directly via `bun run` / `bunx`. Versions are pinned at the root and inherited by every package (packages declare only `peerDependencies: { typescript: "^5" }`).

### Commands

```bash
# Verify (run constantly)
bun run packages/{name}/index.ts          # smoke-test a package loads
bun run packages/{name}/example/foo.ts    # run a demo
bunx tsc --noEmit                          # type-check
bunx biome format --write packages/{name}  # format

# Type gates — must report zero problems before anything ships
bun run scripts/audit.ts {name}            # FFI symbol ↔ TS type ↔ SDK-header consistency (--all, --fix)
bun run scripts/nullcheck.ts {name}        # SAL-driven | NULL / | 0n nullability (--all, --fix, --strict)
bun run scripts/preflight.ts               # pre-publish lockfile-staleness gate

# Generating / completing a package
bun run scripts/doctor.ts                  # check prerequisites (platform, Bun, ripgrep, SDK, dumpbin)
bun run scripts/bootstrap.ts {name}        # orchestrates: doctor → scaffold → install → catalog → ffi-runtime → stub
bun run scripts/scaffold.ts {name}         # copy template → packages/{name}, substitute placeholders
bun run scripts/catalog.ts {name} --json   # DLL exports ∩ SDK-header C prototypes
bun run scripts/stub.ts {name}             # catalog JSON → paste-ready Symbols + method stubs
bun run scripts/ffi-runtime.ts             # probe Bun FFI return-value shapes (kernel32/normaliz)

# Dump exports (the source of truth for what may be bound)
./bin/dumpbin.exe //EXPORTS 'C:\Windows\System32\{name}.dll'
```

---

## FFI Binding Rules

The full treatment is `PROMPT.md` §5–§9. The non-negotiables:

- **`FFIType.u64` (TS `bigint`)** for **all** handles (`HANDLE`, `HWND`, `HKEY`, …), **all** pointer-sized integers (`SIZE_T`, `*_PTR`, `WPARAM`/`LPARAM`/`LRESULT`, `LARGE_INTEGER`), and **remote/opaque pointers** (addresses in another process — never dereferenced locally). A name containing `PTR` does **not** make it a pointer.
- **`FFIType.ptr` (TS `Pointer`)** for **local** data the caller allocates — `LP*`/`P*` buffers, strings, by-ref structs — and for **callback pointers** the caller builds with `CFunction`/`JSCallback`.
- **Decision rule:** "Does the caller pass `.ptr` from a `Buffer`/`TypedArray` they allocated?" Yes → `ptr`. No → `u64`.
- **By-value small structs** (e.g. 8-byte `POINT`) are packed into a `bigint` and passed as `u64` (see `packPOINT` in `user32`).
- **NULL-return representation follows the FFI type:** `u64 → 0n`, `ptr → null`, `u32 → 0`. A function that "returns NULL on success" with an `HLOCAL` return type returns `0n`, not `null`; the caller checks `=== 0n`.
- **Nullability is SAL-header-first.** If the SDK header annotates a parameter `_*opt_`, `OPTIONAL`, or `_Reserved_`, mark it nullable: pointer params get `| NULL`, handle params get `| 0n`. **Only the TS signature changes — never the FFI type.** Cross-check the docs page (C prototype, Parameters, Return value, Remarks). The sizing-call pattern (NULL buffer to get the size) means that buffer is `| NULL`. Run `nullcheck.ts` to audit and `--fix`.
- **No type casts. Ever.** No `as any`, no `as unknown as T`, no forced casts — in structs, types, examples, or tests. If the types disagree, the FFI mapping or the alias is wrong; fix the root cause. The only allowed narrowing is `!` (non-null assertion), `BigInt()` (number → handle), and explicit annotations to break circular inference. Prefer `satisfies` over `as`; `as const` only for literal narrowing.

### Symbols, methods, and types

- **Bind only `dumpbin`-confirmed exports.** Bind both A and W variants. Never bind forwarded functions or undocumented internals. Use the exact export name (capitalization matters).
- **One Microsoft Learn URL comment** above each public method.
- **Exact Win32 parameter names** — `hWnd`, `lpBuffer`, `dwSize`. This is the **one** exception to the no-abbreviations rule; everywhere else use full words (`processIdentifier`, not `procId`).
- **Alphabetize everything** ASCIIbetically (uppercase before lowercase): symbols, methods, type aliases, enums, enum members — unless order is semantically meaningful.
- **Hex literals with numeric separators** for sizes, offsets, flags, and constants (`0x0000_0001`, `0x238`).
- **`types/{Class}.ts`** re-exports shared types from `@bun-win32/core` (`export type { … } from …`); defines only types this DLL actually uses; ordering is imports → core re-exports → constants → enums → aliases, interleaved in one alphabetized block.

---

## TypeScript Conventions

- Separate type-only imports with `import type`.
- Prefer `#privateField` syntax over the `private` keyword.
- Use explicit `void` when deliberately discarding a return value; honor `noImplicitOverride` with `override`.
- Never weaken type safety to make code compile. Prefer `unknown` + type guards over `any`.

---

## Comments & Documentation

- **`/** @inheritdoc */`** on the `Symbols` block — nothing more verbose.
- **No section comment blocks or decorative headers** (`// ====`, `// ----`, `// Scalar types`). Keep comments terse and value-add: non-obvious struct layouts, buffer offsets, bit manipulation only. Do not restate code, and do not add comments to lines you did not change.
- **Do not create new top-level docs** (`README`, `CHANGELOG`, `PROGRESS.md`, `TODO.md`) unless explicitly requested. Per-package `README.md` and `AI.md` follow the templates; keep `AI.md` generic (substitute only class/DLL/package/path names).

---

## Examples / Demos

Each binding package ships **at least two** examples in `example/`: one **creative** (a "you can do that with just FFI?" demo) and one **professional** (an exhaustive, richly formatted diagnostic). The `all` package is the showcase: GPU, audio, terminal, and hardware demos.

- **JSDoc header is mandatory** on every example: Title, Description, **APIs demonstrated** (bulleted, with a short parenthetical each, grouped by package when cross-package), and a `Run: bun run example/{file}.ts` line.
- **`Preload` the APIs at the top.** Clear variable names, no abbreviations, no comment blocks. Check return values where failure would produce confusing output. Cross-package imports are encouraged where natural.
- **Console rendering uses ANSI escape codes** via `console.log` / `process.stdout` — **not `WriteConsoleW`**, which fails silently in ConPTY (Windows Terminal, VS Code) and pipes. Kernel32 console-setup APIs (`GetStdHandle`, `Get`/`SetConsoleMode` for VT, `SetConsoleCursorInfo`, `SetConsoleTitleW`) are fine.
- **Verify visual demos visually, not numerically.** A world-space or pixel-count check is easily fooled. Capture the rendered output (back-buffer / PNG) and look at it. Demos honor headless env vars — `DEMO_DURATION_MS` (self-exit), plus capture/validation hooks like `CAPTURE_PNG` / `BENCH` / `SELFSHOT` on the demos that support them.
- **Shared helpers** live in `packages/all/example/` with a `_` prefix: `_capture.ts` (DXGI desktop duplication), `_gpu.ts` (D3D11 COM-vtable invoker), `_gpu3d.ts` (depth buffer + mesh), `_audio.ts` (WinMM capture + XAudio2 output), `_snapshot.ts` (back-buffer → PNG), `_hud.ts` (GDI HUD composite). The `terminal` package is the dedicated TTY engine (`pixel`, `char`, `glyphs`, `png`, `input`, `loop`, `pacing`, …).
- **Tests live in-example** — `example/{name}.test.ts`, or the example *is* the test. Never a separate `test/` directory. Use `bun:test`; add no other test framework.
- **`package.json` scripts:** binding packages name examples `example:{name}`; the `all` showcase uses bare demo names (`event-horizon`, `blackhole`, …).

---

## Releasing

After bumping versions, **regenerate the lockfile first**. Plain `bun install` does **not** rewrite `bun.lock`'s workspace version records, so `bun publish` would pin the **old** exact versions into dependents (`@bun-win32/all`, …) that reference them via `workspace:*`.

```bash
rm bun.lock && bun install                                          # refresh workspace version records
bun run scripts/preflight.ts                                        # gate: fail if lockfile is stale
bun run scripts/nullcheck.ts --all && bun run scripts/audit.ts --all # type gates: zero problems
# publish each package on ONE OTP — scoped @bun-win32 is private-by-default:
cd packages/{name} && bun publish --access public --otp <code>
```

- **Always `bun publish`, never `npm publish`** — only Bun resolves the `workspace:*` references.
- **Always `--access public`** — `@bun-win32` is private-by-default on npm. Pass the flag on every publish; most packages have no `publishConfig`, so do not rely on it.
- **Batch the whole release on a single OTP.** Loop every package's `bun publish` on one code; never prompt per package.

---

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description` — lowercase, imperative, no trailing period. `type` ∈ `feat fix refactor docs test chore perf ci build style`. Real examples from this repo:

```
feat(scripts): add nullcheck (SAL nullability/type auditor) + preflight (lockfile gate)
fix(types): add missing nullable unions + correct param types across 25 packages
chore(release): terminal 1.1.1 — pull in kernel32 1.0.25 (nullable/param-type fixes)
```

Commit or push only when asked.

---

## Repository Hygiene — Never Commit These

`.gitignore` excludes disk-only working files; do not `git add` them or rely on them being present for other agents:

- **`.scratch/`** (root and per-package), **`DISCORD_POST.md`**, **`MISSING_APIS.md`**, **`TODO.md`**, `.claude/`, `node_modules`.
- **Screenshots** under `packages/all/screenshots/` are ignored except the curated hero shots whitelisted with `!`. To commit a new showcase capture, add a matching `!packages/all/screenshots/{name}.png` line.
- **`AGENTS.*.md`** (local variants) is ignored; this `AGENTS.md` and the root `CLAUDE.md` are tracked.

---

## Things to Never Do

- Add helpers/utilities, abstractions, or polyfills that were not requested.
- Reformat broadly, or change formatting on lines you are not already editing.
- Use `as any` / `as unknown as T` or any cast that bypasses the type system — fix the types instead.
- Use shortform variable names (the sole exception is preserved Win32 parameter names in bindings).
- Mutate shipped bindings to silence an audit hint; `audit.ts`/`nullcheck.ts` emit accepted-convention notices (`SPURIOUS`, SDK suggestions) that are usually correct per MSDN — verify, don't blindly "fix."
- Add licenses, headers, new linters, or new tooling.
- Change public API (export shape, signatures, type contracts) without explicit request.
- Leave the codebase in a broken or unverified state.
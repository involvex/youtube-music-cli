# AI Guide for @bun-win32/all

How to use this package, not what individual Win32 APIs do.

## Purpose

`@bun-win32/all` is a thin index — it re-exports the default class from every `@bun-win32/*` package, plus the shared `Win32` namespace from `@bun-win32/core`. There is no implementation here; it exists so that one install pulls the entire surface area.

## Usage

```ts
import { D2D1, Kernel32, User32, Xaudio2_9 } from '@bun-win32/all';

Kernel32.GetCurrentProcessId();
User32.GetForegroundWindow();
```

Each named binding is the default-exported class from its individual package. Methods bind lazily on first call. Preload eagerly via the class's `.Preload()` method (see each package's `AI.md`).

## When To Import From The Specific Package Instead

Types, enums, and packed-struct helpers are NOT re-exported through `@bun-win32/all` because many would collide across packages (every DLL defines `HRESULT`, `HANDLE`, `Pointer` aliases, etc.). Import them from the specific package:

```ts
import { User32 } from '@bun-win32/all';
import { WindowStyles, ShowWindowCommand, ExtendedWindowStyles } from '@bun-win32/user32';
```

Pick whichever style fits the file:

- Many DLLs, just the classes → `@bun-win32/all`.
- One DLL, classes + types + enums + struct helpers → `@bun-win32/<dll>`.

Mixing both is fine and common in showcase examples.

## What's Re-exported

The full list is in `index.ts`. Each row is a single `export { default as ClassName } from '@bun-win32/<dll>'`. Class names are imported as-is — they follow each package's own casing (`D2D1`, `GDI32`, `User32`, `Xaudio2_9`, `WinSCard`, etc.).

`Win32` from `@bun-win32/core` is also re-exported (`export { Win32 } from '@bun-win32/core'`).

## Calling Convention

Identical to every other `@bun-win32/*` package — see [`@bun-win32/core`](../core/AI.md) for the FFI rules:

- Handles (`HANDLE`, `HWND`, `HDC`, …) are `bigint`.
- `DWORD`/`UINT`/`BOOL` are `number`. Win32 `BOOL` is `0` or non-zero — not JS `boolean`.
- Pointer parameters take `buffer.ptr` from a caller-allocated `Buffer`.
- Wide strings: `Buffer.from(str + '\0', 'utf16le')`. Reading back: `buf.toString('utf16le').replace(/\0.*$/, '')`.
- Each method maps 1:1 to a DLL export. No marshaling wrapper.

## Where To Look

| Need | Read |
| --- | --- |
| Cross-package showcase examples | `example/*.ts` |
| Per-DLL method signatures, MS Docs links | `node_modules/@bun-win32/<dll>/structs/<Class>.ts` |
| Per-DLL types, enums, constants | `node_modules/@bun-win32/<dll>/types/<Class>.ts` |
| FFI rules, base classes, runtime extensions | `node_modules/@bun-win32/core/AI.md` |
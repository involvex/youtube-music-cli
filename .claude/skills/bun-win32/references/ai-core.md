# AI Guide for @bun-win32/core

This file documents the package contract of `@bun-win32/core`.

## What This Package Is

- `@bun-win32/core` is the shared foundation used by the DLL binding packages.
- It does not bind a specific Windows DLL by itself.
- It exports the `Win32` base class, shared Win32 type aliases, and a runtime extension that installs `.ptr` on supported binary view types.

## How To Read It

- `index.ts` imports `runtime/extensions` for its side effect, re-exports everything from `types/Win32.ts`, and exports `Win32` from `structs/Win32.ts`.
- `runtime/extensions.ts` installs the `.ptr` getter on supported prototypes.
- `structs/Win32.ts` contains the shared lazy-binding implementation used by the DLL packages.
- `types/Win32.ts` contains the shared aliases used across packages, including pointer aliases, handle aliases, scalar aliases, and `NULL`.
- `README.md` contains the human-facing overview and basic examples.

## Runtime Behavior

- Importing `@bun-win32/core` installs `.ptr` on supported binary view prototypes as a side effect.
- Supported types include `ArrayBuffer`, `SharedArrayBuffer`, `Buffer`, `DataView`, and typed arrays.
- The `.ptr` getter returns a Bun FFI `Pointer` for the underlying memory.
- `Win32` provides the shared `Load()` and `Preload()` behavior used by the DLL packages.
- DLL packages subclass `Win32`, provide a DLL name and symbol table, then expose static methods that call `Load()`.

## Types

- `types/Win32.ts` is the shared type surface for the project.
- It defines scalar aliases such as `DWORD`, `BOOL`, `INT`, and `UINT`.
- It defines pointer aliases such as `LPVOID`, `LPCWSTR`, `LPDWORD`, and `PHANDLE`.
- It defines handle and pointer-sized aliases such as `HANDLE`, `HMODULE`, `HWND`, `SIZE_T`, and `ULONG_PTR`.
- It defines `NULL` as `null` and `VOID` as `void`.

## Errors And Lifetime

- `@bun-win32/core` does not change native error semantics.
- `Win32.Load()` and `Win32.Preload()` only handle symbol binding and memoization.
- Resource ownership and cleanup remain the responsibility of the calling DLL package and the underlying API.
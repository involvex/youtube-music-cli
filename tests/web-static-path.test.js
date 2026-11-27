import { afterEach, expect, test } from "bun:test";

const __fileTeardowns = [];
afterEach(() => {
  while (__fileTeardowns.length) {
    const fn = __fileTeardowns.pop();
    fn();
  }
});

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { resolveWebDistDir } from "../source/services/web/static-file.service.ts";

function makeTempRoot() {
  return mkdtempSync(join(tmpdir(), "ymc-web-static-"));
}

test("resolveWebDistDir prefers bundled CLI sibling dist/web", () => {
  const root = makeTempRoot();
  __fileTeardowns.push(() => rmSync(root, { recursive: true, force: true }));

  const sourceDir = join(root, "dist", "source");
  const webDir = join(root, "dist", "web");
  mkdirSync(sourceDir, { recursive: true });
  mkdirSync(webDir, { recursive: true });
  writeFileSync(join(webDir, "index.html"), "<html></html>");

  const moduleUrl = pathToFileURL(join(sourceDir, "cli.js")).href;
  const resolved = resolveWebDistDir(moduleUrl, root, join(root, "fake-exe"));

  expect(resolved).toBe(webDir);
});

test("resolveWebDistDir finds projectRoot/dist/web from source/services/web", () => {
  const root = makeTempRoot();
  __fileTeardowns.push(() => rmSync(root, { recursive: true, force: true }));

  const serviceDir = join(root, "source", "services", "web");
  const webDir = join(root, "dist", "web");
  mkdirSync(serviceDir, { recursive: true });
  mkdirSync(webDir, { recursive: true });
  writeFileSync(join(webDir, "index.html"), "<html></html>");

  const moduleUrl = pathToFileURL(
    join(serviceDir, "static-file.service.ts"),
  ).href;
  const resolved = resolveWebDistDir(
    moduleUrl,
    join(root, "other"),
    join(root, "fake-exe"),
  );

  expect(resolved).toBe(webDir);
});

test("resolveWebDistDir falls back to cwd dist/web", () => {
  const root = makeTempRoot();
  __fileTeardowns.push(() => rmSync(root, { recursive: true, force: true }));

  const moduleDir = join(root, "somewhere", "else");
  const webDir = join(root, "dist", "web");
  mkdirSync(moduleDir, { recursive: true });
  mkdirSync(webDir, { recursive: true });
  writeFileSync(join(webDir, "index.html"), "<html></html>");

  const moduleUrl = pathToFileURL(join(moduleDir, "cli.js")).href;
  const resolved = resolveWebDistDir(
    moduleUrl,
    root,
    join(root, "no-web", "exe"),
  );

  expect(resolved).toBe(webDir);
});

test("resolveWebDistDir uses exe sibling web when present", () => {
  const root = makeTempRoot();
  __fileTeardowns.push(() => rmSync(root, { recursive: true, force: true }));

  const moduleDir = join(root, "somewhere");
  const exeDir = join(root, "bin");
  const webDir = join(exeDir, "web");
  mkdirSync(moduleDir, { recursive: true });
  mkdirSync(webDir, { recursive: true });
  writeFileSync(join(webDir, "index.html"), "<html></html>");

  const moduleUrl = pathToFileURL(join(moduleDir, "cli.js")).href;
  const resolved = resolveWebDistDir(
    moduleUrl,
    join(root, "empty-cwd"),
    join(exeDir, "ymc.exe"),
  );

  expect(resolved).toBe(webDir);
});

test("resolveWebDistDir returns first candidate when nothing is built", () => {
  const root = makeTempRoot();
  __fileTeardowns.push(() => rmSync(root, { recursive: true, force: true }));

  const sourceDir = join(root, "dist", "source");
  mkdirSync(sourceDir, { recursive: true });

  const moduleUrl = pathToFileURL(join(sourceDir, "cli.js")).href;
  const resolved = resolveWebDistDir(moduleUrl, root, join(root, "fake-exe"));

  expect(resolved).toBe(join(root, "dist", "web"));
});

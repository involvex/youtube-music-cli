import { expect, test } from "bun:test";

test("buildInstallPlan uses scoop on Windows when available", async () => {
  const { buildInstallPlan } =
    await import("../source/services/player/dependency-check.service.ts");

  const plan = buildInstallPlan("win32", ["scoop", "choco"], ["mpv", "yt-dlp"]);
  expect(plan).toEqual({
    command: "scoop",
    args: ["install", "mpv", "yt-dlp"],
  });
});

test("buildInstallPlan uses sudo apt-get on Linux", async () => {
  const { buildInstallPlan } =
    await import("../source/services/player/dependency-check.service.ts");

  const plan = buildInstallPlan("linux", ["apt-get"], ["mpv", "yt-dlp"]);
  expect(plan).toEqual({
    command: "sudo",
    args: ["apt-get", "install", "-y", "mpv", "yt-dlp"],
  });
});

test("buildInstallPlan returns null with no known package manager", async () => {
  const { buildInstallPlan } =
    await import("../source/services/player/dependency-check.service.ts");

  const plan = buildInstallPlan("linux", [], ["mpv"]);
  expect(plan).toBe(null);
});

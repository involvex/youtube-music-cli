import { cpSync, existsSync } from "node:fs";
import path from "node:path";

import pkg from "../package.json" with { type: "json" };

declare const Bun: {
  build: (options: {
    entrypoints: string[];
    compile: {
      target: string;
      outfile: string;
      footer?: string;
      windowsTitle?: string;
      windowsPublisher?: string;
      windowsIcon?: string;
      windowsCopyright?: string;
      windowsDescription?: string;
    };
    footer?: string;
    minify?: boolean;
    sourcemap?: string | boolean;
    bytecode?: boolean;
    define?: Record<string, string>;
  }) => Promise<{
    success: boolean;
    logs?: unknown;
    outputs: Array<{ path: string }>;
  }>;
};

const rootDir = process.cwd();
const isWindows = process.platform === "win32";
const outputName = isWindows ? "youtube-music-cli.exe" : "youtube-music-cli";
const outfile = path.join(rootDir, "dist", outputName);
const banner = "//Copyright (c) 2026 involvex";
const iconPath = path.join(rootDir, "assets", "icon.ico");

const platformTarget = isWindows
  ? "bun-windows-x64"
  : process.platform === "darwin"
    ? "bun-darwin-x64"
    : "bun-linux-x64";

const compileOptions = isWindows
  ? {
      target: platformTarget,
      outfile,
      footer: banner,
      windowsTitle: "YouTube Music CLI",
      windowsPublisher: "involvex",
      windowsIcon: iconPath,
      windowsCopyright: "Copyright (c) 2026 involvex",
      windowsDescription: "A Commandline music player for youtube-music",
    }
  : {
      target: platformTarget,
      outfile,
    };

const buildOptions = {
  entrypoints: [path.join(rootDir, "source", "cli.tsx")],
  compile: compileOptions,
  footer: banner,
  minify: true,
  sourcemap: "linked",
  bytecode: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    VERSION: JSON.stringify(pkg.version ?? "0.0.0"),
  },
};

const result = await Bun.build(buildOptions);

if (!result.success) {
  console.error("Build failed", result.logs ?? result);
  process.exit(1);
}

console.log(
  "Build succeeded:",
  result.outputs.map(output => output.path),
);

const webDist = path.join(rootDir, "dist", "web");
const webBesideBinary = path.join(path.dirname(outfile), "web");
if (existsSync(path.join(webDist, "index.html"))) {
  // The compiled binary and dist/web share the same directory, so the
  // "beside binary" location is already correct; copying a directory onto
  // itself throws ERR_FS_CP_EINVAL.
  if (path.resolve(webDist) === path.resolve(webBesideBinary)) {
    console.log("Web UI already beside binary at", webBesideBinary);
  } else {
    cpSync(webDist, webBesideBinary, { recursive: true });
    console.log("Copied web UI to", webBesideBinary);
  }
} else {
  console.warn(
    "Web UI not found at dist/web — run bun run build:web before compile for --web support",
  );
}

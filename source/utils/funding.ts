import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parse } from "yaml";

export function getSponsorLine(): string {
  const root = process.cwd();
  const fundingPath = join(root, ".github", "FUNDING.yml");
  const githubUrl = "https://github.com/sponsors/involvex";

  try {
    const content = readFileSync(fundingPath, "utf8");
    const doc = parse(content) as Record<string, unknown>;

    const github = doc.github;
    if (Array.isArray(github) && github.length > 0) {
      const sponsorUrl = `https://github.com/sponsors/${github[0]}`;
      return `Sponsor: ${sponsorUrl}`;
    }
  } catch {
    // Fall through to default
  }

  return `Sponsor: ${githubUrl}`;
}

export function getGitHubSponsorUrl(): string {
  const root = process.cwd();
  const fundingPath = join(root, ".github", "FUNDING.yml");

  try {
    const content = readFileSync(fundingPath, "utf8");
    const doc = parse(content) as Record<string, unknown>;

    const github = doc.github;
    if (Array.isArray(github) && github.length > 0) {
      return `https://github.com/sponsors/${github[0]}`;
    }
  } catch {
    // Fall through to default
  }

  return "https://github.com/sponsors/involvex";
}

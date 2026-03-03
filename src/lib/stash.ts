/**
 * Stash — the place you keep your gear between hikes.
 *
 * Resolves paths to ~/.campsite/<repo>/ and manages the directory structure.
 * Lives outside git repos so it survives branch switches, worktrees, and fresh clones.
 *
 * Stash root is configurable via ~/.campsite/config.json:
 *   { "stashRoot": "~/vault" }
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { getStashRoot } from "./config.ts";

const STASH_DIRS = [
  "journal",
  "working-context",
  "quests",
  "plans",
  "outputs",
] as const;

/** Get the repo name from git, or fall back to directory name */
export function getRepoName(cwd: string = process.cwd()): string {
  try {
    const toplevel = execSync("git rev-parse --show-toplevel", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return basename(toplevel);
  } catch {
    return basename(cwd);
  }
}

/** Get current git branch */
export function getBranch(cwd: string = process.cwd()): string {
  try {
    return execSync("git branch --show-current", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "unknown";
  }
}

/** Get the stash directory for a repo */
export function stashDir(repo?: string): string {
  const name = repo ?? getRepoName();
  return join(getStashRoot(), name);
}

/** Get a specific subdirectory in the stash */
export function stashPath(
  subdir: (typeof STASH_DIRS)[number] | string,
  repo?: string
): string {
  return join(stashDir(repo), subdir);
}

/** Check if stash exists for the current repo */
export function stashExists(repo?: string): boolean {
  return existsSync(stashDir(repo));
}

/** Create the full stash structure for a repo */
export function pitchTent(repo?: string): { dir: string; created: string[] } {
  const dir = stashDir(repo);
  const created: string[] = [];

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    created.push(dir);
  }

  for (const sub of STASH_DIRS) {
    const subPath = join(dir, sub);
    if (!existsSync(subPath)) {
      mkdirSync(subPath, { recursive: true });
      created.push(subPath);
    }
  }

  // Create backlog.md if it doesn't exist
  const backlogPath = join(dir, "backlog.md");
  if (!existsSync(backlogPath)) {
    Bun.write(backlogPath, "# Trail Markers\n\n");
    created.push(backlogPath);
  }

  return { dir, created };
}

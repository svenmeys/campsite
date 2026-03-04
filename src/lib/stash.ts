import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { getStashRoot } from "./config.ts";

const STASH_DIRS = ["journal", "working-context", "plans", "outputs"];

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

export function stashDir(repo?: string): string {
  return join(getStashRoot(), repo ?? getRepoName());
}

export function stashPath(subdir: string, repo?: string): string {
  return join(stashDir(repo), subdir);
}

/** Ensure stash dirs exist. Silent, idempotent. */
export function ensureStash(repo?: string): string {
  const dir = stashDir(repo);
  for (const sub of STASH_DIRS) {
    mkdirSync(join(dir, sub), { recursive: true });
  }
  // backlog.md is created on first sq, no need to seed it
  return dir;
}

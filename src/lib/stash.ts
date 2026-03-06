import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { getStashRoot } from "./config.ts";

const STASH_DIRS = ["journal", "working-context", "plans", "outputs"];
const REPO_META = ".repo.json";

interface RepoMeta {
  normalizedRemote: string;
  remote: string;
  repoName: string;
}

function gitOutput(command: string, cwd: string): string | undefined {
  try {
    const value = execSync(command, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export function getRepoName(cwd: string = process.cwd()): string {
  return basename(getRepoRoot(cwd) ?? cwd);
}

export function getBranch(cwd: string = process.cwd()): string {
  return gitOutput("git branch --show-current", cwd) ?? "unknown";
}

function getRepoRoot(cwd: string): string | undefined {
  return gitOutput("git rev-parse --show-toplevel", cwd);
}

function getRemoteUrl(cwd: string): string | undefined {
  return gitOutput("git config --get remote.origin.url", cwd);
}

function normalizeRemote(url: string): string {
  const trimmed = url.trim().replace(/\.git$/, "");
  const sshMatch = trimmed.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`.toLowerCase();
  }

  try {
    const parsed = new URL(trimmed);
    return `${parsed.hostname}${parsed.pathname}`.replace(/^\/+/, "").toLowerCase();
  } catch {
    return trimmed.replace(/^ssh:\/\//, "").replace(/^\/+/, "").toLowerCase();
  }
}

function repoIdFromRemote(normalizedRemote: string): string {
  return normalizedRemote
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function repoMetaPath(dir: string): string {
  return join(dir, REPO_META);
}

function readRepoMeta(dir: string): RepoMeta | undefined {
  const path = repoMetaPath(dir);
  if (!existsSync(path)) return undefined;

  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as Partial<RepoMeta>;
    if (!raw.normalizedRemote || !raw.remote || !raw.repoName) return undefined;
    return {
      normalizedRemote: raw.normalizedRemote,
      remote: raw.remote,
      repoName: raw.repoName,
    };
  } catch {
    return undefined;
  }
}

function findRepoIdByRemote(stashRoot: string, normalizedRemote: string): string | undefined {
  if (!existsSync(stashRoot)) return undefined;

  for (const entry of readdirSync(stashRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const meta = readRepoMeta(join(stashRoot, entry.name));
    if (meta?.normalizedRemote === normalizedRemote) return entry.name;
  }

  return undefined;
}

function writeRepoMeta(dir: string, cwd: string): void {
  const remote = getRemoteUrl(cwd);
  if (!remote) return;

  const meta: RepoMeta = {
    normalizedRemote: normalizeRemote(remote),
    remote,
    repoName: getRepoName(cwd),
  };
  writeFileSync(repoMetaPath(dir), JSON.stringify(meta, null, 2));
}

export function getRepoId(cwd: string = process.cwd()): string {
  const remote = getRemoteUrl(cwd);
  if (!remote) return getRepoName(cwd);

  const stashRoot = getStashRoot();
  const normalizedRemote = normalizeRemote(remote);
  const existing = findRepoIdByRemote(stashRoot, normalizedRemote);
  if (existing) return existing;

  const legacy = getRepoName(cwd);
  if (existsSync(join(stashRoot, legacy))) return legacy;

  return repoIdFromRemote(normalizedRemote);
}

function resolveRepoArg(repo: string, cwd: string): string {
  return repo === getRepoName(cwd) ? getRepoId(cwd) : repo;
}

export function stashDir(repo?: string, cwd: string = process.cwd()): string {
  const repoId = repo ? resolveRepoArg(repo, cwd) : getRepoId(cwd);
  return join(getStashRoot(), repoId);
}

export function stashPath(subdir: string, repo?: string, cwd: string = process.cwd()): string {
  return join(stashDir(repo, cwd), subdir);
}

/** Ensure stash dirs exist. Silent, idempotent. */
export function ensureStash(repo?: string, cwd: string = process.cwd()): string {
  const dir = stashDir(repo, cwd);
  for (const sub of STASH_DIRS) {
    mkdirSync(join(dir, sub), { recursive: true });
  }
  writeRepoMeta(dir, cwd);
  // backlog.md is created on first sq, no need to seed it
  return dir;
}

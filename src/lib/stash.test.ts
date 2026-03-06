import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getRepoId, stashDir, stashPath, ensureStash } from "./stash.ts";

function createGitRepo(path: string, remote: string): void {
  mkdirSync(path, { recursive: true });
  execSync("git init", { cwd: path, stdio: "ignore" });
  execSync(`git remote add origin ${remote}`, { cwd: path, stdio: "ignore" });
}

describe("stash functions", () => {
  let testRoot: string;
  const origEnv = process.env.CAMPSITE_STASH_ROOT;

  beforeEach(() => {
    testRoot = mkdtempSync(join(tmpdir(), "campsite-test-"));
    process.env.CAMPSITE_STASH_ROOT = testRoot;
  });

  afterEach(() => {
    if (origEnv === undefined) delete process.env.CAMPSITE_STASH_ROOT;
    else process.env.CAMPSITE_STASH_ROOT = origEnv;
    rmSync(testRoot, { recursive: true, force: true });
  });

  describe("stashDir", () => {
    it("returns stash root joined with repo name", () => {
      expect(stashDir("my-repo")).toBe(join(testRoot, "my-repo"));
    });

    it("uses a stable repo id derived from git remote", () => {
      const repo = join(testRoot, "workspace", "alpha");
      createGitRepo(repo, "git@github.com:acme/platform.git");
      expect(stashDir(undefined, repo)).toBe(join(testRoot, "github-com-acme-platform"));
    });

    it("reuses a legacy stash dir once it has repo metadata", () => {
      const legacyRepo = join(testRoot, "workspace", "legacy-name");
      const freshClone = join(testRoot, "workspace", "fresh-clone");
      createGitRepo(legacyRepo, "git@github.com:acme/platform.git");
      createGitRepo(freshClone, "https://github.com/acme/platform.git");
      mkdirSync(join(testRoot, "legacy-name"), { recursive: true });

      const legacyDir = ensureStash(undefined, legacyRepo);
      const meta = JSON.parse(readFileSync(join(legacyDir, ".repo.json"), "utf-8")) as {
        normalizedRemote: string;
      };

      expect(legacyDir).toBe(join(testRoot, "legacy-name"));
      expect(meta.normalizedRemote).toBe("github.com/acme/platform");
      expect(getRepoId(freshClone)).toBe("legacy-name");
    });
  });

  describe("stashPath", () => {
    it("returns subdir within repo stash", () => {
      expect(stashPath("journal", "my-repo")).toBe(
        join(testRoot, "my-repo", "journal"),
      );
    });
  });

  describe("ensureStash", () => {
    it("creates all stash subdirectories", () => {
      ensureStash("my-repo");

      for (const sub of ["journal", "working-context", "plans", "outputs"]) {
        expect(existsSync(join(testRoot, "my-repo", sub))).toBe(true);
      }
    });

    it("does not create backlog.md (created on first sq)", () => {
      ensureStash("my-repo");
      const backlog = join(testRoot, "my-repo", "backlog.md");
      expect(existsSync(backlog)).toBe(false);
    });

    it("is idempotent", () => {
      ensureStash("my-repo");
      ensureStash("my-repo");
      expect(existsSync(join(testRoot, "my-repo", "journal"))).toBe(true);
    });

    it("returns the stash directory path", () => {
      const result = ensureStash("my-repo");
      expect(result).toBe(join(testRoot, "my-repo"));
    });
  });
});

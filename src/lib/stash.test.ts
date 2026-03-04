import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stashDir, stashPath, ensureStash } from "./stash.ts";

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

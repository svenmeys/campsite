import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { today, timeNow, sessionFilename, nextSession } from "./session.ts";

describe("today", () => {
  it("returns YYYY-MM-DD format", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("timeNow", () => {
  it("returns HH:MM format", () => {
    expect(timeNow()).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("sessionFilename", () => {
  it("builds filename with session number", () => {
    expect(sessionFilename(1, "2026-03-03")).toBe("2026-03-03-S1.md");
  });

  it("uses today when no date given", () => {
    expect(sessionFilename(3)).toBe(`${today()}-S3.md`);
  });
});

describe("nextSession", () => {
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

  it("returns 1 when dir does not exist", () => {
    expect(nextSession("journal", "test-repo")).toBe(1);
  });

  it("returns 1 when dir is empty", () => {
    mkdirSync(join(testRoot, "test-repo", "journal"), { recursive: true });
    expect(nextSession("journal", "test-repo")).toBe(1);
  });

  it("increments based on existing files for today", () => {
    const dir = join(testRoot, "test-repo", "journal");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${today()}-S1.md`), "log 1");
    writeFileSync(join(dir, `${today()}-S2.md`), "log 2");
    expect(nextSession("journal", "test-repo")).toBe(3);
  });

  it("ignores files from other dates", () => {
    const dir = join(testRoot, "test-repo", "journal");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "1999-01-01-S1.md"), "old");
    writeFileSync(join(dir, `${today()}-S1.md`), "today");
    expect(nextSession("journal", "test-repo")).toBe(2);
  });

  it("uses the highest session number when there are gaps", () => {
    const dir = join(testRoot, "test-repo", "journal");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${today()}-S1.md`), "log 1");
    writeFileSync(join(dir, `${today()}-S3.md`), "log 3");
    expect(nextSession("journal", "test-repo")).toBe(4);
  });
});

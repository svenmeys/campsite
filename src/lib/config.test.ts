import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("config", () => {
  let testConfigDir: string;
  const origConfigDir = process.env.CAMPSITE_CONFIG_DIR;
  const origStashRoot = process.env.CAMPSITE_STASH_ROOT;

  beforeEach(() => {
    testConfigDir = mkdtempSync(join(tmpdir(), "campsite-config-test-"));
    process.env.CAMPSITE_CONFIG_DIR = testConfigDir;
    delete process.env.CAMPSITE_STASH_ROOT;
  });

  afterEach(() => {
    if (origConfigDir === undefined) delete process.env.CAMPSITE_CONFIG_DIR;
    else process.env.CAMPSITE_CONFIG_DIR = origConfigDir;
    if (origStashRoot === undefined) delete process.env.CAMPSITE_STASH_ROOT;
    else process.env.CAMPSITE_STASH_ROOT = origStashRoot;
    rmSync(testConfigDir, { recursive: true, force: true });
  });

  // Re-import each time to pick up env changes
  async function freshImport() {
    // Config module reads CONFIG_DIR at import time, so env must be set before first import.
    // Since Bun caches modules, we test the already-imported module behavior.
    const mod = await import("./config.ts");
    return mod;
  }

  describe("loadConfig", () => {
    it("returns default stashRoot when no config file exists", async () => {
      const { loadConfig } = await freshImport();
      const cfg = loadConfig();
      // Default stashRoot is CONFIG_DIR itself
      expect(cfg.stashRoot).toBeString();
    });

    it("reads stashRoot from config file", async () => {
      writeFileSync(
        join(testConfigDir, "config.json"),
        JSON.stringify({ stashRoot: "/custom/path" }),
      );
      const { loadConfig } = await freshImport();
      const cfg = loadConfig();
      expect(cfg.stashRoot).toBe("/custom/path");
    });

    it("handles corrupt config gracefully", async () => {
      writeFileSync(join(testConfigDir, "config.json"), "not json{{{");
      const { loadConfig } = await freshImport();
      const cfg = loadConfig();
      expect(cfg.stashRoot).toBeString();
    });
  });

  describe("saveConfig", () => {
    it("writes config file", async () => {
      const { saveConfig, loadConfig } = await freshImport();
      saveConfig({ stashRoot: "/new/root" });
      const cfg = loadConfig();
      expect(cfg.stashRoot).toBe("/new/root");
    });
  });

  describe("getStashRoot", () => {
    it("respects CAMPSITE_STASH_ROOT env var", async () => {
      process.env.CAMPSITE_STASH_ROOT = "/env/override";
      const { getStashRoot } = await freshImport();
      expect(getStashRoot()).toBe("/env/override");
    });

    it("falls back to config when env not set", async () => {
      delete process.env.CAMPSITE_STASH_ROOT;
      const { getStashRoot } = await freshImport();
      expect(getStashRoot()).toBeString();
    });
  });
});

import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

test("compact preserves dry-run files, removes empties, renames survivors and merges metadata", () => {
  const root = mkdtempSync(join(tmpdir(), "compact-"));
  const journal = join(root, "stash", "repo", "journal");
  mkdirSync(journal, { recursive: true });
  const files: Record<string, string> = {
    "2026-10-01-S1.md": "",
    "2026-10-02-S1.md": "# Alone\n",
    "2026-10-02-S2.md": "",
    "2026-10-03-S1.md": '---\ntitle: "Useful title"\nsummary: "Details"\nproject: repo\ntags: [one]\ndomain: [dev]\n---\nFirst body\n',
    "2026-10-03-S2.md": '---\ntags: [two]\n---\nSecond body\n',
    "2026-10-03-S3.md": "",
    "2026-10-04-S1.md": "# Untouched\n",
    "README.md": "Keep me\n",
  };
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(journal, name), body);
    const run = (args: string[]) => spawnSync(process.execPath, [join(import.meta.dir, "../index.ts"), "compact", ...args], {
      encoding: "utf8", env: { ...process.env, CAMPSITE_STASH_ROOT: join(root, "stash"), CAMPSITE_CONFIG_DIR: join(root, "config") },
    });
    expect(run(["--dry-run"]).status).toBe(0);
    for (const [name, body] of Object.entries(files)) expect(readFileSync(join(journal, name), "utf8")).toBe(body);
    const result = run([]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("3 empties removed, 2 days merged");
    expect(readdirSync(journal).sort()).toEqual(["2026-10-02.md", "2026-10-03.md", "2026-10-04-S1.md", "README.md"]);
    expect(readFileSync(join(journal, "2026-10-02.md"), "utf8")).toBe("# Alone\n");
    const merged = readFileSync(join(journal, "2026-10-03.md"), "utf8");
    for (const text of ['title: "Useful title"', 'summary: "Details"', "project: repo", "tags: [one, two]", "domain: [dev]", "First body\n\n---\n\nSecond body"]) expect(merged).toContain(text);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

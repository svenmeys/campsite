import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

let root: string;
let backlog: string;
const old = "---\nnext_id: 90\n---\n4 Old task [main] 2026-10-01\n71 [idea] Another task [main] 2026-10-02\n";
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "sq-test-"));
  mkdirSync(join(root, "repo"));
  spawnSync("git", ["init"], { cwd: join(root, "repo") });
  mkdirSync(join(root, "stash", "repo"), { recursive: true });
  backlog = join(root, "stash", "repo", "backlog.md");
  writeFileSync(backlog, old);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
function run(args: string[], input = "") {
  return spawnSync(process.execPath, [join(import.meta.dir, "../index.ts"), "sq", ...args], {
    cwd: join(root, "repo"), encoding: "utf8", input,
    env: { ...process.env, CAMPSITE_STASH_ROOT: join(root, "stash"), CAMPSITE_CONFIG_DIR: join(root, "config") },
  });
}
const read = () => readFileSync(backlog, "utf8");
test("legacy lines round-trip unchanged and done preserves next_id", () => {
  expect(run(["list"]).stdout).toContain("71 [idea] Another task");
  expect(read()).toBe(old);
  expect(run(["group", "4", "--none"]).status).toBe(0);
  expect(read()).toBe(old);
  expect(run(["done", "4"]).status).toBe(0);
  expect(read()).toBe(old.replace("4 Old task [main] 2026-10-01\n", ""));
});
test("capture, list, filter, regroup, clear and remove grouped quest", () => {
  expect(run(["--group", "UI screens", "Fix the toolbar"]).status).toBe(0);
  expect(read()).toContain("90 [group:UI screens] Fix the toolbar");
  expect(read()).toContain("next_id: 91");
  const listed = run(["list"]).stdout;
  expect(listed).toContain("UI screens:");
  expect(listed.indexOf("UI screens:")).toBeLessThan(listed.indexOf("Ungrouped:"));
  expect(run(["list", "UI screens"]).stdout).not.toContain("Old task");
  expect(run(["list", "missing"]).stdout).toContain("No side quests.");
  expect(run(["group", "90", "Tools"]).status).toBe(0);
  expect(read()).toContain("90 [group:Tools] Fix the toolbar");
  expect(run(["group", "90", "--none"]).status).toBe(0);
  expect(read()).toContain("90 Fix the toolbar");
  expect(run(["group", "90", "Tools"]).status).toBe(0);
  expect(run(["done", "90"]).status).toBe(0);
  expect(read()).toBe(old.replace("next_id: 90", "next_id: 91"));
});
for (const args of [["help"], ["--help"], ["-h"], ["show"], ["show", "671"], ["lsit"], ["banana"], ["fix", "the", "bug"], ["done"], ["done", "4junk"], ["list", "x", "extra"], ["--group", "UI"], ["--group", "bad]", "Fix the bug"], ["group", "4", "bad\nname"], ["group", "4"], ["hello\nworld"]]) {
  test(`rejects ${JSON.stringify(args)} without writing`, () => {
    const result = run(args);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Usage:");
    expect(read()).toBe(old);
  });
}
test("deliberate multi-word capture and stdin plans still work", () => {
  expect(run(["help improve the docs"]).status).toBe(0);
  expect(read()).toContain("90 help improve the docs");
  expect(run([], "# A plan\nDo useful work").status).toBe(0);
  expect(read()).toContain("91 plans/");
});
test("legacy without front matter allocates above highest id", () => {
  writeFileSync(backlog, "7 Old task [main] 2026-10-01\n");
  expect(run(["Another real task"]).status).toBe(0);
  expect(read()).toContain("next_id: 9");
  expect(read()).toContain("7 Old task [main] 2026-10-01\n8 Another real task");
});
test("missing ids fail without modifying backlog", () => {
  expect(run(["group", "999", "UI"]).status).toBe(1);
  expect(run(["done", "999"]).status).toBe(1);
  expect(read()).toBe(old);
});
